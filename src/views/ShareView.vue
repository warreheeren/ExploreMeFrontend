<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="$t('shareTarget.title')" :subtitle="share ? $t('shareTarget.subtitle') : ''" />

    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div class="skeleton h-40 rounded-2xl" />
      <div class="skeleton h-24 rounded-2xl" />
    </div>

    <EmptyState v-else-if="!share" :icon="failed ? 'alert' : 'share'" :title="failed ? $t('shareTarget.errorTitle') : $t('shareTarget.missingTitle')" :text="failed ? $t('shareTarget.errorText') : $t('shareTarget.missingText')">
      <RouterLink to="/" class="btn btn-secondary btn-sm">{{ $t('shareTarget.toHome') }}</RouterLink>
    </EmptyState>

    <div v-else class="space-y-5">
      <!-- Voorbeeld van wat er gedeeld werd -->
      <section class="card card-pad space-y-3" aria-labelledby="share-preview-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="share-preview-title" class="eyebrow">{{ $t('shareTarget.preview') }}</h2>
          <span v-if="share.files.length" class="text-xs font-semibold text-muted">{{ $t('shareTarget.fileCount', { n: share.files.length }, share.files.length) }}</span>
        </div>

        <p v-if="text" class="whitespace-pre-line break-words text-sm leading-relaxed text-body">{{ text }}</p>

        <ul v-if="previews.length" class="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          <li v-for="p in previews" :key="p.key" class="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
            <img v-if="p.kind === 'image'" :src="p.url" :alt="p.name" class="h-full w-full object-cover" />
            <template v-else>
              <video :src="p.url" class="h-full w-full object-cover" muted playsinline preload="metadata" :aria-label="p.name" />
              <span class="absolute bottom-1.5 left-1.5 chip bg-ink text-surface"><Icon name="video" :size="12" /> {{ $t('shareTarget.video') }}</span>
            </template>
          </li>
        </ul>

        <ul v-if="documents.length" class="flex flex-wrap gap-2">
          <li v-for="(doc, i) in documents" :key="i" class="chip chip-muted h-7 max-w-full">
            <Icon name="file" :size="12" />
            <span class="truncate">{{ doc.name }}</span>
            <span class="shrink-0 font-semibold text-muted">{{ formatFileSize(doc.size) }}</span>
          </li>
        </ul>

        <p v-if="skippedCount" class="flex items-start gap-1.5 text-xs font-semibold text-muted">
          <Icon name="info" :size="14" class="mt-px shrink-0" />
          <span>
            {{ $t('shareTarget.skipped', { n: skippedCount }, skippedCount) }}
            <template v-if="videosWithoutSupport">{{ $t('shareTarget.skippedVideo') }}</template>
          </span>
        </p>
      </section>

      <!-- Stap 1: actie kiezen -->
      <section v-if="!mode" aria-labelledby="share-actions-title">
        <h2 id="share-actions-title" class="mb-3 text-sm font-bold text-ink">{{ $t('shareTarget.chooseAction') }}</h2>
        <p v-if="!actions.length" class="card card-pad text-sm text-muted">{{ $t('shareTarget.noActions') }}</p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li v-for="action in actions" :key="action.id">
            <button type="button" class="card card-pad flex h-full w-full items-start gap-3 text-left transition hover:border-ink focus-visible:border-ink" @click="choose(action.id)">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Icon :name="action.icon" :size="20" /></span>
              <span class="min-w-0">
                <span class="block font-extrabold text-ink">{{ $t(`shareTarget.actions.${action.id}.title`) }}</span>
                <span class="mt-0.5 block text-sm text-muted">{{ action.text }}</span>
              </span>
            </button>
          </li>
        </ul>
        <div class="mt-5 flex justify-center">
          <button type="button" class="btn btn-ghost btn-sm" @click="discard">
            <Icon name="trash" :size="16" /> {{ $t('shareTarget.discard') }}
          </button>
        </div>
      </section>

      <!-- Stap 2a: post -->
      <template v-else-if="mode === 'post'">
        <PostComposer :initial-files="postFiles" :initial-text="text" @created="onPostCreated" />
        <button type="button" class="btn btn-ghost btn-sm" @click="mode = null"><Icon name="arrow-left" :size="16" /> {{ $t('shareTarget.back') }}</button>
      </template>

      <!-- Stap 2b: reis kiezen (album of boeking) -->
      <section v-else-if="mode === 'album' || mode === 'booking'" class="card card-pad space-y-4" aria-labelledby="share-trip-title">
        <h2 id="share-trip-title" class="card-title">{{ $t(`shareTarget.actions.${mode}.title`) }}</h2>

        <div v-if="loadingTrips" class="skeleton h-11 rounded-xl" />
        <p v-else-if="tripsError" class="text-sm font-semibold text-red-600" role="alert">{{ $t('shareTarget.tripsFailed') }}</p>
        <p v-else-if="!trips.length" class="text-sm text-muted">
          {{ $t('shareTarget.noTrips') }} <RouterLink to="/trips/new" class="link">{{ $t('shareTarget.planTrip') }}</RouterLink>
        </p>
        <div v-else>
          <label for="share-trip" class="label">{{ $t('shareTarget.chooseTrip') }}</label>
          <select id="share-trip" v-model="tripId" class="select" :disabled="uploading || openingTrip">
            <option v-for="tr in trips" :key="tr.id" :value="tr.id">{{ tr.title }} · {{ formatDateRange(tr.startDate, tr.endDate) }}</option>
          </select>
        </div>

        <!-- Uploadvoortgang (album) -->
        <div v-if="uploading" role="status" aria-live="polite">
          <p class="mb-2 text-sm font-bold text-ink">{{ $t('album.uploading', { done: Math.min(progress.done + 1, progress.total), total: progress.total }) }}</p>
          <div class="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full rounded-full bg-accent-700 transition-[width] duration-200" :style="{ width: `${progressPercent}%` }" />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="uploading" @click="mode = null"><Icon name="arrow-left" :size="16" /> {{ $t('shareTarget.back') }}</button>
          <button v-if="mode === 'album'" type="button" class="btn btn-primary btn-sm" :disabled="!tripId || uploading" @click="addToAlbum">
            <Icon name="upload" :size="16" /> {{ $t('shareTarget.addPhotos', { n: albumFiles.length }, albumFiles.length) }}
          </button>
          <button v-else type="button" class="btn btn-primary btn-sm" :disabled="!tripId || openingTrip" @click="openBookingImport">
            <Icon name="sparkle" :size="16" /> {{ $t('shareTarget.continue') }}
          </button>
        </div>
      </section>
    </div>

    <StoryCreateDialog v-model="storyOpen" :initial-files="storyFiles" :initial-text="text.slice(0, 300)" @created="onStoryCreated" />
    <BookingImportDialog
      v-if="bookingTrip"
      v-model="bookingOpen"
      :trip="bookingTrip"
      :initial-files="bookingFiles"
      :initial-text="bookingFiles.length ? '' : text"
      @imported="onBookingImported"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import PostComposer from '@/components/PostComposer.vue'
