<template>
  <Modal :model-value="modelValue" :title="title" :subtitle="$t('report.subtitle')" size="md" @update:model-value="$emit('update:modelValue', $event)">
    <form id="report-form" class="space-y-4" @submit.prevent="submit">
      <fieldset>
        <legend class="label">{{ $t('report.question') }}</legend>
        <div class="space-y-2">
          <label
            v-for="r in reasons"
            :key="r.value"
            class="flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold transition"
            :class="reason === r.value ? 'border-ink bg-gray-50 text-ink' : 'border-line text-body hover:border-line-strong'"
          >
            <input v-model="reason" type="radio" name="report-reason" :value="r.value" class="h-4 w-4 border-line-strong text-accent-700 focus:ring-accent-500" />
            {{ $t(`report.reasons.${r.key}`) }}
          </label>
        </div>
      </fieldset>
      <div>
        <label for="report-details" class="label">{{ $t('report.details') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <textarea id="report-details" v-model="details" rows="3" maxlength="1000" class="textarea" :placeholder="$t('report.detailsPlaceholder')" />
      </div>
      <p v-if="error" class="text-sm font-semibold text-red-600">{{ error }}</p>
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button type="submit" form="report-form" class="btn btn-dark" :disabled="!reason || sending">
        {{ sending ? $t('report.sending') : $t('report.send') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from './ui/Modal.vue'
import * as reportsApi from '@/api/reportsApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  targetType: { type: String, required: true }, // post | trip | user | comment
  targetId: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const toast = useToastStore()
const { t } = useI18n()

// De reden gaat als vaste (Nederlandse) tekst naar de API, zodat moderatie één vaste set waarden ziet;
// alleen het label is vertaald.
const reasons = [
  { value: 'Spam of reclame', key: 'spam' },
  { value: 'Ongepaste inhoud', key: 'inappropriate' },
  { value: 'Intimidatie of haat', key: 'harassment' },
  { value: 'Misleidende informatie', key: 'misleading' },
  { value: 'Iets anders', key: 'other' },
]

const reason = ref('')
const details = ref('')
const sending = ref(false)
const error = ref('')

const TARGET_TYPES = ['post', 'trip', 'user', 'comment', 'buddyPost', 'placeQuestion', 'placeAnswer', 'story', 'postcard']
const title = computed(() => t(`report.titles.${TARGET_TYPES.includes(props.targetType) ? props.targetType : 'content'}`))

watch(() => props.modelValue, (open) => {
  if (open) {
    reason.value = ''
    details.value = ''
    error.value = ''
  }
})

async function submit() {
  if (!reason.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await reportsApi.createReport({ targetType: props.targetType, targetId: props.targetId, reason: reason.value, details: details.value })
    toast.success(t('report.thanks'))
    emit('update:modelValue', false)
  } catch (e) {
    error.value = errorMessage(e, t('report.failed'))
  } finally {
    sending.value = false
  }
}
</script>
