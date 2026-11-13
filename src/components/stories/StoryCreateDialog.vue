<template>
  <Modal :model-value="modelValue" :title="$t('stories.create.title')" :subtitle="$t('stories.create.subtitle')" size="md" @update:model-value="$emit('update:modelValue', $event)">
    <form id="story-form" class="space-y-4" @submit.prevent="submit">
      <!-- Foto -->
      <div>
        <label class="relative flex aspect-[4/5] max-h-[46vh] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line-strong bg-gray-50 text-muted transition hover:border-ink">
          <video v-if="video" :src="video.preview" :poster="imageUrl || undefined" class="absolute inset-0 h-full w-full object-cover" playsinline muted autoplay loop :aria-label="$t('stories.video.preview')" />
          <img v-else-if="imageUrl" :src="imageUrl" alt="" class="absolute inset-0 h-full w-full object-cover" />
          <span v-if="videoUploading" class="flex flex-col items-center gap-2 text-sm font-bold" role="status">
            <Spinner />
            {{ videoProcessing ? $t('posts.video.processing') : $t('posts.video.uploading', { percent: Math.round(videoProgress * 100) }) }}
          </span>
          <span v-else-if="!imageUrl" class="flex flex-col items-center gap-2 text-sm font-bold">
            <Spinner v-if="uploading" />
            <Icon v-else name="camera" :size="26" />
            {{ $t('stories.create.choosePhoto') }}
          </span>
          <span v-else class="absolute bottom-3 right-3 chip bg-ink text-surface">{{ $t('stories.create.changePhoto') }}</span>
          <input type="file" :accept="accept" class="sr-only" :disabled="videoUploading" @change="onFile" />
        </label>
        <label v-if="integrations.videoUploads && !videoUploading" class="btn btn-ghost btn-sm mt-2 cursor-pointer">
          <Icon name="video" :size="16" />
          {{ video ? $t('stories.video.change') : $t('stories.video.add') }}
          <input type="file" :accept="videoAccept" class="sr-only" @change="onVideoFile" />
        </label>
        <!-- Native app: rechtstreeks met de camera (de file-inputs hierboven blijven voor de galerij). -->
        <div v-if="canCapture && !videoUploading" class="mt-2 flex flex-wrap gap-2">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="uploading" @click="onCapturePhoto">
            <Icon name="camera" :size="16" />
            {{ $t('nativeApp.camera.takePhoto') }}
          </button>
          <button v-if="integrations.videoUploads && canRecord" type="button" class="btn btn-ghost btn-sm" @click="onRecordVideo">
            <Icon name="video" :size="16" />
            {{ $t('nativeApp.camera.recordVideo') }}
          </button>
        </div>
        <p v-if="uploadError || videoError" class="mt-1.5 text-sm font-semibold text-red-600">{{ uploadError || videoError }}</p>
      </div>

      <div>
        <label for="story-caption" class="label">{{ $t('stories.create.caption') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <textarea id="story-caption" v-model="caption" rows="2" maxlength="300" class="textarea" :placeholder="$t('stories.create.captionPlaceholder')" />
      </div>

      <div v-if="trips.length">
        <label for="story-trip" class="label">{{ $t('stories.create.trip') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <select id="story-trip" v-model="tripId" class="select">
          <option :value="null">{{ $t('stories.create.noTrip') }}</option>
          <option v-for="tr in trips" :key="tr.id" :value="tr.id">{{ tr.title }}</option>
        </select>
      </div>

      <!-- Locatie (opt-in) -->
      <div class="rounded-2xl border border-line p-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-extrabold text-ink">{{ $t('stories.create.shareLocation') }}</p>
            <p class="text-xs text-muted">{{ $t('stories.create.shareLocationHint') }}</p>
          </div>
          <Toggle :model-value="shareLocation" :label="$t('stories.create.shareLocation')" @update:model-value="onToggleLocation" />
        </div>
        <p v-if="locating" class="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-muted"><Spinner /> {{ $t('stories.create.locating') }}</p>
        <p v-else-if="locationError" class="mt-2 text-xs font-semibold text-red-600">{{ locationError }}</p>
        <div v-else-if="shareLocation && location" class="mt-3">
          <label for="story-place" class="label">{{ $t('stories.create.placeName') }}</label>
          <div class="relative">
            <Icon name="pin" :size="15" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="story-place" v-model.trim="placeName" class="input pl-9" maxlength="120" />
          </div>
        </div>
        <!-- Native app, reis bezig: de positie op de achtergrond blijven bijwerken (opt-in). -->
        <div v-if="canKeepLive && shareLocation && location" class="mt-3 flex items-start justify-between gap-3 border-t border-line pt-3">
          <div>
            <p class="text-sm font-extrabold text-ink">{{ $t('nativeApp.live.keepUpdating') }}</p>
            <p class="text-xs text-muted">{{ $t('nativeApp.live.keepUpdatingHint') }}</p>
          </div>
          <Toggle v-model="keepLive" :label="$t('nativeApp.live.keepUpdating')" />
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button type="submit" form="story-form" class="btn btn-primary" :disabled="!imageUrl || posting || uploading || videoUploading || locating">
        {{ posting ? $t('stories.create.posting') : $t('stories.create.submit') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import Toggle from '@/components/ui/Toggle.vue'
import * as storiesApi from '@/api/storiesApi'
import * as tripsApi from '@/api/tripsApi'
import * as geoApi from '@/api/geoApi'
import { useImageUpload } from '@/composables/useImageUpload'
import { useVideoUpload } from '@/composables/useVideoUpload'
import { useIntegrations } from '@/composables/useIntegrations'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { isNative } from '@/services/native'
import { isTripActive, startLiveTracking, trackingUntil } from '@/services/liveTracking'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Reis die vooraf geselecteerd staat (bv. vanuit de Vandaag-modus). */
  presetTripId: { type: String, default: null },
  /** Vooraf gevuld bij het openen (bv. "Delen naar ExploreMe"): het eerste bestand (foto of video) wordt geüpload. */
  initialFiles: { type: Array, default: () => [] },
  initialText: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'created'])

const { t } = useI18n()
const toast = useToastStore()
const { upload, uploading, error: uploadError, accept, canCapture, capture } = useImageUpload()
const {
  upload: uploadVideo,
  uploading: videoUploading,
  processing: videoProcessing,
  progress: videoProgress,
  error: videoError,
  accept: videoAccept,
  canRecord,
  record,
} = useVideoUpload()
const { status: integrations, load: loadIntegrations } = useIntegrations()

/** Bij een video-story is `imageUrl` de poster van de server. */
const imageUrl = ref('')
const video = ref(null) // { preview, url, durationSeconds }
const caption = ref('')
const tripId = ref(null)
const trips = ref([])
const shareLocation = ref(false)
const location = ref(null)
const placeName = ref('')
const locating = ref(false)
const locationError = ref('')
const posting = ref(false)
/** Native app: live locatie op de achtergrond blijven bijwerken (alleen bij een reis die nu bezig is). */
const keepLive = ref(false)
const selectedTrip = computed(() => trips.value.find((tr) => tr.id === tripId.value) || null)
const canKeepLive = computed(() => isNative && !!selectedTrip.value && isTripActive(selectedTrip.value))

watch(() => props.modelValue, async (open) => {
  if (!open) return
  const integrationsReady = loadIntegrations()
  imageUrl.value = ''
  clearVideo()
  caption.value = props.initialText.slice(0, 300)
  if (props.initialFiles[0]) applyInitialFile(props.initialFiles[0], integrationsReady)
  tripId.value = null
  shareLocation.value = false
  keepLive.value = false
  location.value = null
  placeName.value = ''
  locationError.value = ''
  try {
    // Alleen reizen die bezig zijn of nog komen: daar hoort een dagupdate bij.
    trips.value = await tripsApi.getUpcomingTrips(10)
    if (props.presetTripId && trips.value.some((tr) => tr.id === props.presetTripId)) tripId.value = props.presetTripId
  } catch {
    trips.value = []
  }
})

async function applyInitialFile(file, integrationsReady) {
  if ((file.type || '').startsWith('video/')) {
    const status = await integrationsReady
    if (status?.videoUploads) await setVideo(file)
    return
  }
  await setPhoto(file)
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  await setPhoto(file)
}

async function setPhoto(file) {
  const url = await upload(file)
  if (url) {
    clearVideo()
    imageUrl.value = url
  }
}

async function onCapturePhoto() {
  const file = await capture()
  if (file) await setPhoto(file)
}

async function onRecordVideo() {
  const file = await record()
  if (file) await setVideo(file)
}

async function onVideoFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  await setVideo(file)
}

async function setVideo(file) {
  if (!file) return
  const result = await uploadVideo(file)
  if (!result) return
  clearVideo()
  video.value = { preview: URL.createObjectURL(file), url: result.url, durationSeconds: result.durationSeconds }
  imageUrl.value = result.posterUrl
}

function clearVideo() {
  if (video.value) URL.revokeObjectURL(video.value.preview)
  video.value = null
}

onBeforeUnmount(clearVideo)

function onToggleLocation(value) {
  shareLocation.value = value
  locationError.value = ''
  if (!value) {
    location.value = null
    placeName.value = ''
    return
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    locationError.value = t('stories.create.locationUnsupported')
    shareLocation.value = false
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      location.value = { lat: pos.coords.latitude, lon: pos.coords.longitude }
      try {
        const place = await geoApi.reverseGeocode(location.value.lat, location.value.lon)
        placeName.value = (place?.name || place?.displayName || '').slice(0, 120)
      } catch {
        placeName.value = ''
      } finally {
        locating.value = false
      }
    },
    () => {
      locating.value = false
      shareLocation.value = false
      locationError.value = t('stories.create.locationFailed')
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  )
}

/** Volgen tot de story verloopt of de reis voorbij is, wat eerst komt. */
async function startLive(story) {
  const trip = selectedTrip.value
  const until = trackingUntil(story.expiresAtUtc, trip?.endDate)
  const started = until ? await startLiveTracking({ tripId: trip.id, tripTitle: trip.title, until }) : false
  if (started) toast.info(t('nativeApp.live.started'))
  else toast.error(t('nativeApp.live.failed'))
}

async function submit() {
  posting.value = true
  try {
    const withLocation = shareLocation.value && location.value
    const story = await storiesApi.createStory({
      imageUrl: imageUrl.value,
      caption: caption.value.trim() || null,
      tripId: tripId.value,
      latitude: withLocation ? location.value.lat : null,
      longitude: withLocation ? location.value.lon : null,
      placeName: withLocation ? placeName.value || null : null,
      videoUrl: video.value?.url || null,
      videoDurationSeconds: video.value?.durationSeconds ?? null,
    })
    toast.success(t('stories.create.posted'))
    if (withLocation && keepLive.value && canKeepLive.value) await startLive(story)
    emit('created', story)
    emit('update:modelValue', false)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    posting.value = false
  }
}
</script>
