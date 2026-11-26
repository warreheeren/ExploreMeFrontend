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
          {{ $t('photobook.density') }}
          <select v-model="density" class="input h-9 w-auto py-0">
            <option v-for="d in BOOK_DENSITY_KEYS" :key="d" :value="d">{{ $t(`photobook.densities.${d}`) }}</option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-sm font-semibold text-body">
          <input v-model="includeText" type="checkbox" class="checkbox" />
          {{ $t('photobook.includeText') }}
        </label>

        <div v-if="trip" class="ml-auto flex items-center gap-2">
          <!-- Het boek is van de groep en bewaart zichzelf kort na elke wijziging. -->
          <span v-if="canEdit && saveLabel" class="text-xs font-bold" :class="editor.saveState.value === 'error' ? 'text-red-600' : 'text-accent-700'" role="status">{{ saveLabel }}</span>
          <button v-if="canEdit && days.length" type="button" class="btn btn-sm" :class="editor.editing.value ? 'border-accent-700 bg-accent-50 text-accent-800' : 'btn-secondary'" :aria-pressed="editor.editing.value" @click="toggleEditing">
            <Icon name="edit" :size="14" /> {{ editor.editing.value ? $t('photobook.edit.done') : $t('photobook.edit.start') }}
          </button>
          <button type="button" class="btn btn-dark btn-sm" :disabled="preparing" @click="savePdf">
            <Icon name="download" :size="14" /> {{ preparing ? $t('photobook.preparing') : $t('photobook.savePdf') }}
          </button>
        </div>
      </div>
      <p v-if="trip && !days.length && !loading" class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2.5 text-xs text-muted">
        {{ $t('photobook.emptyHint') }}
        <RouterLink :to="{ path: `/trips/${route.params.id}`, query: { tab: 'album' } }" class="font-bold text-accent-700 hover:underline">{{ $t('photobook.toAlbum') }}</RouterLink>
      </p>
      <!-- Het boek kiest: zo weet je dat er niets kwijt is en waar de rest staat. -->
      <p v-else-if="skippedTotal" class="mx-auto max-w-5xl px-4 pb-2.5 text-xs text-muted">
        {{ $t('photobook.selectionHint', { chosen: chosenTotal, total: chosenTotal + skippedTotal }) }}
        <button type="button" class="font-bold text-accent-700 hover:underline" @click="density = 'all'">{{ $t('photobook.showAll') }}</button>
      </p>
      <!-- Bewerkmodus: wat je aanpast geldt voor de hele groep. -->
      <div v-if="editor.editing.value" class="border-t border-accent-100 bg-accent-50">
        <p class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs font-semibold text-accent-800">
          <span>{{ $t('photobook.edit.groupHint') }}</span>
          <span v-if="editor.updatedBy.value && editor.updatedAt.value" class="font-medium">{{ $t('photobook.edit.lastChanged', { name: editor.updatedBy.value, when: timeAgo(editor.updatedAt.value) }) }}</span>
          <button v-if="editor.customized.value" type="button" class="ml-auto underline hover:no-underline" @click="editor.reset">{{ $t('photobook.edit.reset') }}</button>
        </p>
        <!-- Groepspagina's: aan/uit voor de hele groep. -->
        <fieldset v-if="extras" class="mx-auto max-w-5xl px-4 pb-2.5">
          <legend class="sr-only">{{ $t('photobook.extras.pagesTitle') }}</legend>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span class="text-xs font-bold text-accent-800" aria-hidden="true">{{ $t('photobook.extras.pagesTitle') }}</span>
            <label v-for="key in EXTRA_PAGES" :key="key" class="inline-flex items-center gap-2 text-xs font-semibold text-ink">
              <Toggle :model-value="editor.overrides.value.pages[key]" :label="$t(`photobook.extras.pages.${key}`)" @update:model-value="(on) => change(setPage(editor.overrides.value, key, on))" />
              <span>{{ $t(`photobook.extras.pages.${key}`) }}<span v-if="!extraHasContent[key]" class="font-medium text-muted"> · {{ $t('photobook.extras.nothingYet') }}</span></span>
            </label>
          </div>
          <p v-if="editor.overrides.value.pages.facts" class="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800" role="note">{{ $t('photobook.extras.amountsWarning') }}</p>
        </fieldset>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <p v-else-if="!trip" class="py-20 text-center text-sm text-muted">{{ $t('photobook.loadFailed') }}</p>

    <div v-else ref="bookRef" class="photobook px-4 py-6 print:p-0" :style="{ '--pb-ratio': `${formatInfo.widthMm} / ${formatInfo.heightMm}`, '--pb-max': `${Math.round(formatInfo.widthMm * 3.78)}px` }">
      <!-- Omslag -->
      <section class="pb-page relative text-white">
        <div class="absolute inset-0"><CoverImage :src="coverUrl" :seed="trip.id" eager /></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <button v-if="editor.editing.value && albumPhotos.length" type="button" class="print-hidden absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/95 px-3 text-xs font-bold text-ink shadow" @click="openPicker('cover')">
          <Icon name="image" :size="14" /> {{ $t('photobook.edit.changeCover') }}
        </button>
        <div class="absolute inset-x-0 bottom-0 p-[6%]">
          <p v-if="trip.country" class="text-xs font-bold uppercase tracking-[0.18em] opacity-85">{{ trip.country }}</p>
          <!-- In de bewerkmodus typ je de titel en ondertitel op de omslag zelf. Leeg = de titel van de reis / de namen. -->
          <template v-if="editor.editing.value">
            <label class="sr-only" for="pb-title">{{ $t('photobook.edit.title') }}</label>
            <input id="pb-title" v-model.trim="editor.title.value" class="print-hidden mt-2 w-full rounded-lg border border-dashed border-white/70 bg-transparent px-2 py-1 font-display text-4xl font-semibold leading-tight tracking-tight text-white placeholder:text-white/60 focus:border-white focus:outline-none" maxlength="120" :placeholder="trip.title" />
          </template>
          <h1 class="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-balance" :class="editor.editing.value ? 'hidden print:block' : ''">{{ bookTitle }}</h1>
          <p class="mt-2 text-sm font-semibold opacity-90">{{ formatDateRange(trip.startDate, trip.endDate) }}</p>
          <template v-if="editor.editing.value">
            <label class="sr-only" for="pb-subtitle">{{ $t('photobook.edit.subtitle') }}</label>
            <input id="pb-subtitle" v-model.trim="editor.subtitle.value" class="print-hidden mt-1 w-full rounded-lg border border-dashed border-white/70 bg-transparent px-2 py-1 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none" maxlength="160" :placeholder="crewNames || $t('photobook.edit.subtitle')" />
          </template>
          <p v-if="bookSubtitle" class="mt-1 text-sm opacity-80" :class="editor.editing.value ? 'hidden print:block' : ''">{{ bookSubtitle }}</p>
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

      <!-- Wie was erbij -->
      <section v-if="extraPages.crew" class="pb-page pb-flow flex flex-col justify-center bg-surface px-[6%] py-[5%] text-ink" data-page="crew">
        <p class="eyebrow-accent">{{ bookTitle }}</p>
        <h2 class="mt-1 text-3xl font-extrabold tracking-tight">{{ $t('photobook.extras.crewTitle') }}</h2>
        <ul class="mt-6 grid gap-x-3" :class="[crewGrid.cols, crewGrid.gap]">
          <li v-for="(p, i) in crew" :key="i" class="min-w-0 text-center">
            <Avatar :src="p.photoUrl" :name="p.fullName" :size="crewGrid.avatar" />
            <b class="mt-1.5 block truncate font-bold" :class="crewGrid.name">{{ p.name }}</b>
            <span v-if="p.detail" class="block text-[11px] leading-snug text-muted">{{ p.detail }}</span>
          </li>
        </ul>
        <p class="mt-6 text-xs text-muted">{{ formatDateRange(trip.startDate, trip.endDate) }} · {{ $t('photobook.extras.crewCount', crew.length) }}</p>
      </section>

      <!-- Per dag -->
      <template v-for="day in days" :key="day.date">
        <section v-for="(page, i) in day.pages" :key="`${day.date}-${i}`" class="pb-page flex flex-col bg-surface text-ink">
          <header class="flex items-baseline gap-2 px-[4%] pb-2 pt-3">
            <h2 class="text-lg font-extrabold">{{ $t('photobook.day', { n: day.dayNumber }) }}</h2>
            <p class="text-sm font-semibold text-muted">{{ formatFullDate(day.date) }}</p>
            <span v-if="day.mood" class="ml-auto text-sm font-semibold text-body">{{ moodEmoji(day.mood) }} {{ $t(`planning.journal.moods.${day.mood}`) }}</span>
            <!-- Alleen op het scherm, op de laatste pagina van de dag: hoeveel foto's van die dag niet in het boek staan. -->
            <template v-if="day.skipped && i === day.pages.length - 1">
              <button v-if="editor.editing.value && day.unused.length" type="button" class="print-hidden inline-flex items-center gap-1 text-xs font-bold text-accent-700 hover:underline" :class="day.mood ? '' : 'ml-auto'" @click="openPicker('add', day)">
                <Icon name="plus" :size="13" /> {{ $t('photobook.edit.addPhoto') }} <span class="font-semibold text-muted">· {{ $t('photobook.moreInAlbum', day.skipped) }}</span>
              </button>
              <span v-else class="print-hidden text-xs font-semibold text-muted" :class="day.mood ? '' : 'ml-auto'">{{ $t('photobook.moreInAlbum', day.skipped) }}</span>
            </template>
          </header>

          <!-- Alleen tekst -->
          <div v-if="page.kind === 'text'" class="min-h-0 flex-1 overflow-hidden px-[4%] pb-[3%]" :class="landscape ? 'columns-2 gap-8' : ''">
            <article v-for="e in day.entries" :key="e.id" class="mb-4 break-inside-avoid-column">
              <h3 v-if="e.title" class="text-base font-bold">{{ e.title }}</h3>
              <p class="whitespace-pre-line text-[13px] leading-relaxed text-body">{{ e.text }}</p>
              <p class="mt-1 text-[11px] font-semibold text-muted">— {{ e.authorDisplayName }}</p>
            </article>
          </div>

          <!-- Foto's (met korte tekst ernaast of erboven) -->
          <div v-else class="flex min-h-0 flex-1 gap-[2%] px-[4%] pb-[3%]" :class="landscape ? 'flex-row' : 'flex-col'">
            <div v-if="page.withText" class="shrink-0 overflow-hidden" :class="landscape ? 'w-[32%]' : 'max-h-[35%]'">
              <article v-for="e in day.entries" :key="e.id" class="mb-3">
                <h3 v-if="e.title" class="text-base font-bold">{{ e.title }}</h3>
                <p class="whitespace-pre-line text-[13px] leading-relaxed text-body">{{ e.text }}</p>
              </article>
            </div>
            <div class="grid min-h-0 min-w-0 flex-1 gap-[6px]" :class="gridClass(page.photos.length)">
              <figure
                v-for="p in page.photos"
                :key="p.id"
                class="relative min-h-0 overflow-hidden rounded-lg bg-gray-100"
                :class="isSelected(p) ? 'outline outline-[3px] outline-offset-2 outline-accent-700 print:outline-none' : ''"
              >
                <img :src="resolveMediaUrl(p.imageUrl)" :alt="p.caption || ''" class="h-full w-full object-cover" loading="eager" decoding="async" />
                <figcaption v-if="p.caption || p.stopName" class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-1.5 pt-5 text-[11px] font-semibold text-white">
                  {{ p.caption || p.stopName }}
                </figcaption>

                <!-- Bewerkmodus (nooit in de PDF): tik op een albumfoto om hem te kiezen; dagboekfoto's horen bij hun tekst. -->
                <template v-if="editor.editing.value && isAlbumPhoto(p)">
                  <button type="button" class="print-hidden absolute inset-0 cursor-pointer" :aria-pressed="isSelected(p)" :aria-label="$t('photobook.edit.selectPhoto', { name: p.caption || p.stopName || p.uploadedByDisplayName })" @click="selectPhoto(day, p)" />
                  <span v-if="isPinned(p)" class="print-hidden pointer-events-none absolute left-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-accent-700 px-2 text-[11px] font-extrabold text-white"><Icon name="lock" :size="11" /> {{ $t('photobook.edit.pinned') }}</span>
                  <span v-if="p.likeCount && !isSelected(p)" class="print-hidden pointer-events-none absolute right-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-surface/90 px-2 text-[11px] font-bold text-ink"><Icon name="heart" :size="11" filled class="text-red-600" /> {{ p.likeCount }}</span>
                  <!-- Desktop: knoppen op de gekozen foto. Op de telefoon staat hetzelfde lijstje onderaan het scherm. -->
                  <div v-if="isSelected(p)" class="print-hidden absolute right-2 top-2 hidden flex-wrap justify-end gap-1.5 md:flex">
                    <button
                      v-for="a in photoActions"
                      :key="a.key"
                      type="button"
                      class="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/95 px-2.5 text-xs font-bold shadow disabled:opacity-40"
                      :class="a.danger ? 'text-red-600' : 'text-ink'"
                      :disabled="a.disabled"
                      :title="a.label"
                      :aria-label="a.label"
                      @click="a.run"
                    >
                      <Icon :name="a.icon" :size="14" /> <span v-if="a.showLabel">{{ a.shortLabel || a.label }}</span>
                    </button>
                  </div>
                </template>
              </figure>
            </div>
          </div>
        </section>
      </template>

      <!-- Zo beslisten we -->
      <section v-if="extraPages.decisions" class="pb-page pb-flow flex flex-col justify-center bg-surface px-[6%] py-[5%] text-ink" data-page="decisions">
        <p class="eyebrow-accent">{{ $t('photobook.extras.decisionsEyebrow') }}</p>
        <h2 class="mt-1 text-3xl font-extrabold tracking-tight">{{ $t('photobook.extras.decisionsTitle') }}</h2>
        <ul class="mt-5 grid gap-2.5">
          <li v-for="(d, i) in decisions" :key="i" class="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-2xl border border-line px-4 py-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Icon :name="d.icon" :size="18" /></span>
            <div class="min-w-[9rem] flex-1">
              <p class="truncate text-xs font-bold text-muted">{{ d.question }}</p>
              <b class="block truncate text-lg font-bold leading-tight">{{ d.answer }}</b>
            </div>
            <small v-if="d.tally" class="ml-auto shrink-0 whitespace-nowrap text-xs font-bold text-accent-700">{{ d.tally }}</small>
          </li>
        </ul>
      </section>

      <!-- De reis in cijfers -->
      <section v-if="extraPages.facts" class="pb-page pb-flow flex flex-col justify-center bg-surface px-[6%] py-[5%] text-ink" data-page="facts">
        <p class="eyebrow-accent">{{ $t('photobook.extras.factsEyebrow') }}</p>
        <h2 class="mt-1 text-3xl font-extrabold tracking-tight">{{ $t('photobook.extras.factsTitle') }}</h2>
        <dl class="mt-5 grid gap-2.5" :class="landscape ? 'grid-cols-3' : 'grid-cols-2'">
          <div v-for="f in facts" :key="f.type" class="min-w-0 rounded-2xl border px-4 py-3.5" :class="f.wide ? 'col-span-full border-accent-100 bg-accent-50' : 'border-line'">
            <dd class="truncate font-extrabold tracking-tight" :class="f.wide ? 'text-base' : 'text-2xl tabular-nums'">{{ f.value }}</dd>
            <dt v-if="f.label" class="mt-0.5 text-xs font-bold text-muted">{{ f.label }}</dt>
          </div>
        </dl>
      </section>

      <!-- Slotpagina -->
      <section class="pb-page flex flex-col justify-center bg-surface px-[8%] text-ink">
        <p class="eyebrow-accent">{{ $t('photobook.closingEyebrow') }}</p>
        <h2 class="mt-1 text-3xl font-extrabold tracking-tight">{{ bookTitle }}</h2>
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

    <!-- Telefoon: de acties voor de gekozen foto als blad onderaan (op desktop staan ze op de foto). -->
    <div v-if="editor.editing.value && selectedPhoto" class="print-hidden fixed inset-x-0 bottom-0 z-[1150] border-t border-line bg-surface p-2 shadow-pop safe-bottom md:hidden" role="group" :aria-label="$t('photobook.edit.actionsFor', { name: selectedPhoto.caption || selectedPhoto.stopName || selectedPhoto.uploadedByDisplayName })">
      <button v-for="a in photoActions" :key="a.key" type="button" class="menu-item w-full px-3 py-2.5 disabled:opacity-40" :class="a.danger ? 'menu-item-danger' : ''" :disabled="a.disabled" @click="a.run">
        <Icon :name="a.icon" :size="17" /> {{ a.label }}
      </button>
    </div>

    <PhotobookPhotoPicker
      v-model="picker.open"
      :title="pickerTexts.title"
      :subtitle="pickerTexts.subtitle"
      :hint="pickerTexts.hint"
      :confirm-label="pickerTexts.confirm"
      :photos="pickerPhotos"
      @pick="onPick"
    />

    <Modal v-model="captionOpen" :title="$t('photobook.edit.captionTitle')" :subtitle="$t('photobook.edit.captionHint')" size="sm">
      <form id="pb-caption-form" @submit.prevent="saveCaption">
        <label for="pb-caption" class="label">{{ $t('photobook.edit.caption') }}</label>
        <input id="pb-caption" v-model="captionDraft" class="input" maxlength="200" :placeholder="$t('photobook.edit.captionPlaceholder')" />
      </form>
      <template #footer>
        <button v-if="hasBookCaption" type="button" class="btn btn-ghost mr-auto" @click="saveCaption(null)">{{ $t('photobook.edit.captionFromAlbum') }}</button>
        <button type="button" class="btn btn-ghost" @click="captionOpen = false">{{ $t('common.cancel') }}</button>
        <button type="submit" form="pb-caption-form" class="btn btn-dark">{{ $t('common.save') }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { publicWebOrigin } from '@/services/native'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue'
import Avatar from '@/components/ui/Avatar.vue'
import Modal from '@/components/ui/Modal.vue'
import Toggle from '@/components/ui/Toggle.vue'
import * as photobookApi from '@/api/photobookApi'
import { EXTRA_PAGES, crewRows, decisionRows, factRows, visibleExtraPages } from '@/utils/photobookExtras'
import PhotobookPhotoPicker from '@/components/trip/PhotobookPhotoPicker.vue'
import { usePhotobookEditor } from '@/composables/usePhotobookEditor'
import { addPhoto, arrangeDayPhotos, excludePhoto, movePhoto, setCaption, setPage, setPinned, swapPhoto } from '@/utils/photobookEdits'
import { BOOK_DENSITY, BOOK_DENSITY_KEYS, pickCoverPhoto, selectDayPhotos } from '@/utils/photobookSelection'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import TripMap from '@/components/trip/TripMap.vue'
import * as tripsApi from '@/api/tripsApi'
import * as tripExtrasApi from '@/api/tripExtrasApi'
import * as albumApi from '@/api/albumApi'
import { formatDateRange, formatFullDate, timeAgo } from '@/utils/date'
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

// Instellingen van het boek: voor deelnemers bewaart de server ze voor de hele groep (usePhotobookEditor); dit
// toestel onthoudt ze ook, als startwaarde en voor kijkers van een openbare reis.
const SETTINGS_KEY = `photobook:${route.params.id}`
function storedSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}
  } catch {
    return {}
  }
}
const stored = storedSettings()
const format = ref(FORMAT_KEYS.includes(stored.format) ? stored.format : 'a4-landscape')
const perPage = ref(PHOTOS_PER_PAGE.includes(stored.perPage) ? stored.perPage : 2)
const includeText = ref(stored.includeText !== false)
/** Hoeveel foto's per dag: het boek kiest, tenzij je "alles" neemt. */
const density = ref(BOOK_DENSITY_KEYS.includes(stored.density) ? stored.density : 'normal')
watch([format, perPage, includeText, density], () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ format: format.value, perPage: perPage.value, includeText: includeText.value, density: density.value }))
  } catch {
    // geen storage: de keuze geldt dan alleen voor dit bezoek
  }
})

