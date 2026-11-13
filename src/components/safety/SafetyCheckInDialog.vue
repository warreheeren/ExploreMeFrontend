<template>
  <Modal :model-value="modelValue" :title="$t('safety.title')" :subtitle="$t('safety.intro')" size="md" @update:model-value="$emit('update:modelValue', $event)">
    <form id="safety-form" class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="safety-description" class="label">{{ $t('safety.form.description') }}</label>
        <textarea id="safety-description" v-model="description" rows="2" maxlength="500" required class="textarea" :placeholder="$t('safety.form.descriptionPlaceholder')" />
      </div>

      <!-- Deadline -->
      <div>
        <label for="safety-deadline" class="label">{{ $t('safety.form.deadline') }}</label>
        <input id="safety-deadline" v-model="deadline" type="datetime-local" required class="input" :min="minInput" :max="maxInput" />
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-semibold text-muted">{{ $t('safety.form.presets') }}</span>
          <button v-for="m in DEADLINE_PRESETS" :key="m" type="button" class="btn btn-secondary btn-sm" @click="usePreset(m)">{{ durationLabel(m) }}</button>
        </div>
        <p v-if="deadlineError" class="mt-1.5 text-sm font-semibold text-red-600">{{ $t(`safety.form.${deadlineError}`) }}</p>
      </div>

      <div>
        <label for="safety-grace" class="label">{{ $t('safety.form.grace') }}</label>
        <select id="safety-grace" v-model.number="grace" class="select">
          <option v-for="g in GRACE_OPTIONS" :key="g" :value="g">{{ $t('safety.form.graceOption', { n: g }) }}</option>
        </select>
      </div>

      <!-- Noodcontact -->
      <fieldset class="rounded-2xl border border-line p-3">
        <legend class="px-1 text-sm font-bold text-ink">{{ $t('safety.form.contact') }}</legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label for="safety-contact-name" class="label">{{ $t('safety.form.contactName') }}</label>
            <input id="safety-contact-name" v-model.trim="contactName" required maxlength="100" class="input" autocomplete="off" />
          </div>
          <div>
            <label for="safety-contact-email" class="label">{{ $t('safety.form.contactEmail') }}</label>
            <input id="safety-contact-email" v-model.trim="contactEmail" type="email" required maxlength="254" class="input" autocomplete="off" />
          </div>
        </div>
        <label class="mt-3 flex items-center gap-2 text-sm font-semibold text-body">
          <input v-model="saveDefault" type="checkbox" class="checkbox h-4 w-4" />
          {{ $t('safety.form.saveDefault') }}
        </label>
      </fieldset>

      <div v-if="trips.length">
        <label for="safety-trip" class="label">{{ $t('safety.form.trip') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <select id="safety-trip" v-model="tripId" class="select">
          <option :value="null">{{ $t('safety.form.noTrip') }}</option>
          <option v-for="tr in trips" :key="tr.id" :value="tr.id">{{ tr.title }}</option>
        </select>
        <p class="mt-1 text-xs text-muted">{{ $t('safety.form.tripHint') }}</p>
      </div>

      <p class="text-sm text-muted">{{ $t('safety.form.whatHappens', { name: contactName || $t('safety.form.yourContact') }) }}</p>
      <p class="flex items-start gap-2 rounded-2xl bg-gray-50 p-3 text-sm font-semibold text-ink">
        <Icon name="alert" :size="16" class="mt-0.5 shrink-0" />
        <span>{{ $t('safety.disclaimer') }}</span>
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button type="submit" form="safety-form" class="btn btn-primary" :disabled="submitting || !!deadlineError">
        <Icon name="shield" :size="16" /> {{ submitting ? $t('safety.starting') : $t('safety.start') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import * as safetyApi from '@/api/safetyApi'
import * as tripsApi from '@/api/tripsApi'
import { useSafetyStore } from '@/stores/safety'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import {
  DEADLINE_PRESETS, GRACE_OPTIONS, MAX_LEAD_HOURS, MIN_LEAD_MINUTES,
  browserTimeZone, fromLocalInput, toLocalInput, validateDeadline,
} from '@/utils/safety'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Reis die vooraf geselecteerd staat (bv. vanuit de Vandaag-modus). */
  presetTripId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'started'])

const { t } = useI18n()
const safety = useSafetyStore()
const toast = useToastStore()

const description = ref('')
const deadline = ref('')
const grace = ref(15)
const contactName = ref('')
const contactEmail = ref('')
const saveDefault = ref(false)
const tripId = ref(null)
const trips = ref([])
const submitting = ref(false)
// Ververst bij openen, zodat min/max en de validatie kloppen als de dialoog lang open blijft.
const now = ref(new Date())

const minInput = computed(() => toLocalInput(new Date(now.value.getTime() + MIN_LEAD_MINUTES * 60000)))
const maxInput = computed(() => toLocalInput(new Date(now.value.getTime() + MAX_LEAD_HOURS * 3600000)))
const deadlineError = computed(() => (deadline.value ? validateDeadline(fromLocalInput(deadline.value), now.value) : null))

function durationLabel(minutes) {
  return minutes < 60 ? t('safety.form.inMinutes', { n: minutes }) : t('safety.form.inHours', { n: minutes / 60 })
}

function usePreset(minutes) {
  now.value = new Date()
  deadline.value = toLocalInput(new Date(now.value.getTime() + minutes * 60000))
}

watch(() => props.modelValue, async (open) => {
  if (!open) return
  description.value = ''
  grace.value = 15
  saveDefault.value = false
  tripId.value = null
  usePreset(120)

  const [contact, upcoming] = await Promise.allSettled([safetyApi.getDefaultContact(), tripsApi.getUpcomingTrips(10)])
  const c = contact.status === 'fulfilled' ? contact.value : null
  contactName.value = c?.name || ''
  contactEmail.value = c?.email || ''
  saveDefault.value = !c?.email
  trips.value = upcoming.status === 'fulfilled' ? upcoming.value : []
  if (props.presetTripId && trips.value.some((tr) => tr.id === props.presetTripId)) tripId.value = props.presetTripId
})

async function submit() {
  now.value = new Date()
  const due = fromLocalInput(deadline.value)
  if (validateDeadline(due, now.value)) return

  submitting.value = true
  try {
    const created = await safety.start({
      description: description.value.trim(),
      dueAtUtc: due.toISOString(),
      emergencyContactName: contactName.value,
      emergencyContactEmail: contactEmail.value,
      tripId: tripId.value,
      graceMinutes: grace.value,
      timeZone: browserTimeZone(),
      saveAsDefaultContact: saveDefault.value,
    })
    toast.success(t('safety.started'))
    emit('started', created)
    emit('update:modelValue', false)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    submitting.value = false
  }
}
</script>
