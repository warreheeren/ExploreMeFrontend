<template>
  <div class="mx-auto max-w-2xl space-y-5">
    <!-- Schrijven -->
    <section v-if="canWrite" class="card card-pad sm:p-6">
      <button v-if="!composing" type="button" class="flex w-full items-center gap-3 text-left" @click="startCompose()">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-800"><Icon name="book" :size="18" /></span>
        <span class="flex-1">
          <span class="block text-sm font-extrabold text-ink">{{ $t('planning.journal.write') }}</span>
          <span class="block text-xs text-muted">{{ $t('planning.journal.writeHint') }}</span>
        </span>
        <Icon name="plus" :size="18" class="text-muted" />
      </button>
      <!-- Fase 6 (GPX-import): tocht importeren, standaard met dagboekentry -->
      <div v-if="!composing" class="mt-4 border-t border-line pt-4">
        <TrackImportButton :trip-id="trip.id" journal-default @imported="onTracksImported" />
      </div>

      <form v-else class="space-y-4" @submit.prevent="save">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div>
            <label for="j-date" class="label">{{ $t('planning.journal.day') }}</label>
            <input id="j-date" v-model="form.date" type="date" class="input" :min="toDateInput(trip.startDate)" :max="maxDate" required />
          </div>
          <div>
            <label for="j-title" class="label">{{ $t('planning.journal.titleLabel') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
            <input id="j-title" v-model.trim="form.title" class="input" maxlength="120" :placeholder="$t('planning.journal.titlePlaceholder')" />
          </div>
        </div>
        <div>
          <label for="j-text" class="label">{{ $t('planning.journal.text') }}</label>
          <textarea id="j-text" ref="textRef" v-model="form.text" rows="5" maxlength="5000" class="textarea" :placeholder="$t('planning.journal.textPlaceholder')" />
        </div>
        <div>
          <span class="label">{{ $t('planning.journal.mood') }}</span>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="m in MOODS" :key="m.key" type="button" class="chip-toggle" :class="form.mood === m.key ? 'chip-toggle-active' : ''" @click="form.mood = form.mood === m.key ? null : m.key">
              <span aria-hidden="true">{{ m.emoji }}</span> {{ $t(`planning.journal.moods.${m.key}`) }}
            </button>
          </div>
        </div>
        <div>
          <span class="label">{{ $t('planning.journal.photos') }}</span>
          <div class="flex flex-wrap gap-2">
            <div v-for="(url, i) in form.imageUrls" :key="url" class="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
              <img :src="thumbUrl(url)" alt="" class="h-full w-full object-cover" />
              <button type="button" class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white" :aria-label="$t('planning.journal.removePhoto')" @click="form.imageUrls.splice(i, 1)"><Icon name="x" :size="12" /></button>
            </div>
            <label v-if="form.imageUrls.length < 10" class="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line-strong text-muted hover:border-ink hover:text-ink">
              <Icon v-if="!uploading" name="camera" :size="20" />
              <span v-else class="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
              <input type="file" :accept="accept" multiple class="sr-only" :aria-label="$t('planning.journal.addPhoto')" @change="onFiles" />
            </label>
          </div>
          <p v-if="uploadError" class="hint text-red-600">{{ uploadError }}</p>
        </div>
        <AudioRecorder v-model="form.audio" @busy="audioBusy = $event" />
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" @click="composing = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn btn-dark" :disabled="!form.text.trim() || saving || uploading || audioBusy">{{ editingId ? $t('common.save') : $t('planning.journal.publish') }}</button>
        </div>
      </form>
    </section>

    <LoadingState v-if="loading"><div class="space-y-3"><div v-for="i in 2" :key="i" class="skeleton h-40 rounded-2xl" /></div></LoadingState>
    <EmptyState v-else-if="!entries.length" icon="book" :title="$t('planning.journal.emptyTitle')" :text="canWrite ? $t('planning.journal.emptyTextWriter') : $t('planning.journal.emptyText')" />

    <!-- Tijdlijn per dag -->
    <ol v-else class="relative space-y-6 border-l-2 border-line pl-6">
      <li v-for="group in groups" :key="group.date" class="relative">
        <span class="absolute -left-[33px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-accent-700 bg-surface" aria-hidden="true" />
        <p class="eyebrow-accent">{{ $t('planning.journal.dayN', { n: dayNumber(group.date) }) }} · {{ formatFullDate(group.date) }}</p>
        <article v-for="e in group.entries" :key="e.id" class="card mt-3 overflow-hidden">
          <div class="card-pad">
            <header class="flex items-start gap-3">
              <RouterLink :to="`/u/${e.authorUserName}`"><Avatar :src="e.authorProfilePhotoUrl" :name="e.authorDisplayName" size="sm" /></RouterLink>
              <div class="min-w-0 flex-1">
                <h3 v-if="e.title" class="text-base font-extrabold text-ink">{{ e.title }}</h3>
                <p class="text-xs font-semibold text-muted">
                  {{ e.authorDisplayName }} · {{ timeAgo(e.createdAtUtc) }}<template v-if="e.updatedAtUtc"> · {{ $t('planning.journal.edited') }}</template>
                  <template v-if="e.mood"> · {{ moodEmoji(e.mood) }} {{ $t(`planning.journal.moods.${e.mood}`) }}</template>
                </p>
              </div>
              <div v-if="e.canEdit" class="flex">
                <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.edit')" @click="startCompose(e)"><Icon name="edit" :size="15" /></button>
                <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('common.delete')" @click="remove(e)"><Icon name="trash" :size="15" /></button>
              </div>
            </header>
            <!-- Spraakmemo's worden niet offline bewaard: alleen afspelen als er verbinding is. -->
            <AudioPlayer v-if="e.audioUrl && online" :src="e.audioUrl" :duration-sec="e.audioDurationSec" class="mt-3" />
            <p v-else-if="e.audioUrl" class="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted"><Icon name="wifi-off" :size="13" /> {{ $t('voiceMemo.offlinePlayback') }}</p>
            <!-- Fase 6 (GPX-import): minikaart van de gekoppelde track -->
            <div v-if="e.track && online" class="mt-3 overflow-hidden rounded-xl border border-line">
              <TripMap :stops="[]" :tracks="[e.track]" :show-route="false" :interactive="false" height-class="h-40" :aria-label="$t('tracks.mapAria', { name: e.track.name })" />
            </div>
            <p v-if="e.track" class="mt-2 flex items-center gap-1.5 text-xs font-bold text-muted"><Icon name="route" :size="13" /> {{ trackStats(e.track) }}</p>
            <p class="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-body">{{ translations[e.id] ?? e.text }}</p>
            <TranslateButton
              v-if="e.authorUserName !== auth.userName"
              v-model="translations[e.id]"
              kind="journal"
              :id="e.id"
              :text="e.text"
              class="mt-1.5"
            />
          </div>
          <div v-if="e.imageUrls.length" class="grid gap-0.5" :class="e.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'">
            <a v-for="url in e.imageUrls" :key="url" :href="resolveMediaUrl(url)" target="_blank" rel="noopener" class="block bg-gray-100" :class="e.imageUrls.length === 1 ? 'aspect-[16/10]' : 'aspect-square'">
              <img :src="e.imageUrls.length === 1 ? url : thumbUrl(url)" alt="" class="h-full w-full object-cover" loading="lazy" />
            </a>
          </div>
        </article>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import TranslateButton from '@/components/TranslateButton.vue'
import AudioPlayer from '@/components/trip/AudioPlayer.vue'
import AudioRecorder from '@/components/trip/AudioRecorder.vue'
// Fase 6 (GPX-import)
import TripMap from '@/components/trip/TripMap.vue'
import TrackImportButton from '@/components/trip/TrackImportButton.vue'
import { trackStats } from '@/utils/tracks'
import { useOfflineTrips } from '@/composables/useOfflineTrips'
import { JOURNAL_MOODS as MOODS, moodEmoji } from '@/utils/journal'
import * as tripsApi from '@/api/tripsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useImageUpload } from '@/composables/useImageUpload'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { addDays, dateInputToIso, diffDays, formatFullDate, timeAgo, toDateInput } from '@/utils/date'
import { resolveMediaUrl, thumbUrl } from '@/utils/media'

const props = defineProps({
  trip: { type: Object, required: true },
  canWrite: { type: Boolean, default: false },
})
// Fase 6: de reisdetail ververst dan de tracks op de kaart.
const emit = defineEmits(['tracks-imported'])

function onTracksImported(e) {
  if (e.createJournal) load({ silent: true })
  emit('tracks-imported', e)
}

const { t } = useI18n()
const { online } = useOfflineTrips()
const audioBusy = ref(false)
const toast = useToastStore()
const auth = useAuthStore()
// Getoonde vertaling per dagboekupdate (id → tekst); ontbreekt = origineel.
const translations = reactive({})
const { upload, uploading, error: uploadError, accept } = useImageUpload()

const entries = ref([])
const loading = ref(true)
const composing = ref(false)
const saving = ref(false)
const editingId = ref(null)
const textRef = ref(null)
const form = reactive({ date: '', title: '', text: '', mood: null, imageUrls: [], audio: null })

const maxDate = computed(() => toDateInput(addDays(props.trip.endDate, 30)))

const groups = computed(() => {
  const map = new Map()
  for (const e of entries.value) {
    const key = toDateInput(e.date)
    if (!map.has(key)) map.set(key, { date: key, entries: [] })
    map.get(key).entries.push(e)
  }
  return [...map.values()]
})

function dayNumber(date) {
  return diffDays(props.trip.startDate, date) + 1
}

function defaultDate() {
  const today = toDateInput(new Date())
  const start = toDateInput(props.trip.startDate)
  return today >= start && today <= maxDate.value ? today : start
}

function startCompose(entry = null) {
  editingId.value = entry?.id || null
  Object.assign(form, {
    date: entry ? toDateInput(entry.date) : defaultDate(),
    title: entry?.title || '',
    text: entry?.text || '',
    mood: entry?.mood || null,
    imageUrls: [...(entry?.imageUrls || [])],
    audio: entry?.audioUrl ? { url: entry.audioUrl, durationSec: entry.audioDurationSec } : null,
  })
  audioBusy.value = false
  composing.value = true
  nextTick(() => {
    textRef.value?.focus()
    textRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

async function onFiles(e) {
  const files = [...(e.target.files || [])].slice(0, 10 - form.imageUrls.length)
  e.target.value = ''
  for (const file of files) {
    const url = await upload(file)
    if (url) form.imageUrls.push(url)
  }
}

async function save() {
  saving.value = true
  const payload = { date: dateInputToIso(form.date), title: form.title || null, text: form.text, imageUrls: form.imageUrls, mood: form.mood,
    audioUrl: form.audio?.url || null, audioDurationSec: form.audio?.durationSec ?? null }
  try {
    if (editingId.value) {
      const updated = await tripsApi.updateJournalEntry(props.trip.id, editingId.value, payload)
      entries.value = entries.value.map((x) => (x.id === updated.id ? updated : x))
    } else {
      const created = await tripsApi.addJournalEntry(props.trip.id, payload)
      entries.value = [created, ...entries.value]
      toast.success(t('planning.journal.published'))
    }
    sortEntries()
    composing.value = false
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function remove(entry) {
  const ok = await confirm({ title: t('planning.journal.deleteTitle'), message: entry.title || entry.text.slice(0, 80), confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await tripsApi.deleteJournalEntry(props.trip.id, entry.id)
    entries.value = entries.value.filter((x) => x.id !== entry.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

function sortEntries() {
  entries.value = [...entries.value].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAtUtc).localeCompare(String(a.createdAtUtc)))
}

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    entries.value = await tripsApi.getJournal(props.trip.id)
  } catch (e) {
    if (!silent) toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

const off = onRealtime('tripChanged', (p) => {
  if (p?.tripId === props.trip.id && p.area === 'journal') load({ silent: true })
})
onMounted(load)
onBeforeUnmount(off)
</script>