// Bewaard boek van de groep: aanpassingen, omslag en titel. Kijkers (geen deelnemer) bewaren niets.
const canEdit = computed(() => !!trip.value?.canEdit)
const editor = usePhotobookEditor({ tripId: route.params.id, canEdit, settings: { format, perPage, density, includeText } })
const saveLabel = computed(() => ({ saving: t('photobook.edit.saving'), saved: t('photobook.edit.saved'), error: t('photobook.edit.notSaved') })[editor.saveState.value] || '')

/** Alleen albumfoto's zijn aan te passen; foto's uit een dagboekupdate horen bij die tekst. */
const isAlbumPhoto = (p) => !!p?.uploadedByUserName
const albumPhotos = computed(() => photos.value.filter(isAlbumPhoto))
const byLikes = (a, b) => (b.likeCount || 0) - (a.likeCount || 0)

const formatInfo = computed(() => PHOTOBOOK_FORMATS[format.value])
const landscape = computed(() => formatInfo.value.orientation === 'landscape')

const days = computed(() => {
  if (!trip.value) return []
  return groupPhotobookDays(trip.value, photos.value, journal.value)
    .map((day) => {
      // Het boek kiest per dag (bijna-dubbels weg, gespreid over fotografen en stops); daarna de aanpassingen van
      // de groep: vastgezet/uitgesloten, de volgorde binnen de dag en de bijschriften van het boek.
      const o = editor.overrides.value
      const { chosen, skipped } = selectDayPhotos(day.photos, { max: BOOK_DENSITY[density.value], pinned: o.pinned, excluded: o.excluded })
      const inBook = new Set(chosen.map((p) => p.id))
      const selected = {
        ...day,
        photos: arrangeDayPhotos(chosen, o.order[day.date], o.captions),
        skipped,
        // Albumfoto's van die dag die niet in het boek staan (ook uitgesloten): te kiezen bij wisselen en toevoegen.
        unused: day.photos.filter((p) => isAlbumPhoto(p) && !inBook.has(p.id)).sort(byLikes),
      }
      return { ...selected, pages: dayPages(selected, { perPage: perPage.value, includeText: includeText.value, orientation: formatInfo.value.orientation }) }
    })
    .filter((day) => day.pages.length)
})
/** Omslag: de foto met de meeste hartjes van de groep; zonder hartjes de omslagfoto van de reis. */
const coverUrl = computed(() => {
  // Een gekozen omslag gaat voor; is die foto intussen uit het album, dan kiest de app weer.
  const picked = editor.coverPhotoId.value && photos.value.find((p) => p.id === editor.coverPhotoId.value)
  const cover = picked || pickCoverPhoto(photos.value)
  return cover ? resolveMediaUrl(cover.imageUrl) : trip.value?.coverImageUrl || ''
})
const bookTitle = computed(() => editor.title.value || trip.value?.title || '')
const bookSubtitle = computed(() => editor.subtitle.value || crewNames.value)

