<template>
  <Modal :model-value="modelValue" :title="$t('payQr.title')" :subtitle="suggestion ? $t('payQr.payTo', { name: payeeName }) : ''" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="suggestion" class="space-y-4">
      <!-- QR: altijd zwart op wit (ook in dark mode), anders lezen bank-apps hem niet betrouwbaar. -->
      <div v-if="showQr" class="flex flex-col items-center gap-2">
        <div class="rounded-2xl border border-line bg-white p-3 shadow-sm">
          <canvas ref="canvasRef" role="img" :aria-label="$t('payQr.qrAlt', { amount: amountLabel, name: payeeName })" class="block h-[220px] w-[220px]" />
        </div>
        <p v-if="qrError" class="text-center text-sm font-semibold text-red-600">{{ $t('payQr.qrError') }}</p>
        <p v-else class="text-center text-sm text-muted">{{ $t('payQr.scanHint') }}</p>
      </div>
      <p v-else class="flex gap-2 rounded-xl bg-gray-50 p-3 text-sm text-body">
        <Icon name="info" :size="16" class="mt-0.5 shrink-0 text-muted" />
        <span>{{ isEur ? $t('payQr.amountOutOfRange') : $t('payQr.notEur', { currency }) }}</span>
      </p>

      <dl class="divide-y divide-line rounded-xl border border-line text-sm">
        <div class="flex items-center gap-3 px-3 py-2.5">
          <dt class="w-28 shrink-0 font-semibold text-muted">{{ $t('payQr.name') }}</dt>
          <dd class="min-w-0 flex-1 break-words font-bold text-ink">{{ payeeName }}</dd>
        </div>
        <div class="flex items-center gap-3 px-3 py-2.5">
          <dt class="w-28 shrink-0 font-semibold text-muted">{{ $t('payQr.iban') }}</dt>
          <dd class="min-w-0 flex-1 break-all font-mono font-bold text-ink">{{ ibanLabel }}</dd>
          <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('payQr.copyIban')" :title="$t('payQr.copy')" @click="copyIban">
            <Icon :name="copied ? 'check' : 'copy'" :size="16" />
          </button>
        </div>
        <div class="flex items-center gap-3 px-3 py-2.5">
          <dt class="w-28 shrink-0 font-semibold text-muted">{{ $t('payQr.amount') }}</dt>
          <dd class="min-w-0 flex-1 font-extrabold tabular-nums text-ink">{{ amountLabel }}</dd>
        </div>
        <div class="flex items-center gap-3 px-3 py-2.5">
          <dt class="w-28 shrink-0 font-semibold text-muted">{{ $t('payQr.remittance') }}</dt>
          <dd class="min-w-0 flex-1 break-words text-body">{{ remittance }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('update:modelValue', false)">{{ $t('ui.close') }}</button>
      <button type="button" class="btn btn-dark" :disabled="busy" @click="emit('paid')">
        <Icon name="check" :size="15" /> {{ $t('payQr.markPaid') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/Modal.vue'
import Icon from '../ui/Icon.vue'
import { useToastStore } from '@/stores/toast'
import { formatCurrency } from '@/utils/date'
import { formatIban } from '@/utils/iban'
import { EPC_ERROR_CORRECTION, buildEpcPayload, epcRemittance, isEpcAmount } from '@/utils/epcQr'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Afrekensuggestie met `payToIban`, `payToName`, `toDisplayName` en `amount` (in de basisvaluta). */
  suggestion: { type: Object, default: null },
  /** Basisvaluta van het budget; alleen EUR krijgt een QR (EPC-standaard). */
  currency: { type: String, default: 'EUR' },
  tripTitle: { type: String, default: '' },
  /** True terwijl de terugbetaling geregistreerd wordt. */
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'paid'])

const { t } = useI18n()
const toast = useToastStore()

const QR_SIZE = 220
const COPIED_FEEDBACK_MS = 1500

const canvasRef = ref(null)
const qrError = ref(false)
const copied = ref(false)

const payeeName = computed(() => props.suggestion?.payToName || props.suggestion?.toDisplayName || '')
const ibanLabel = computed(() => formatIban(props.suggestion?.payToIban))
const amountLabel = computed(() => formatCurrency(props.suggestion?.amount ?? 0, props.currency))
const remittance = computed(() => epcRemittance(props.tripTitle))
const isEur = computed(() => props.currency === 'EUR')
const showQr = computed(() => isEur.value && isEpcAmount(props.suggestion?.amount))

async function renderQr() {
  qrError.value = false
  await nextTick()
  if (!canvasRef.value || !props.suggestion) return
  try {
    // Lazy laden: de QR-bibliotheek is alleen nodig wie effectief betaalt.
    const { default: QRCode } = await import('qrcode')
    const payload = buildEpcPayload({
      name: payeeName.value,
      iban: props.suggestion.payToIban,
      amount: props.suggestion.amount,
      remittance: remittance.value,
    })
    await QRCode.toCanvas(canvasRef.value, payload, {
      errorCorrectionLevel: EPC_ERROR_CORRECTION,
      margin: 2,
      width: QR_SIZE,
      color: { dark: '#000000', light: '#ffffff' },
    })
  } catch {
    qrError.value = true
  }
}

watch(() => [props.modelValue, props.suggestion, showQr.value], ([open]) => {
  copied.value = false
  if (open && showQr.value) renderQr()
}, { immediate: true })

async function copyIban() {
  try {
    await navigator.clipboard.writeText(props.suggestion?.payToIban || '')
    copied.value = true
    toast.success(t('payQr.copied'))
    setTimeout(() => { copied.value = false }, COPIED_FEEDBACK_MS)
  } catch {
    toast.error(t('payQr.copyFailed'))
  }
}
</script>
