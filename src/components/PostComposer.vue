<template>
  <section class="group card card-pad" :aria-label="$t('posts.newPost')">
    <div class="flex gap-3">
      <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" size="md" class="hidden sm:inline-flex" />
      <div class="min-w-0 flex-1">
        <MentionInput
          ref="captionRef"
          v-model="caption"
          multiline
          :rows="compact ? 1 : 2"
          :maxlength="2200"
          :placeholder="placeholder || $t('posts.composerPlaceholder')"
          :aria-label="$t('posts.captionLabel')"
          input-class="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-ink placeholder:text-muted focus:outline-none focus:ring-0"
        />

        <!-- Foto's -->
        <div v-if="images.length" class="mt-3 grid grid-cols-1 gap-2" :class="images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'">
          <div v-for="(img, i) in images" :key="img.preview" class="relative overflow-hidden rounded-xl bg-gray-100">
            <img :src="img.preview" alt="" class="h-32 w-full object-cover" :class="img.uploading ? 'opacity-60' : ''" />
            <span v-if="img.uploading" class="absolute inset-0 flex items-center justify-center"><Spinner :size="22" /></span>
            <button type="button" class="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80" :aria-label="$t('posts.removePhoto', { n: i + 1 })" @click="removeImage(i)">
              <Icon name="x" :size="14" />
            </button>
          </div>
        </div>

        <!-- Video -->
        <div v-if="video || videoUploading" class="relative mt-3 overflow-hidden rounded-xl bg-black">
          <video v-if="video" :src="video.preview" :poster="video.posterUrl || undefined" class="max-h-64 w-full object-contain" playsinline muted controls preload="metadata" :aria-label="$t('posts.video.preview')" />
          <div v-else class="flex h-32 flex-col items-center justify-center gap-2 text-sm font-bold text-white" role="status">
            <Spinner :size="22" />
            <span>{{ videoProcessing ? $t('posts.video.processing') : $t('posts.video.uploading', { percent: Math.round(videoProgress * 100) }) }}</span>
          </div>
          <button v-if="video" type="button" class="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80" :aria-label="$t('posts.video.remove')" @click="removeVideo">
            <Icon name="x" :size="14" />
          </button>
        </div>
        <p v-if="videoError" class="mt-2 text-sm font-semibold text-red-600">{{ videoError }}</p>

        <!-- Gekoppelde reis -->
        <div v-if="linkedTrip" class="mt-3 flex flex-wrap items-center gap-2">
          <span class="chip chip-accent max-w-full">
            <Icon name="pin" :size="13" />
            <span class="truncate">{{ linkedTrip.title }}</span>
            <button v-if="!presetTripId" type="button" class="-mr-1 rounded-full p-0.5 hover:bg-accent-100" :aria-label="$t('posts.unlinkTrip')" @click="unlinkTrip">
              <Icon name="x" :size="12" />
            </button>
          </span>
          <select v-if="tripStops.length" v-model="stopId" class="h-7 rounded-full border border-line-strong bg-surface px-3 text-xs font-bold text-body focus:border-accent-700 focus:outline-none" :aria-label="$t('posts.chooseStop')">
            <option :value="null">{{ $t('posts.wholeTrip') }}</option>
            <option v-for="s in tripStops" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>

        <p v-if="error" class="mt-2 text-sm font-semibold text-red-600">{{ error }}</p>

        <!-- Werkbalk -->
        <!-- Compact (tijdlijn): de werkbalk verschijnt pas bij focus of zodra er inhoud is. -->
        <div class="mt-3 items-center gap-1 border-t border-line pt-3" :class="compact && !hasDraft ? 'hidden group-focus-within:flex' : 'flex'">
          <label class="btn btn-ghost btn-sm cursor-pointer">
            <Icon name="image" :size="16" />
            {{ $t('posts.photos') }}
            <input type="file" :accept="accept" multiple class="sr-only" @change="onFiles" />
          </label>

          <!-- Op mobiel biedt de bestandskiezer zelf "video opnemen" aan; geen `capture`, anders kan je niet uit je galerij kiezen. -->
          <label v-if="integrations.videoUploads && !video && !videoUploading" class="btn btn-ghost btn-sm cursor-pointer">
            <Icon name="video" :size="16" />
            {{ $t('posts.video.add') }}
            <input type="file" :accept="videoAccept" class="sr-only" @change="onVideoFile" />
          </label>

          <div v-if="!presetTripId" v-click-outside="() => (pickerOpen = false)" class="relative">
            <button type="button" class="btn btn-ghost btn-sm" :aria-expanded="pickerOpen" @click="togglePicker">
              <Icon name="pin" :size="16" />
              {{ $t('posts.trip') }}
            </button>
            <div v-if="pickerOpen" class="menu left-0 top-full mt-1 w-72">
              <p class="eyebrow px-4 pb-1 pt-1.5">{{ $t('posts.linkToTrip') }}</p>
              <div v-if="loadingTrips" class="flex justify-center py-4"><Spinner /></div>
              <p v-else-if="!myTrips.length" class="px-4 py-3 text-sm text-muted">
                {{ $t('posts.noTrips') }} <RouterLink to="/trips/new" class="link">{{ $t('posts.planOne') }}</RouterLink>.
              </p>
              <div v-else class="max-h-64 overflow-y-auto">
                <button v-for="t in myTrips" :key="t.id" type="button" class="menu-item" @click="linkTrip(t)">
                  <Icon name="map" :size="16" />
                  <span class="min-w-0">
                    <span class="block truncate font-bold text-ink">{{ t.title }}</span>
                    <span class="block text-xs font-medium text-muted">{{ formatDateRange(t.startDate, t.endDate) }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <span v-if="caption.length > 1800" class="ml-2 text-xs font-semibold text-muted">{{ 2200 - caption.length }}</span>

          <button type="button" class="btn btn-dark btn-sm ml-auto px-5" :disabled="!canPost" @click="submit">
            {{ posting ? $t('posts.posting') : $t('posts.post') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from './ui/Avatar.vue'
import Icon from './ui/Icon.vue'
import Spinner from './ui/Spinner.vue'
import MentionInput from './MentionInput.vue'
import * as postsApi from '@/api/postsApi'
import * as tripsApi from '@/api/tripsApi'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useImageUpload } from '@/composables/useImageUpload'
import { useVideoUpload } from '@/composables/useVideoUpload'
import { useIntegrations } from '@/composables/useIntegrations'
import { errorMessage } from '@/utils/errors'
import { formatDateRange } from '@/utils/date'

const props = defineProps({
  presetTripId: { type: String, default: null },
  presetTripTitle: { type: String, default: '' },
  // Leeg = standaardtekst uit de vertalingen.
  placeholder: { type: String, default: '' },
  /** Vooraf gevuld (bv. "Delen naar ExploreMe"): foto's en hoogstens één video worden bij het mounten geüpload. */
  initialFiles: { type: Array, default: () => [] },
  initialText: { type: String, default: '' },
  /** Eén regel hoog tot je erin klikt: houdt de tijdlijn bovenaan compact. */
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['created'])

const auth = useAuthStore()
const toast = useToastStore()
const { t } = useI18n()
const { upload, accept } = useImageUpload()
const {
  upload: uploadVideo,
  uploading: videoUploading,
  processing: videoProcessing,
  progress: videoProgress,
  error: videoError,
  accept: videoAccept,
} = useVideoUpload()
const { status: integrations, load: loadIntegrations } = useIntegrations()

/** Foto's + video samen; een video neemt één plek in. */
const MAX_MEDIA = 10

const captionRef = ref(null)
const caption = ref(props.initialText.slice(0, 2200))
const images = ref([]) // { preview, url, uploading }
const video = ref(null) // { preview, url, posterUrl, durationSeconds }
const posting = ref(false)
const error = ref('')

const pickerOpen = ref(false)
const loadingTrips = ref(false)
const myTrips = ref([])
const linkedTrip = ref(props.presetTripId ? { id: props.presetTripId, title: props.presetTripTitle } : null)
const tripStops = ref([])
const stopId = ref(null)

const uploadingAny = computed(() => videoUploading.value || images.value.some((i) => i.uploading))
// Er staat al iets klaar (tekst, media of een zelf gekozen reis): de werkbalk blijft dan zichtbaar.
const hasDraft = computed(() => !!caption.value || images.value.length > 0 || !!video.value || videoUploading.value || (!!linkedTrip.value && !props.presetTripId))
const canPost = computed(() => !posting.value && !uploadingAny.value && (caption.value.trim() || images.value.some((i) => i.url) || !!video.value))

async function onFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  await addImages(files)
}

async function addImages(files) {
  error.value = ''
  const room = MAX_MEDIA - images.value.length - (video.value || videoUploading.value ? 1 : 0)
  for (const file of files.slice(0, Math.max(0, room))) {
    const item = { preview: URL.createObjectURL(file), url: null, uploading: true }
    images.value.push(item)
    const url = await upload(file)
    const live = images.value.find((i) => i.preview === item.preview)
    if (!live) continue
    if (url) {
      live.url = url
      live.uploading = false
    } else {
      images.value = images.value.filter((i) => i.preview !== item.preview)
      URL.revokeObjectURL(item.preview)
      error.value = t('posts.uploadFailed')
    }
  }
}

function removeImage(index) {
  const [removed] = images.value.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.preview)
}

async function onVideoFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  await addVideo(file)
}

