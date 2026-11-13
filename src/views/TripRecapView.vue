<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-ground sm:p-6">
    <div
      class="relative flex h-full w-full flex-col overflow-hidden bg-ink text-surface sm:h-[min(92vh,860px)] sm:w-auto sm:rounded-3xl sm:[aspect-ratio:9/16]"
      role="region"
      :aria-label="$t('tripExtras.recap.aria')"
      aria-roledescription="carousel"
    >
      <!-- Voortgangsbalkjes -->
      <div class="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-3">
        <span v-for="(s, i) in slides" :key="s" class="h-1 flex-1 overflow-hidden rounded-full bg-surface/25">
          <span class="block h-full rounded-full bg-surface" :style="{ width: `${i < index ? 100 : i === index ? Math.round(progress * 100) : 0}%` }" />
        </span>
      </div>
      <div class="absolute inset-x-0 top-5 z-20 flex items-center justify-between px-3">
        <span class="text-xs font-bold opacity-80">{{ recap?.title }}</span>
        <div class="flex items-center gap-1">
          <button v-if="recap" type="button" class="btn-icon btn-icon-sm text-surface hover:bg-surface/10 hover:text-surface" :aria-label="paused ? $t('tripExtras.recap.play') : $t('tripExtras.recap.pause')" @click.stop="paused = !paused">
            <Icon :name="paused ? 'play' : 'pause'" :size="16" :filled="paused" />
          </button>
          <button type="button" class="btn-icon btn-icon-sm text-surface hover:bg-surface/10 hover:text-surface" :aria-label="$t('tripExtras.recap.close')" @click.stop="close">
            <Icon name="x" :size="18" />
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex flex-1 items-center justify-center"><Spinner /></div>
      <div v-else-if="!recap" class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p class="text-lg font-extrabold">{{ $t('tripExtras.recap.loadFailed') }}</p>
        <button type="button" class="btn btn-secondary btn-sm" @click="close">{{ $t('tripExtras.recap.close') }}</button>
      </div>

      <template v-else>
        <!-- Tikzones: links = terug, rechts = verder; ingedrukt houden pauzeert -->
        <div
          class="absolute inset-0 z-10 flex"
          @pointerdown="holding = true"
          @pointerup="holding = false"
          @pointercancel="holding = false"
          @pointerleave="holding = false"
        >
          <button type="button" class="h-full w-1/3 cursor-w-resize focus:outline-none" :aria-label="$t('tripExtras.recap.previous')" @click="prev" />
          <button type="button" class="h-full w-2/3 cursor-e-resize focus:outline-none" :aria-label="$t('tripExtras.recap.next')" @click="next" />
        </div>

        <Transition :name="reducedMotion ? '' : 'recap-fade'" mode="out-in">
          <section :key="current" class="relative flex flex-1 flex-col justify-end overflow-hidden px-6 pb-10 pt-16" aria-live="polite">
            <!-- intro -->
            <template v-if="current === 'intro'">
              <div class="absolute inset-0 opacity-60"><CoverImage :src="recap.coverImageUrl" :seed="recap.tripId" eager /></div>
              <div class="relative">
                <p class="eyebrow text-surface/70">{{ recap.isFinished ? $t('tripExtras.recap.wrapped') : $t('tripExtras.recap.soFar') }}</p>
                <h1 class="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-balance">{{ recap.title }}</h1>
                <p class="mt-2 text-sm font-semibold opacity-80">{{ formatDateRange(recap.startDate, recap.endDate) }}<template v-if="recap.country"> · {{ recap.country }}</template></p>
              </div>
            </template>

            <!-- cijfers -->
            <template v-else-if="current === 'numbers'">
              <p class="eyebrow text-surface/70">{{ $t('tripExtras.recap.numbersTitle') }}</p>
              <dl class="mt-4 grid grid-cols-2 gap-3">
                <div v-for="s in numberStats" :key="s.label" class="rounded-2xl border border-surface/20 p-4">
                  <dd class="text-3xl font-extrabold tabular-nums">{{ s.value }}</dd>
                  <dt class="mt-1 text-xs font-bold uppercase tracking-wider opacity-70">{{ s.label }}</dt>
                </div>
              </dl>
              <p v-if="footprintLine" class="mt-4 flex items-start gap-2 text-sm font-semibold opacity-90">
                <Icon name="leaf" :size="16" class="mt-0.5" /><span>{{ footprintLine }}</span>
              </p>
            </template>

            <!-- stops & landen -->
            <template v-else-if="current === 'stops'">
              <p class="eyebrow text-surface/70">{{ $t('tripExtras.recap.stopsTitle') }}</p>
              <p class="mt-2 text-3xl font-extrabold leading-tight">{{ $t('tripExtras.recap.stopsHeadline', { n: recap.stopCount }) }}</p>
              <ul class="mt-5 space-y-2.5">
                <li v-for="row in stopRows" :key="row.type" class="flex items-center gap-3">
                  <span class="flex h-9 w-9 items-center justify-center rounded-full bg-surface/10"><Icon :name="row.meta.icon" :size="18" /></span>
                  <span class="flex-1 text-sm font-bold">{{ row.meta.plural }}</span>
                  <span class="text-lg font-extrabold tabular-nums">{{ row.count }}</span>
                </li>
              </ul>
              <p v-if="recap.countries.length" class="mt-5 text-sm font-semibold opacity-80">{{ $t('tripExtras.recap.countries', recap.countries.length) }}: {{ recap.countries.join(', ') }}</p>
            </template>

            <!-- weer -->
            <template v-else-if="current === 'weather'">
              <p class="eyebrow text-surface/70">{{ $t(`tripExtras.recap.weatherTitle.${recap.weather.kind}`) }}</p>
              <div class="mt-4 flex items-center gap-4">
                <Icon :name="weatherInfo(recap.weather.warmest.weatherCode).icon" :size="56" />
                <div>
                  <p class="text-5xl font-extrabold tabular-nums">{{ Math.round(recap.weather.warmest.tempMax) }}°</p>
                  <p class="text-sm font-semibold opacity-80">{{ $t('tripExtras.recap.warmest', { date: formatDate(recap.weather.warmest.date, { weekday: 'long', day: 'numeric', month: 'long' }), place: recap.weather.warmest.locationName }) }}</p>
                </div>
              </div>
              <dl class="mt-6 grid grid-cols-3 gap-2 text-center">
                <div class="rounded-2xl border border-surface/20 p-3"><dd class="text-2xl font-extrabold">{{ recap.weather.sunnyDays }}</dd><dt class="text-[11px] font-bold uppercase opacity-70">{{ $t('tripExtras.recap.sunnyDays') }}</dt></div>
                <div class="rounded-2xl border border-surface/20 p-3"><dd class="text-2xl font-extrabold">{{ recap.weather.rainyDays }}</dd><dt class="text-[11px] font-bold uppercase opacity-70">{{ $t('tripExtras.recap.rainyDays') }}</dt></div>
                <div class="rounded-2xl border border-surface/20 p-3"><dd class="text-2xl font-extrabold">{{ Math.round(recap.weather.coldest.tempMin) }}°</dd><dt class="text-[11px] font-bold uppercase opacity-70">{{ $t('tripExtras.recap.coldest') }}</dt></div>
              </dl>
            </template>

            <!-- foto's -->
            <template v-else-if="current === 'photos'">
              <p class="eyebrow text-surface/70">{{ $t('tripExtras.recap.photosTitle') }}</p>
              <div class="mt-4 grid grid-cols-3 gap-1.5">
                <img
                  v-for="(p, i) in recap.photos.slice(0, 6)"
                  :key="p.imageUrl"
                  :src="thumbUrl(p.imageUrl)"
                  :alt="p.caption || ''"
                  class="aspect-square w-full rounded-xl object-cover"
                  :class="i === 0 ? 'col-span-2 row-span-2 aspect-auto h-full' : ''"
                  loading="lazy"
                />
              </div>
              <p v-if="recap.photos[0]?.likeCount" class="mt-3 text-sm font-semibold opacity-80">{{ $t('tripExtras.recap.topPhoto', { n: recap.photos[0].likeCount, name: recap.photos[0].authorDisplayName }) }}</p>
            </template>

            <!-- dagboek -->
            <template v-else-if="current === 'journal'">
              <p class="eyebrow text-surface/70">{{ $t('tripExtras.recap.journalTitle') }}</p>
              <ul class="mt-4 space-y-4">
                <li v-for="j in recap.journal" :key="j.id">
                  <blockquote class="border-l-2 border-accent-500 pl-3 text-[15px] font-semibold leading-relaxed">“{{ j.excerpt }}”</blockquote>
                  <p class="mt-1 pl-3 text-xs opacity-70">{{ j.authorDisplayName }} · {{ formatDate(j.date) }}</p>
                </li>
              </ul>
            </template>

            <!-- budget -->
            <template v-else-if="current === 'budget'">
              <p class="eyebrow text-surface/70">{{ $t('tripExtras.recap.budgetTitle') }}</p>
              <p class="mt-3 text-5xl font-extrabold tabular-nums">{{ formatCurrency(recap.budget.spentTotal, recap.budget.currency) }}</p>
              <p class="mt-2 text-sm font-semibold opacity-80">{{ $t('tripExtras.recap.budgetDetail', { perPerson: formatCurrency(recap.budget.perPerson, recap.budget.currency), n: recap.budget.expenseCount }) }}</p>
            </template>

            <!-- reisgenoten -->
            <template v-else-if="current === 'crew'">
              <p class="eyebrow text-surface/70">{{ $t('tripExtras.recap.crewTitle') }}</p>
              <ul class="mt-4 flex flex-wrap gap-3">
                <li v-for="p in recap.participants" :key="p.userName" class="flex flex-col items-center gap-1.5">
                  <Avatar :src="p.profilePhotoUrl" :name="p.displayName" size="lg" />
                  <span class="max-w-[5.5rem] truncate text-xs font-bold">{{ p.displayName }}</span>
                </li>
              </ul>
            </template>

            <!-- tijdcapsules -->
            <template v-else-if="current === 'capsules'">
              <p class="eyebrow text-surface/70">{{ $t('capsule.recapTitle') }}</p>
              <!-- De tikzones liggen over de slide (niet scrollbaar): hoogstens drie capsules, ingekort. -->
              <ul class="mt-4 space-y-3">
                <li v-for="c in recap.capsules.slice(0, 3)" :key="c.id" class="rounded-2xl border border-surface/20 p-4">
                  <div class="flex items-center gap-2">
                    <Avatar :src="c.authorProfilePhotoUrl" :name="c.authorDisplayName" size="xs" />
                    <span class="text-xs font-bold opacity-80">{{ $t('capsule.from', { name: c.authorDisplayName }) }}</span>
                    <Icon v-if="c.audience === 'Self'" name="lock" :size="12" class="opacity-70" />
                  </div>
                  <p class="mt-2 whitespace-pre-line text-[15px] font-semibold leading-relaxed" :class="recap.capsules.length > 1 ? 'line-clamp-3' : 'line-clamp-6'">{{ c.message }}</p>
                  <img v-if="c.imageUrl && recap.capsules.length === 1" :src="thumbUrl(c.imageUrl)" alt="" class="mt-3 aspect-[16/10] w-full rounded-xl object-cover" loading="lazy" />
                </li>
              </ul>
              <p v-if="lockedCapsules" class="mt-3 flex items-center gap-1.5 text-xs font-semibold opacity-70">
                <Icon name="lock" :size="12" /> {{ $t('capsule.recapLocked', lockedCapsules) }}
              </p>
            </template>

            <!-- samenvatting -->
            <template v-else-if="current === 'summary'">
              <div class="relative z-20 rounded-3xl bg-surface p-5 text-ink">
                <p class="eyebrow-accent">{{ $t('tripExtras.recap.summaryTitle') }}</p>
                <h2 class="mt-1 text-2xl font-extrabold leading-tight tracking-tight">{{ recap.title }}</h2>
                <p class="mt-1 text-sm text-muted">{{ formatDateRange(recap.startDate, recap.endDate) }}</p>
                <dl class="mt-4 grid grid-cols-2 gap-2">
                  <div v-for="s in numberStats" :key="s.label" class="rounded-2xl bg-gray-50 p-3">
                    <dd class="text-xl font-extrabold tabular-nums">{{ s.value }}</dd>
                    <dt class="text-[11px] font-bold uppercase tracking-wider text-muted">{{ s.label }}</dt>
                  </div>
                </dl>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button type="button" class="btn btn-primary btn-sm" :disabled="sharing" @click.stop="shareImage">
                    <Icon name="share" :size="14" /> {{ sharing ? $t('tripExtras.recap.sharing') : $t('tripExtras.recap.share') }}
                  </button>
                  <RouterLink v-if="features.photobook" :to="`/trips/${recap.tripId}/photobook`" class="btn btn-secondary btn-sm" @click.stop><Icon name="book" :size="14" /> {{ $t('photobook.open') }}</RouterLink>
                  <button type="button" class="btn btn-secondary btn-sm" @click.stop="restart"><Icon name="refresh" :size="14" /> {{ $t('tripExtras.recap.again') }}</button>
                </div>
              </div>
            </template>
          </section>
        </Transition>
      </template>
    </div>

    <!-- Verborgen deelkaart (alleen tijdens het renderen naar PNG) -->
    <div v-if="sharing && recap" class="pointer-events-none fixed left-[-12000px] top-0" aria-hidden="true">
      <div ref="cardRef"><RecapShareCard :recap="recap" :cover-src="recap.coverImageUrl" /></div>
    </div>
  </div>
