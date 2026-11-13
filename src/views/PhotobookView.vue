<template>
  <div class="min-h-screen bg-ground print:bg-surface">
    <!-- Opties (niet geprint) -->
    <div class="print-hidden sticky top-0 z-[1100] border-b border-line bg-surface">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <RouterLink :to="`/trips/${route.params.id}`" class="btn btn-ghost btn-sm -ml-2"><Icon name="chevron-left" :size="16" /> {{ $t('photobook.backToTrip') }}</RouterLink>

        <fieldset class="flex items-center gap-1.5">
          <legend class="sr-only">{{ $t('photobook.format') }}</legend>
          <button
            v-for="f in FORMAT_KEYS"
            :key="f"
            type="button"
            class="chip-toggle"
            :class="format === f ? 'chip-toggle-active' : ''"
            :aria-pressed="format === f"
            @click="format = f"
          >{{ $t(`photobook.formats.${f}`) }}</button>
        </fieldset>

        <label class="flex items-center gap-2 text-sm font-semibold text-body">
          {{ $t('photobook.perPage') }}
          <select v-model.number="perPage" class="input h-9 w-auto py-0">
            <option v-for="n in PHOTOS_PER_PAGE" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-sm font-semibold text-body">
          <input v-model="includeText" type="checkbox" class="checkbox" />
          {{ $t('photobook.includeText') }}
        </label>

        <button v-if="trip" type="button" class="btn btn-dark btn-sm ml-auto" :disabled="preparing" @click="savePdf">
          <Icon name="download" :size="14" /> {{ preparing ? $t('photobook.preparing') : $t('photobook.savePdf') }}
        </button>
      </div>
      <p v-if="trip && !days.length && !loading" class="mx-auto max-w-5xl px-4 pb-2.5 text-xs text-muted">{{ $t('photobook.emptyHint') }}</p>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <p v-else-if="!trip" class="py-20 text-center text-sm text-muted">{{ $t('photobook.loadFailed') }}</p>

    <div v-else ref="bookRef" class="photobook px-4 py-6 print:p-0" :style="{ '--pb-ratio': `${formatInfo.widthMm} / ${formatInfo.heightMm}`, '--pb-max': `${Math.round(formatInfo.widthMm * 3.78)}px` }">
      <!-- Omslag -->
      <section class="pb-page relative text-white">
        <div class="absolute inset-0"><CoverImage :src="trip.coverImageUrl" :seed="trip.id" eager /></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div class="absolute inset-x-0 bottom-0 p-[6%]">
          <p v-if="trip.country" class="text-xs font-extrabold uppercase tracking-[0.18em] opacity-85">{{ trip.country }}</p>
          <h1 class="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-balance">{{ trip.title }}</h1>
          <p class="mt-2 text-sm font-semibold opacity-90">{{ formatDateRange(trip.startDate, trip.endDate) }}</p>
          <p v-if="crewNames" class="mt-1 text-sm opacity-80">{{ crewNames }}</p>
        </div>
      </section>

      <!-- Routekaart -->
      <section v-if="trip.stops.length" class="pb-page flex flex-col bg-surface text-ink">
        <header class="flex items-baseline justify-between gap-3 px-[4%] py-3">
          <h2 class="text-lg font-extrabold">{{ $t('photobook.mapTitle') }}</h2>
          <p class="text-xs font-semibold text-muted">{{ $t('photobook.stops', trip.stops.length) }}<template v-if="recap?.distanceMeters"> · {{ formatDistance(recap.distanceMeters) }}</template></p>
        </header>
        <div class="pb-map min-h-0 flex-1">
          <TripMap
            :key="format"
            ref="mapRef"
            :stops="trip.stops"
            :route-geometry="tripRoute?.source === 'osrm' ? tripRoute.geometry : null"
            :route-segments="tripRoute?.segments || null"
            :aria-label="$t('photobook.mapTitle')"
            height-class="h-full"
          />
        </div>
      </section>

      <!-- Per dag -->
      <template v-for="day in days" :key="day.date">
        <section v-for="(page, i) in day.pages" :key="`${day.date}-${i}`" class="pb-page flex flex-col bg-surface text-ink">
          <header class="flex items-baseline gap-2 px-[4%] pb-2 pt-3">
            <h2 class="text-lg font-extrabold">{{ $t('photobook.day', { n: day.dayNumber }) }}</h2>
            <p class="text-sm font-semibold text-muted">{{ formatFullDate(day.date) }}</p>
            <span v-if="day.mood" class="ml-auto text-sm font-semibold text-body">{{ moodEmoji(day.mood) }} {{ $t(`planning.journal.moods.${day.mood}`) }}</span>
          </header>

          <!-- Alleen tekst -->
          <div v-if="page.kind === 'text'" class="min-h-0 flex-1 overflow-hidden px-[4%] pb-[3%]" :class="landscape ? 'columns-2 gap-8' : ''">
            <article v-for="e in day.entries" :key="e.id" class="mb-4 break-inside-avoid-column">
              <h3 v-if="e.title" class="text-base font-extrabold">{{ e.title }}</h3>
              <p class="whitespace-pre-line text-[13px] leading-relaxed text-body">{{ e.text }}</p>
              <p class="mt-1 text-[11px] font-semibold text-muted">— {{ e.authorDisplayName }}</p>
            </article>
          </div>

          <!-- Foto's (met korte tekst ernaast of erboven) -->
          <div v-else class="flex min-h-0 flex-1 gap-[2%] px-[4%] pb-[3%]" :class="landscape ? 'flex-row' : 'flex-col'">
            <div v-if="page.withText" class="shrink-0 overflow-hidden" :class="landscape ? 'w-[32%]' : 'max-h-[35%]'">
              <article v-for="e in day.entries" :key="e.id" class="mb-3">
                <h3 v-if="e.title" class="text-base font-extrabold">{{ e.title }}</h3>
                <p class="whitespace-pre-line text-[13px] leading-relaxed text-body">{{ e.text }}</p>
              </article>
            </div>
            <div class="grid min-h-0 min-w-0 flex-1 gap-[6px]" :class="gridClass(page.photos.length)">
              <figure v-for="p in page.photos" :key="p.id" class="relative min-h-0 overflow-hidden rounded-lg bg-gray-100">
                <img :src="resolveMediaUrl(p.imageUrl)" :alt="p.caption || ''" class="h-full w-full object-cover" loading="eager" decoding="async" />
                <figcaption v-if="p.caption || p.stopName" class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-1.5 pt-5 text-[11px] font-semibold text-white">
                  {{ p.caption || p.stopName }}
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
      </template>

      <!-- Slotpagina -->
      <section class="pb-page flex flex-col justify-center bg-surface px-[8%] text-ink">
        <p class="eyebrow-accent">{{ $t('photobook.closingEyebrow') }}</p>
        <h2 class="mt-1 text-3xl font-extrabold tracking-tight">{{ trip.title }}</h2>
        <dl class="mt-6 grid gap-3" :class="landscape ? 'grid-cols-4' : 'grid-cols-2'">
          <div v-for="s in stats" :key="s.label" class="rounded-2xl border border-line p-4">
            <dd class="text-2xl font-extrabold tabular-nums">{{ s.value }}</dd>
            <dt class="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">{{ s.label }}</dt>
          </div>
        </dl>
        <p v-if="recap?.countries?.length" class="mt-5 text-sm font-semibold text-body">{{ $t('tripExtras.recap.countries', recap.countries.length) }}: {{ recap.countries.join(', ') }}</p>
        <p v-if="footprint" class="mt-2 flex items-start gap-2 text-sm font-semibold text-body"><Icon name="leaf" :size="16" class="mt-0.5 text-accent-700" /><span>{{ footprint }}</span></p>
        <p v-if="crewNames" class="mt-2 text-sm text-body">{{ crewNames }}</p>
        <p class="mt-8 text-xs text-muted">{{ $t('photobook.madeWith') }} · {{ origin }}/trips/{{ trip.id }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { publicWebOrigin } from '@/services/native'
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import TripMap from '@/components/trip/TripMap.vue'
import * as tripsApi from '@/api/tripsApi'
import * as tripExtrasApi from '@/api/tripExtrasApi'
import * as albumApi from '@/api/albumApi'
import { formatDateRange, formatFullDate } from '@/utils/date'
import { formatDistance } from '@/utils/format'
import { footprintSentence } from '@/utils/footprint'
import { moodEmoji } from '@/utils/journal'
import { resolveMediaUrl } from '@/utils/media'
import { PHOTOBOOK_FORMATS, PHOTOS_PER_PAGE, dayPages, groupPhotobookDays, pageCss, waitForImages, waitForTiles } from '@/utils/photobook'

const FORMAT_KEYS = Object.keys(PHOTOBOOK_FORMATS)

const { t } = useI18n()
const route = useRoute()
// Links/QR-codes naar buiten: in de native app de gehoste webapp i.p.v. https://localhost.
const origin = publicWebOrigin()

const trip = ref(null)
const recap = ref(null)
const photos = ref([])
const journal = ref([])
const tripRoute = ref(null)
const loading = ref(true)
const preparing = ref(false)
const bookRef = ref(null)
const mapRef = ref(null)

const format = ref('a4-landscape')
const perPage = ref(2)
const includeText = ref(true)

const formatInfo = computed(() => PHOTOBOOK_FORMATS[format.value])
const landscape = computed(() => formatInfo.value.orientation === 'landscape')

const days = computed(() => {
  if (!trip.value) return []
  return groupPhotobookDays(trip.value, photos.value, journal.value)
    .map((day) => ({ ...day, pages: dayPages(day, { perPage: perPage.value, includeText: includeText.value, orientation: formatInfo.value.orientation }) }))
    .filter((day) => day.pages.length)
})

const crewNames = computed(() => {
  const names = recap.value?.participants?.map((p) => p.displayName) || (trip.value ? [trip.value.displayName] : [])
  return names.filter(Boolean).join(' · ')
})

const stats = computed(() => {
  const r = recap.value
  if (!r) return []
  return [
    { value: r.days, label: t('tripExtras.recap.daysLabel', r.days) },
    { value: r.nights, label: t('tripExtras.recap.nightsLabel', r.nights) },
    { value: r.stopCount, label: t('tripExtras.recap.stopsLabel', r.stopCount) },
    { value: r.distanceMeters ? formatDistance(r.distanceMeters) : '—', label: t('tripExtras.recap.distanceLabel') },
  ]
})

const footprint = computed(() => (recap.value ? footprintSentence(t, recap.value.footprintKg, recap.value.footprintCarKg) : ''))

function gridClass(n) {
  if (n <= 1) return 'grid-cols-1 grid-rows-1'
  if (n === 2) return landscape.value ? 'grid-cols-2 grid-rows-1' : 'grid-cols-1 grid-rows-2'
  return 'grid-cols-2 grid-rows-2'
}

// Papierformaat voor de print-dialoog: een <style> in <head> die meewisselt met de keuze.
const pageStyle = document.createElement('style')
pageStyle.dataset.photobook = ''
document.head.appendChild(pageStyle)
watchEffect(() => { pageStyle.textContent = pageCss(format.value) })
onBeforeUnmount(() => pageStyle.remove())

/** Eerst wachten op alle foto's en kaarttegels, anders staan er lege vlakken in de PDF. */
async function savePdf() {
  preparing.value = true
  try {
    await Promise.all([waitForImages(bookRef.value), waitForTiles(mapRef.value?.getMap?.())])
  } finally {
    preparing.value = false
  }
  window.print()
}

onMounted(async () => {
  const id = route.params.id
  try {
    trip.value = await tripsApi.getTripById(id)
    document.title = `${trip.value.title} · ${t('photobook.documentTitle')}`
  } catch {
    trip.value = null
    loading.value = false
    return
  }
  // De rest is optioneel: zonder album, dagboek of route wordt het fotoboek gewoon korter.
  const [recapResult, photosResult, journalResult, routeResult] = await Promise.allSettled([
    tripExtrasApi.getRecap(id),
    albumApi.getPhotos(id),
    tripsApi.getJournal(id),
    trip.value.stops.length > 1 ? tripsApi.getRoute(id) : Promise.resolve(null),
  ])
  recap.value = recapResult.status === 'fulfilled' ? recapResult.value : null
  photos.value = photosResult.status === 'fulfilled' ? photosResult.value : []
  journal.value = journalResult.status === 'fulfilled' ? journalResult.value : []
  tripRoute.value = routeResult.status === 'fulfilled' ? routeResult.value : null
  loading.value = false
})
</script>

<style scoped>
.pb-page {
  position: relative;
  width: 100%;
  max-width: var(--pb-max);
  aspect-ratio: var(--pb-ratio);
  margin: 0 auto 1.5rem;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid rgb(var(--c-line));
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.08);
}

/* De kaart is een illustratie: geen bediening op papier. */
.pb-map :deep(.leaflet-control-zoom) {
  display: none;
}

@media print {
  .pb-page {
    max-width: none;
    height: 190mm;
    aspect-ratio: auto;
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    break-after: page;
    break-inside: avoid;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .pb-page:last-child {
    break-after: auto;
  }
}
</style>