async function addVideo(file) {
  if (!file) return
  const result = await uploadVideo(file)
  if (!result) return
  // Lokale preview (blob:) speelt meteen; de server-poster als stilstaand beeld.
  video.value = { preview: URL.createObjectURL(file), url: result.url, posterUrl: result.posterUrl, durationSeconds: result.durationSeconds }
}

function removeVideo() {
  if (video.value) URL.revokeObjectURL(video.value.preview)
  video.value = null
}

async function togglePicker() {
  pickerOpen.value = !pickerOpen.value
  if (!pickerOpen.value || myTrips.value.length || loadingTrips.value) return
  loadingTrips.value = true
  try {
    const [own, shared] = await Promise.all([
      tripsApi.getUserTrips(auth.userName, 50),
      collaboratorsApi.getCollaboratingTrips(50).catch(() => []),
    ])
    const seen = new Set()
    myTrips.value = [...own, ...shared]
      .filter((t) => (seen.has(t.id) ? false : seen.add(t.id)))
      .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
  } catch {
    myTrips.value = []
  } finally {
    loadingTrips.value = false
  }
}

async function loadStops(tripId) {
  tripStops.value = []
  try {
    const trip = await tripsApi.getTripById(tripId)
    tripStops.value = trip.stops || []
    if (!linkedTrip.value?.title) linkedTrip.value = { id: trip.id, title: trip.title }
  } catch {
    tripStops.value = []
  }
}

