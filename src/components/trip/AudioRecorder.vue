<template>
  <div>
    <span class="label">{{ $t('voiceMemo.label') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></span>

    <!-- Al een opname gekoppeld -->
    <div v-if="modelValue?.url" class="flex items-center gap-2">
      <AudioPlayer :src="modelValue.url" :duration-sec="modelValue.durationSec" class="min-w-0 flex-1" />
      <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('voiceMemo.remove')" @click="emit('update:modelValue', null)">
        <Icon name="trash" :size="15" />
      </button>
    </div>

    <p v-else-if="!online" class="hint flex items-center gap-1.5"><Icon name="wifi-off" :size="14" /> {{ $t('voiceMemo.offline') }}</p>

    <!-- Opnemen -->
    <div v-else-if="rec.status.value === 'recording'" class="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/40" role="status" aria-live="polite">
      <span class="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
      <span class="text-sm font-bold tabular-nums text-ink">{{ formatClock(rec.elapsed.value) }} / {{ formatClock(rec.maxSeconds) }}</span>
      <span class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line" :aria-label="$t('voiceMemo.level')" role="meter" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(rec.level.value * 100)">
        <span class="block h-full rounded-full bg-red-600 transition-[width] duration-75" :style="{ width: `${Math.round(rec.level.value * 100)}%` }" />
      </span>
      <button type="button" class="btn btn-dark btn-sm shrink-0" @click="rec.stop()"><Icon name="stop" :size="14" :filled="true" /> {{ $t('voiceMemo.stop') }}</button>
    </div>

    <div v-else-if="uploading" class="flex items-center gap-2 text-sm text-muted" role="status">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" aria-hidden="true" />
      {{ $t('voiceMemo.uploading', { pct: Math.round(progress * 100) }) }}
    </div>

    <div v-else class="flex flex-wrap items-center gap-2">
      <button v-if="rec.supported" type="button" class="btn btn-secondary btn-sm" :disabled="rec.status.value === 'requesting'" @click="record">
        <Icon name="mic" :size="15" /> {{ $t('voiceMemo.record') }}
      </button>
      <label class="btn btn-ghost btn-sm cursor-pointer">
        <Icon name="upload" :size="15" /> {{ $t('voiceMemo.uploadFile') }}
        <input type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,.webm,.ogg,.m4a" class="sr-only" @change="onFile" />
      </label>
    </div>

    <p v-if="errorText" class="hint text-red-600">{{ errorText }}</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import AudioPlayer from '@/components/trip/AudioPlayer.vue'
import { uploadAudio } from '@/api/uploadApi'
import { useAudioRecorder } from '@/composables/useAudioRecorder'
import { useOfflineTrips } from '@/composables/useOfflineTrips'
import { errorMessage } from '@/utils/errors'
import { MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS, audioExtension, formatClock } from '@/utils/journal'

// v-model: { url, durationSec } of null. 'busy' meldt opnemen/uploaden, zodat het formulier dan niet bewaard wordt.
defineProps({
  modelValue: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'busy'])

const { t } = useI18n()
const { online } = useOfflineTrips()
const rec = useAudioRecorder()
const uploading = ref(false)
const progress = ref(0)
const uploadError = ref('')

const errorText = computed(() => uploadError.value || (rec.error.value ? t(`voiceMemo.errors.${rec.error.value}`) : ''))

watch(
  () => rec.status.value === 'recording' || rec.status.value === 'requesting' || uploading.value,
  (busy) => emit('busy', busy),
)

// Klaar met opnemen → meteen uploaden.
watch(rec.blob, (blob) => {
  if (blob) upload(blob, `memo.${audioExtension(blob.type)}`, Math.round(rec.elapsed.value))
})

async function record() {
  uploadError.value = ''
  await rec.start()
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  uploadError.value = ''
  if (file.size > MAX_AUDIO_BYTES) {
    uploadError.value = t('voiceMemo.errors.tooLarge')
    return
  }
  const duration = await fileDuration(file)
  if (duration > MAX_AUDIO_SECONDS + 1) {
    uploadError.value = t('voiceMemo.errors.tooLong')
    return
  }
  await upload(file, file.name, duration)
}

/** Duur uit de metadata van een gekozen bestand; 0 als de browser ze niet kent. */
function fileDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const done = (value) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(value) ? Math.round(value) : 0)
    }
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => done(audio.duration)
    audio.onerror = () => done(0)
    audio.src = url
  })
}

async function upload(blob, fileName, durationSec) {
  uploading.value = true
  progress.value = 0
  try {
    const result = await uploadAudio(blob, fileName, durationSec, (p) => { progress.value = p })
    emit('update:modelValue', { url: result.url, durationSec: result.durationSec || durationSec || null })
  } catch (e) {
    uploadError.value = errorMessage(e)
  } finally {
    uploading.value = false
    rec.reset()
  }
}
</script>