</template>

<script setup>
import { features } from '@/config/features'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Spinner from '@/components/ui/Spinner.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import RecapShareCard from '@/components/trip/RecapShareCard.vue'
import * as tripExtrasApi from '@/api/tripExtrasApi'
import * as tripsApi from '@/api/tripsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDate, formatDateRange } from '@/utils/date'
import { formatDistance } from '@/utils/format'
import { footprintSentence } from '@/utils/footprint'
import { thumbUrl } from '@/utils/media'
import { weatherInfo } from '@/utils/weather'
import { STOP_TYPE_ORDER, stopTypeMeta } from '@/utils/stopTypes'
import { safeFileName } from '@/utils/ics'
import { recapSlides, shareOrDownload } from '@/utils/recap'

const SLIDE_MS = 6000

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const { t } = useI18n()

const recap = ref(null)
const loading = ref(true)
/** Aantal capsules van deze reis dat nog verzegeld is (alleen voor deelnemers). */
const lockedCapsules = ref(0)
const index = ref(0)
const progress = ref(0)
const paused = ref(false)
const holding = ref(false)
const sharing = ref(false)
const cardRef = ref(null)
const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const slides = computed(() => recapSlides(recap.value))
const current = computed(() => slides.value[index.value])

const numberStats = computed(() => {
  const r = recap.value
  if (!r) return []
  return [
    { value: r.days, label: t('tripExtras.recap.daysLabel', r.days) },
    { value: r.nights, label: t('tripExtras.recap.nightsLabel', r.nights) },
    { value: r.stopCount, label: t('tripExtras.recap.stopsLabel', r.stopCount) },
    { value: r.distanceMeters ? formatDistance(r.distanceMeters) : '—', label: t('tripExtras.recap.distanceLabel') },
  ]
})

