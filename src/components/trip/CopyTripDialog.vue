<template>
  <Modal :model-value="modelValue" :title="$t('tripExtras.copy.title')" :subtitle="$t('tripExtras.copy.subtitle')" @update:model-value="$emit('update:modelValue', $event)">
    <form id="copy-trip-form" class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="copy-start" class="label">{{ $t('tripExtras.copy.startDate') }}</label>
        <input id="copy-start" v-model="startDate" type="date" class="input" required autofocus />
        <p class="hint">{{ $t('tripExtras.copy.endHint', { end: endLabel, days }) }}</p>
      </div>
      <div>
        <label for="copy-title" class="label">{{ $t('tripExtras.copy.name') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <input id="copy-title" v-model.trim="title" class="input" maxlength="120" :placeholder="trip.title" />
      </div>
      <p class="rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-body">{{ $t('tripExtras.copy.whatCopies') }}</p>
      <p v-if="error" class="text-sm font-semibold text-red-600">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button type="submit" form="copy-trip-form" class="btn btn-dark" :disabled="saving || !startDate">
        <Icon name="copy" :size="16" /> {{ saving ? $t('tripExtras.copy.saving') : $t('tripExtras.copy.confirm') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/Modal.vue'
import Icon from '../ui/Icon.vue'
import * as tripExtrasApi from '@/api/tripExtrasApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { addDays, dateInputToIso, formatDate, toDateInput, tripDays } from '@/utils/date'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  trip: { type: Object, required: true },
})
defineEmits(['update:modelValue'])

const router = useRouter()
const toast = useToastStore()
const { t } = useI18n()

const startDate = ref('')
const title = ref('')
const saving = ref(false)
const error = ref('')

const days = computed(() => tripDays(props.trip.startDate, props.trip.endDate))
const endLabel = computed(() => (startDate.value ? formatDate(addDays(startDate.value, days.value - 1), { day: 'numeric', month: 'long', year: 'numeric' }) : '—'))

// Bij openen: standaard over een maand starten, titel leeg (= titel van de bron).
watch(() => props.modelValue, (open) => {
  if (!open) return
  startDate.value = toDateInput(addDays(new Date(), 30))
  title.value = ''
  error.value = ''
})

async function submit() {
  if (saving.value || !startDate.value) return
  saving.value = true
  error.value = ''
  try {
    const copy = await tripExtrasApi.copyTrip(props.trip.id, { startDate: dateInputToIso(startDate.value), title: title.value || null })
    // Met overnachtingen eerst langs "Verblijven checken" (nieuwe data → nieuwe prijzen), anders meteen bewerken.
    if ((props.trip.stops || []).some((s) => s.type === 'Accommodation')) {
      toast.success(t('stays.copiedToast'))
      router.push({ path: `/trips/${copy.id}`, query: { tab: 'overzicht', stays: '1' } })
    } else {
      toast.success(t('tripExtras.copy.done'))
      router.push(`/trips/${copy.id}/edit`)
    }
  } catch (e) {
    error.value = errorMessage(e, t('tripExtras.copy.failed'))
  } finally {
    saving.value = false
  }
}
</script>