// ---------- bewerkmodus ----------
/** De gekozen foto: { day: 'yyyy-mm-dd', id }. */
const selection = ref(null)
const selectedDay = computed(() => (selection.value ? days.value.find((d) => d.date === selection.value.day) || null : null))
const selectedPhoto = computed(() => selectedDay.value?.photos.find((p) => p.id === selection.value.id) || null)
const isSelected = (p) => selection.value?.id === p.id
const isPinned = (p) => editor.overrides.value.pinned.includes(p.id)
/** Albumfoto's van een dag in de volgorde van het boek (dagboekfoto's doen niet mee aan de volgorde). */
const dayIds = (day) => (day?.photos || []).filter(isAlbumPhoto).map((p) => p.id)

function toggleEditing() {
  editor.editing.value = !editor.editing.value
  selection.value = null
}

function selectPhoto(day, p) {
  selection.value = isSelected(p) ? null : { day: day.date, id: p.id }
}

function change(next) {
  editor.overrides.value = next
}

const photoActions = computed(() => {
  const day = selectedDay.value
  const p = selectedPhoto.value
  if (!day || !p) return []
  const ids = dayIds(day)
  const index = ids.indexOf(p.id)
  const o = editor.overrides.value
  return [
    { key: 'earlier', icon: 'chevron-left', label: t('photobook.edit.earlier'), disabled: index <= 0, run: () => change(movePhoto(o, day.date, ids, p.id, -1)) },
    { key: 'later', icon: 'chevron-right', label: t('photobook.edit.later'), disabled: index < 0 || index >= ids.length - 1, run: () => change(movePhoto(o, day.date, ids, p.id, 1)) },
    { key: 'caption', icon: 'edit', label: t('photobook.edit.caption'), showLabel: true, run: openCaption },
    { key: 'swap', icon: 'refresh', label: t('photobook.edit.swap'), shortLabel: t('photobook.edit.swapShort'), showLabel: true, disabled: !day.unused.length, run: () => openPicker('swap', day) },
    isPinned(p)
      ? { key: 'unpin', icon: 'lock', label: t('photobook.edit.unpin'), run: () => change(setPinned(o, p.id, false)) }
      : { key: 'pin', icon: 'lock', label: t('photobook.edit.pin'), run: () => change(setPinned(o, p.id, true)) },
    { key: 'remove', icon: 'x', label: t('photobook.edit.remove'), danger: true, run: () => { change(excludePhoto(o, p.id)); selection.value = null } },
  ]
})