/** "Je reis stootte ~250 kg CO₂ uit, 40% minder dan met de auto." */
const footprintLine = computed(() => (recap.value ? footprintSentence(t, recap.value.footprintKg, recap.value.footprintCarKg) : ''))

const stopRows = computed(() => {
  const counts = recap.value?.stopCounts || {}
  const byType = { Waypoint: counts.waypoint, Accommodation: counts.accommodation, FoodSpot: counts.foodSpot, Activity: counts.activity }
  return STOP_TYPE_ORDER.filter((type) => byType[type] > 0).map((type) => ({ type, count: byType[type], meta: stopTypeMeta(type) }))
})

// ---------- navigatie ----------
function next() {
  if (index.value < slides.value.length - 1) {
    index.value++
    progress.value = 0
  } else {
    progress.value = 1
  }
}

function prev() {
  if (index.value > 0) index.value--
  progress.value = 0
}

function restart() {
  index.value = 0
  progress.value = 0
  paused.value = false
}

function close() {
  if (window.history.state?.back) router.back()
  else router.replace(`/trips/${route.params.id}`)
}

// Automatisch verder; niet bij reduced motion (dan tikt de gebruiker zelf door), op de laatste slide of tijdens pauze.
let frame = 0
let last = 0
function tick(now) {
  const dt = last ? now - last : 0
  last = now
  const atEnd = index.value >= slides.value.length - 1
  if (!reducedMotion && !paused.value && !holding.value && !sharing.value && !atEnd && document.visibilityState === 'visible') {
    progress.value = Math.min(1, progress.value + dt / SLIDE_MS)
    if (progress.value >= 1) next()
  }
  frame = requestAnimationFrame(tick)
}