function linkTrip(trip) {
  linkedTrip.value = { id: trip.id, title: trip.title }
  stopId.value = null
  pickerOpen.value = false
  loadStops(trip.id)
}

function unlinkTrip() {
  linkedTrip.value = null
  tripStops.value = []
  stopId.value = null
}

async function submit() {
  if (!canPost.value) return
  posting.value = true
  error.value = ''
  try {
    const created = await postsApi.createPost({
      caption: caption.value.trim(),
      imageUrls: images.value.map((i) => i.url).filter(Boolean),
      tripId: linkedTrip.value?.id || null,
      tripStopId: linkedTrip.value ? stopId.value : null,
      videoUrl: video.value?.url || null,
      videoDurationSeconds: video.value?.durationSeconds ?? null,
    })
    images.value.forEach((i) => URL.revokeObjectURL(i.preview))
    caption.value = ''
    images.value = []
    removeVideo()
    if (!props.presetTripId) unlinkTrip()
    else stopId.value = null
    emit('created', created)
    toast.success(t('posts.published'))
  } catch (e) {
    error.value = errorMessage(e, t('posts.postFailed'))
  } finally {
    posting.value = false
  }
}

watch(() => props.presetTripId, (id) => {
  if (id) {
    linkedTrip.value = { id, title: props.presetTripTitle }
    loadStops(id)
  }
})

onMounted(() => {
  if (props.presetTripId) loadStops(props.presetTripId)
  // Video-knop alleen als de server ffmpeg heeft (`videoUploads`).
  const integrationsReady = loadIntegrations()
  if (props.initialFiles.length) addInitialFiles(integrationsReady)
})

/** Vooraf meegegeven bestanden: eerst de video (telt mee voor MAX_MEDIA), daarna de foto's. */
async function addInitialFiles(integrationsReady) {
  const files = props.initialFiles.filter(Boolean)
  const firstVideo = files.find((f) => (f.type || '').startsWith('video/'))
  const photos = files.filter((f) => !(f.type || '').startsWith('video/'))
  if (firstVideo) {
    const status = await integrationsReady
    if (status?.videoUploads) await addVideo(firstVideo)
  }
  if (photos.length) await addImages(photos)
}

onBeforeUnmount(() => {
  images.value.forEach((i) => URL.revokeObjectURL(i.preview))
  removeVideo()
})

defineExpose({ focus: () => captionRef.value?.focus() })
</script>