// Foto kiezen: wisselen, toevoegen aan een dag of een andere omslag.
const picker = reactive({ open: false, mode: 'swap', day: null })
function openPicker(mode, day = null) {
  Object.assign(picker, { mode, day: day?.date || null, open: true })
}
const pickerDay = computed(() => days.value.find((d) => d.date === picker.day) || null)
const pickerPhotos = computed(() => (picker.mode === 'cover' ? [...albumPhotos.value].sort(byLikes) : pickerDay.value?.unused || []))
const pickerTexts = computed(() => {
  const dayLabel = pickerDay.value ? formatFullDate(pickerDay.value.date) : ''
  if (picker.mode === 'cover') return { title: t('photobook.edit.coverTitle'), subtitle: t('photobook.edit.coverHint'), hint: '', confirm: t('photobook.edit.usePhoto') }
  if (picker.mode === 'add') return { title: t('photobook.edit.addTitle'), subtitle: dayLabel, hint: t('photobook.edit.pinHint'), confirm: t('photobook.edit.addConfirm') }
  return { title: t('photobook.edit.swapTitle'), subtitle: dayLabel, hint: t('photobook.edit.pinHint'), confirm: t('photobook.edit.usePhoto') }
})

function onPick(id) {
  const o = editor.overrides.value
  if (picker.mode === 'cover') {
    editor.coverPhotoId.value = id
    return
  }
  const day = pickerDay.value
  if (!day) return
  if (picker.mode === 'add') {
    change(addPhoto(o, day.date, dayIds(day), id))
  } else if (selection.value) {
    change(swapPhoto(o, day.date, dayIds(day), selection.value.id, id))
    selection.value = { day: day.date, id }
  }
}