function onKey(e) {
  if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'Escape') close()
  else if (e.key === ' ') {
    e.preventDefault()
    paused.value = !paused.value
  }
}

// ---------- delen als afbeelding ----------
async function renderCard(options) {
  const { toBlob } = await import('html-to-image')
  return toBlob(cardRef.value, { width: 1080, height: 1920, pixelRatio: 1, cacheBust: true, ...options })
}

async function shareImage() {
  if (sharing.value) return
  sharing.value = true
  try {
    await nextTick()
    let blob = null
    try {
      blob = await renderCard()
    } catch {
      // Een externe foto zonder CORS laat het canvas "besmet" achter: opnieuw zonder afbeeldingen.
      blob = await renderCard({ filter: (node) => node.tagName !== 'IMG' })
    }
    if (!blob) throw new Error('empty')
    const result = await shareOrDownload(blob, `${safeFileName(recap.value.title)}-recap.png`, recap.value.title)
    if (result === 'downloaded') toast.success(t('tripExtras.recap.downloaded'))
  } catch {
    toast.error(t('tripExtras.recap.shareFailed'))
  } finally {
    sharing.value = false
  }
}

/** Geopende, leesbare tijdcapsules; alleen deelnemers kunnen ze ophalen. Een fout laat de slide gewoon weg. */
async function loadCapsules(r) {
  if (!r.participants?.some((p) => p.userName === auth.userName)) return []
  try {
    const list = await tripsApi.getCapsules(r.tripId)
    lockedCapsules.value = list.filter((c) => !c.isOpen).length
    return list.filter((c) => c.canRead)
  } catch {
    return []
  }
}

async function load() {
  loading.value = true
  try {
    const r = await tripExtrasApi.getRecap(route.params.id)
    recap.value = { ...r, capsules: await loadCapsules(r) }
    document.title = `${t('tripExtras.recap.documentTitle', { title: recap.value.title })} · ExploreMe`
    // Deeplink vanuit een melding (bv. ?slide=capsules): meteen naar die slide.
    const wanted = slides.value.indexOf(route.query.slide)
    if (wanted > 0) index.value = wanted
  } catch {
    recap.value = null
  } finally {
    loading.value = false
  }
}

watch(index, () => { last = 0 })

onMounted(() => {
  load()
  window.addEventListener('keydown', onKey)
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  cancelAnimationFrame(frame)
})
</script>

<style scoped>
.recap-fade-enter-active,
.recap-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.recap-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.recap-fade-leave-to {
  opacity: 0;
}
</style>