import StoryCreateDialog from '@/components/stories/StoryCreateDialog.vue'
import BookingImportDialog from '@/components/trip/BookingImportDialog.vue'
import * as albumApi from '@/api/albumApi'
import * as tripsApi from '@/api/tripsApi'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'
import { clearShare, fileKind, loadShare, purgeExpiredShares, shareText } from '@/services/shareInbox'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useIntegrations } from '@/composables/useIntegrations'
import { useAiStatus } from '@/composables/useAiStatus'
import { errorMessage } from '@/utils/errors'
import { readPhotoMeta } from '@/utils/album'
import { formatDateRange } from '@/utils/date'
import { formatFileSize } from '@/utils/format'

/** Gelijk aan de limiet in TripAlbum.vue (de server controleert opnieuw). */
const ALBUM_MAX_MB = 25

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()
const { status: integrations, load: loadIntegrations } = useIntegrations()
const { status: aiStatus, load: loadAiStatus } = useAiStatus()

const loading = ref(true)
const failed = ref(false)
const share = ref(null)
const previews = ref([]) // { key, kind, url, name } met object-URL's voor foto's en video's
const mode = ref(null) // null | 'post' | 'album' | 'booking'

const storyOpen = ref(false)
const bookingOpen = ref(false)
const bookingTrip = ref(null)
const openingTrip = ref(false)

const trips = ref([])
const loadingTrips = ref(false)
const tripsError = ref(false)
const tripId = ref(null)

const uploading = ref(false)
const progress = ref({ done: 0, total: 0, current: 0 })
const progressPercent = computed(() => {
  const { done, total, current } = progress.value
  return total ? Math.round(((done + current) / total) * 100) : 0
})

const text = computed(() => shareText(share.value))
const files = computed(() => share.value?.files || [])
const byKind = (kind) => files.value.filter((f) => fileKind(f) === kind)
const images = computed(() => byKind('image'))
// Video's alleen als de server ze kan verwerken (ffmpeg, `videoUploads`).
const videos = computed(() => (integrations.value.videoUploads ? byKind('video') : []))
const documents = computed(() => [...byKind('pdf'), ...byKind('text')])
const videosWithoutSupport = computed(() => !integrations.value.videoUploads && byKind('video').length > 0)
const skippedCount = computed(() => files.value.length - images.value.length - videos.value.length - documents.value.length)
const media = computed(() => [...images.value, ...videos.value])

// Een post neemt foto's en hoogstens één video; een story precies één foto of video; het album alleen foto's.
const postFiles = computed(() => [...videos.value.slice(0, 1), ...images.value])
const storyFiles = computed(() => media.value.slice(0, 1))
const albumFiles = images
// Boekingsimport: liefst de PDF (tekst wordt eruit gehaald), anders een tekstbestand.
const bookingFiles = computed(() => {
  const pdf = byKind('pdf')[0]
  return pdf ? [pdf] : byKind('text').slice(0, 1)
})