// Bijschrift alleen voor het boek; het album blijft ongewijzigd.
const captionOpen = ref(false)
const captionDraft = ref('')
const hasBookCaption = computed(() => !!selection.value && Object.prototype.hasOwnProperty.call(editor.overrides.value.captions, selection.value.id))
function openCaption() {
  captionDraft.value = selectedPhoto.value?.caption || ''
  captionOpen.value = true
}
/** Zonder argument: de getypte tekst (leeg = geen bijschrift). Met null: terug naar het bijschrift van het album. */
function saveCaption(value) {
  if (!selection.value) return
  change(setCaption(editor.overrides.value, selection.value.id, value === null ? null : captionDraft.value))
  captionOpen.value = false
}
// ---- Groepspagina's (alleen deelnemers krijgen de gegevens; bezoekers van een openbare reis zien ze niet) ----
const extras = ref(null)
const extraHasContent = computed(() => visibleExtraPages({ crew: true, decisions: true, facts: true }, extras.value))
const extraPages = computed(() => visibleExtraPages(editor.overrides.value.pages, extras.value))
const crew = computed(() => crewRows(extras.value?.people, t).map((p) => ({ ...p, photoUrl: resolveMediaUrl(p.photoUrl) || '' })))
const decisions = computed(() => decisionRows(extras.value?.decisions, t))
const facts = computed(() => factRows(extras.value?.facts, t))
// Een grote groep (tot 30) moet op één pagina passen: meer kolommen en kleinere foto's.
const crewGrid = computed(() => {
  const n = crew.value.length
  const wide = landscape.value
  if (n <= (wide ? 8 : 9)) return { cols: wide ? 'grid-cols-4' : 'grid-cols-3', gap: 'gap-y-5', avatar: 64, name: 'text-sm' }
  if (n <= (wide ? 18 : 16)) return { cols: wide ? 'grid-cols-6' : 'grid-cols-4', gap: 'gap-y-3', avatar: 48, name: 'text-xs' }
  return { cols: wide ? 'grid-cols-8' : 'grid-cols-5', gap: 'gap-y-2', avatar: 36, name: 'text-[11px]' }
})

const chosenTotal = computed(() => days.value.reduce((n, d) => n + d.photos.length, 0))
const skippedTotal = computed(() => days.value.reduce((n, d) => n + d.skipped, 0))

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
  // Het bewaarde boek van de groep (alleen deelnemers hebben er een); daarna pas tonen, anders verspringt het boek.
  if (trip.value.canEdit) {
    const [, extrasResult] = await Promise.allSettled([editor.load(), photobookApi.getPhotobookExtras(id)])
    extras.value = extrasResult.status === 'fulfilled' ? extrasResult.value : null
  } else editor.ready.value = true
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

/* Tekstpagina's (groepspagina's) mogen op een smal scherm langer worden dan het papier; op papier geldt de vaste maat. */
@media screen and (max-width: 639px) {
  .pb-flow {
    aspect-ratio: auto;
    min-height: 14rem;
  }
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
