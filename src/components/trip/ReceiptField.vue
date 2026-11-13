<template>
  <div>
    <span class="label">{{ $t('tripExtras.receipt.label') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></span>
    <input ref="fileRef" type="file" accept="image/*" class="sr-only" tabindex="-1" aria-hidden="true" @change="onFile" />

    <div v-if="modelValue" class="flex items-center gap-3 rounded-xl border border-line p-2">
      <a :href="resolveMediaUrl(modelValue)" target="_blank" rel="noopener" class="block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100" :aria-label="$t('tripExtras.receipt.open')">
        <img :src="preview || thumbUrl(resolveMediaUrl(modelValue))" alt="" class="h-full w-full object-cover" />
      </a>
      <div class="flex min-w-0 flex-1 flex-wrap gap-2">
        <button type="button" class="btn btn-secondary btn-sm" :disabled="scanning" @click="scan">
          <Icon name="search" :size="14" /> {{ $t('tripExtras.receipt.scan') }}
        </button>
        <button type="button" class="btn btn-ghost btn-sm" :disabled="busy" @click="fileRef?.click()">{{ $t('tripExtras.receipt.replace') }}</button>
        <button type="button" class="btn btn-danger-ghost btn-sm" :disabled="busy" @click="clear">{{ $t('tripExtras.receipt.remove') }}</button>
      </div>
    </div>
    <button v-else type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="fileRef?.click()">
      <Icon name="camera" :size="14" /> {{ uploading ? $t('tripExtras.receipt.uploading') : $t('tripExtras.receipt.add') }}
    </button>

    <!-- OCR-voortgang -->
    <div v-if="scanning" class="mt-2" role="status" aria-live="polite">
      <p class="text-xs font-semibold text-muted">{{ progressLabel }}</p>
      <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div class="h-full rounded-full bg-accent-700 transition-all" :style="{ width: `${Math.round(progress * 100)}%` }" />
      </div>
    </div>

    <!-- Voorstel om te bevestigen -->
    <div v-else-if="suggestion" class="mt-2 rounded-xl bg-accent-50 p-3 text-sm" role="status" aria-live="polite">
      <p class="font-bold text-ink">{{ $t('tripExtras.receipt.found') }}</p>
      <ul class="mt-1 space-y-0.5 text-body">
        <li v-if="suggestion.amount != null">{{ $t('tripExtras.receipt.amount') }}: <strong class="tabular-nums">{{ suggestion.amount.toFixed(2) }}</strong><template v-if="suggestion.currency"> {{ suggestion.currency }}</template></li>
        <li v-else-if="suggestion.currency">{{ $t('tripExtras.receipt.currency') }}: <strong>{{ suggestion.currency }}</strong></li>
        <li v-if="suggestion.date">{{ $t('tripExtras.receipt.date') }}: <strong>{{ formatLongDate(suggestion.date) }}</strong></li>
        <li v-if="suggestion.items?.length">{{ $t('tripExtras.receipt.lines', suggestion.items.length) }}</li>
      </ul>
      <div class="mt-2 flex gap-2">
        <button type="button" class="btn btn-primary btn-sm" @click="apply">{{ $t('tripExtras.receipt.apply') }}</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="suggestion = null">{{ $t('tripExtras.receipt.ignore') }}</button>
      </div>
    </div>
    <p v-else-if="message" class="hint">{{ message }}</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { uploadImage } from '@/api/uploadApi'
import { errorMessage } from '@/utils/errors'
import { resolveMediaUrl, thumbUrl } from '@/utils/media'
import { formatLongDate } from '@/utils/date'
import { parseReceiptLines, parseReceiptText } from '@/utils/receiptOcr'

const props = defineProps({
  /** URL van het kasticket (/uploads/...). */
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'apply'])

const { t } = useI18n()
const fileRef = ref(null)
const file = ref(null)
const preview = ref('')
const uploading = ref(false)
const scanning = ref(false)
const progress = ref(0)
const phase = ref('')
const suggestion = ref(null)
const message = ref('')

const busy = computed(() => uploading.value || scanning.value)
const progressLabel = computed(() => (phase.value === 'recognizing'
  ? t('tripExtras.receipt.reading', { percent: Math.round(progress.value * 100) })
  : t('tripExtras.receipt.loadingOcr')))

function revokePreview() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
}

async function onFile(event) {
  const selected = event.target.files?.[0]
  event.target.value = ''
  if (!selected) return
  suggestion.value = null
  message.value = ''
  uploading.value = true
  try {
    const url = await uploadImage(selected)
    revokePreview()
    file.value = selected
    preview.value = URL.createObjectURL(selected)
    emit('update:modelValue', url)
  } catch (e) {
    message.value = errorMessage(e, t('tripExtras.receipt.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

function clear() {
  revokePreview()
  file.value = null
  suggestion.value = null
  message.value = ''
  emit('update:modelValue', '')
}

/** OCR in de browser; tesseract.js (± enkele MB + taaldata) laden we pas wanneer erom gevraagd wordt. */
async function scan() {
  if (scanning.value) return
  scanning.value = true
  progress.value = 0
  phase.value = 'loading'
  suggestion.value = null
  message.value = ''
  let worker = null
  try {
    const { createWorker } = await import('tesseract.js')
    worker = await createWorker(['eng', 'nld'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          phase.value = 'recognizing'
          progress.value = m.progress || 0
        } else if (typeof m.progress === 'number') {
          progress.value = Math.min(0.95, m.progress)
        }
      },
    })
    const { data } = await worker.recognize(file.value || resolveMediaUrl(props.modelValue))
    const text = data?.text || ''
    const result = { ...parseReceiptText(text), items: parseReceiptLines(text) }
    if (result.amount == null && !result.date && !result.currency && !result.items.length) message.value = t('tripExtras.receipt.nothingFound')
    else suggestion.value = result
  } catch {
    message.value = t('tripExtras.receipt.scanFailed')
  } finally {
    scanning.value = false
    worker?.terminate().catch(() => {})
  }
}

function apply() {
  emit('apply', suggestion.value)
  suggestion.value = null
  message.value = t('tripExtras.receipt.applied')
}

onBeforeUnmount(revokePreview)
</script>