/** Acties die bij de gedeelde inhoud passen; de rest blijft verborgen. */
const actions = computed(() => {
  const list = []
  if (media.value.length || text.value) list.push({ id: 'post', icon: 'edit', text: t('shareTarget.actions.post.text') })
  if (media.value.length === 1) list.push({ id: 'story', icon: 'camera', text: t('shareTarget.actions.story.text') })
  if (images.value.length) list.push({ id: 'album', icon: 'image', text: t('shareTarget.actions.album.text', { n: images.value.length }, images.value.length) })
  const bookingSource = bookingFiles.value.length || (text.value && !media.value.length)
  if (aiStatus.value.enabled && bookingSource) list.push({ id: 'booking', icon: 'ticket', text: t('shareTarget.actions.booking.text') })
  return list
})

async function load() {
  loading.value = true
  failed.value = route.query.error === '1'
  const id = typeof route.query.id === 'string' ? route.query.id : null
  try {
    // Status mee laden: die bepaalt welke bestanden en acties bruikbaar zijn.
    const [loaded] = await Promise.all([loadShare(route.query), loadIntegrations(), loadAiStatus()])
    share.value = loaded
  } catch {
    share.value = null
    failed.value = true
  } finally {
    loading.value = false
  }
  purgeExpiredShares({ keepId: id }).catch(() => {})
}

function buildPreviews() {
  revokePreviews()
  previews.value = media.value.map((file, i) => ({
    key: `${i}-${file.name}`,
    kind: fileKind(file),
    url: URL.createObjectURL(file),
    name: file.name,
  }))
}

function revokePreviews() {
  previews.value.forEach((p) => URL.revokeObjectURL(p.url))
  previews.value = []
}

watch(media, buildPreviews)

function choose(id) {
  if (id === 'story') {
    storyOpen.value = true
    return
  }
  mode.value = id
  if (id === 'album' || id === 'booking') loadTrips()
}

/** Reizen waar de gebruiker aan mag bijdragen: eigen reizen + reizen waar hij geaccepteerde reisgenoot is. */
async function loadTrips() {
  if (trips.value.length || loadingTrips.value) return
  loadingTrips.value = true
  tripsError.value = false
  try {
    const [own, shared] = await Promise.all([
      tripsApi.getUserTrips(auth.userName, 50),
      collaboratorsApi.getCollaboratingTrips(50).catch(() => []),
    ])
    const seen = new Set()
    trips.value = [...own, ...shared]
      .filter((tr) => (seen.has(tr.id) ? false : seen.add(tr.id)))
      .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
    tripId.value = trips.value[0]?.id ?? null
  } catch {
    tripsError.value = true
  } finally {
    loadingTrips.value = false
  }
}

/** Afgerond: de share opruimen en naar het resultaat. */
async function finish(target) {
  const id = share.value?.id
  if (id) await clearShare(id).catch(() => {})
  router.replace(target)
}

function onPostCreated(post) {
  finish(post?.id ? `/posts/${post.id}` : '/')
}

function onStoryCreated() {
  finish('/')
}

/** Zelfde stappen als TripAlbum.vue: EXIF lezen vóór de upload (de server strip metadata), uploaden, koppelen. */
async function addToAlbum() {
  const target = tripId.value
  const list = albumFiles.value
  if (!target || !list.length) return
  uploading.value = true
  progress.value = { done: 0, total: list.length, current: 0 }
  let added = 0
  for (const file of list) {
    if (file.size > ALBUM_MAX_MB * 1024 * 1024) {
      toast.error(t('album.tooLarge', { name: file.name, mb: ALBUM_MAX_MB }))
    } else {
      try {
        const meta = await readPhotoMeta(file)
        const imageUrl = await albumApi.uploadAlbumImage(file, (fraction) => { progress.value.current = fraction })
        await albumApi.addPhoto(target, { imageUrl, ...meta })
        added++
      } catch (e) {
        toast.error(errorMessage(e, t('album.uploadFailed', { name: file.name })))
      }
    }
    progress.value = { ...progress.value, done: progress.value.done + 1, current: 0 }
  }
  uploading.value = false
  if (!added) return
  toast.success(t('album.uploadDone', added))
  finish({ path: `/trips/${target}`, query: { tab: 'album' } })
}

/** De importdialoog heeft de volledige reis nodig (stops, basisvaluta). */
async function openBookingImport() {
  if (!tripId.value) return
  openingTrip.value = true
  try {
    bookingTrip.value = await tripsApi.getTripById(tripId.value)
    bookingOpen.value = true
  } catch (e) {
    toast.error(errorMessage(e, t('shareTarget.tripLoadFailed')))
  } finally {
    openingTrip.value = false
  }
}

function onBookingImported() {
  finish(`/trips/${bookingTrip.value.id}`)
}

async function discard() {
  const id = share.value?.id
  if (id) await clearShare(id).catch(() => {})
  toast.info(t('shareTarget.discarded'))
  router.replace('/')
}

// Een nieuwe share terwijl de pagina al open staat (zelfde route, andere query).
watch(() => route.fullPath, () => {
  if (route.name !== 'share-target') return
  mode.value = null
  storyOpen.value = false
  bookingOpen.value = false
  bookingTrip.value = null
  load()
})

onMounted(load)
onBeforeUnmount(revokePreviews)
</script>
