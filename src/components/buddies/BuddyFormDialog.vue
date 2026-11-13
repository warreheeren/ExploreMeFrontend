<template>
  <Modal :model-value="modelValue" :title="post ? $t('buddies.form.editTitle') : $t('buddies.form.newTitle')" size="md" @update:model-value="$emit('update:modelValue', $event)">
    <form id="buddy-form" class="space-y-4" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="buddy-country" class="label">{{ $t('buddies.form.country') }}</label>
          <input id="buddy-country" v-model.trim="form.country" class="input" list="buddy-country-list" maxlength="80" :placeholder="$t('buddies.form.countryPlaceholder')" required autofocus />
          <datalist id="buddy-country-list">
            <option v-for="c in countries" :key="c" :value="c" />
          </datalist>
        </div>
        <div>
          <label for="buddy-region" class="label">{{ $t('buddies.form.region') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
          <input id="buddy-region" v-model.trim="form.region" class="input" maxlength="80" :placeholder="$t('buddies.form.regionPlaceholder')" />
        </div>
        <div>
          <label for="buddy-start" class="label">{{ $t('buddies.form.start') }}</label>
          <input id="buddy-start" v-model="form.start" type="date" class="input" :min="today" required />
        </div>
        <div>
          <label for="buddy-end" class="label">{{ $t('buddies.form.end') }}</label>
          <input id="buddy-end" v-model="form.end" type="date" class="input" :min="form.start || today" required />
        </div>
      </div>
      <div>
        <label for="buddy-desc" class="label">{{ $t('buddies.form.description') }}</label>
        <textarea id="buddy-desc" v-model="form.description" rows="4" maxlength="1000" class="textarea" :placeholder="$t('buddies.form.descriptionPlaceholder')" required />
      </div>
      <div v-if="trips.length">
        <label for="buddy-trip" class="label">{{ $t('buddies.form.trip') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <select id="buddy-trip" v-model="form.tripId" class="select" @change="fillFromTrip">
          <option :value="null">{{ $t('buddies.form.noTrip') }}</option>
          <option v-for="t in trips" :key="t.id" :value="t.id">{{ t.title }} · {{ formatDateRange(t.startDate, t.endDate) }}</option>
        </select>
      </div>
      <p v-if="error" class="text-sm font-semibold text-red-600">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button type="submit" form="buddy-form" class="btn btn-dark" :disabled="saving || !form.country || !form.start || !form.end || !form.description.trim()">
        {{ saving ? $t('common.saving') : post ? $t('common.save') : $t('buddies.form.submit') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import * as buddiesApi from '@/api/buddiesApi'
import * as tripsApi from '@/api/tripsApi'
import { useToastStore } from '@/stores/toast'
import { countryNames, splitCountries } from '@/utils/countries'
import { dateInputToIso, formatDateRange, toDateInput, todayDateOnly } from '@/utils/date'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Bestaande oproep om te bewerken; leeg = nieuwe oproep. */
  post: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const toast = useToastStore()
const countries = countryNames()
const today = toDateInput(todayDateOnly())
const trips = ref([])
const saving = ref(false)
const error = ref('')
const form = reactive({ country: '', region: '', start: '', end: '', description: '', tripId: null })

async function loadTrips() {
  try {
    trips.value = await tripsApi.getUpcomingTrips(20)
  } catch {
    trips.value = []
  }
}

/** Een gekoppelde reis vult land en datums in zolang die nog leeg zijn. */
function fillFromTrip() {
  const trip = trips.value.find((x) => x.id === form.tripId)
  if (!trip) return
  if (!form.country) form.country = splitCountries(trip.country)[0] || ''
  if (!form.start) form.start = toDateInput(trip.startDate)
  if (!form.end) form.end = toDateInput(trip.endDate)
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  error.value = ''
  Object.assign(form, {
    country: props.post?.country || '',
    region: props.post?.region || '',
    start: props.post ? toDateInput(props.post.startDate) : '',
    end: props.post ? toDateInput(props.post.endDate) : '',
    description: props.post?.description || '',
    tripId: props.post?.tripId || null,
  })
  loadTrips()
})

async function submit() {
  if (form.end < form.start) {
    error.value = t('buddies.form.invalidDates')
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = {
      country: form.country,
      region: form.region || null,
      startDate: dateInputToIso(form.start),
      endDate: dateInputToIso(form.end),
      description: form.description.trim(),
      tripId: form.tripId || null,
    }
    const saved = props.post ? await buddiesApi.updateBuddyPost(props.post.id, payload) : await buddiesApi.createBuddyPost(payload)
    toast.success(props.post ? t('buddies.form.saved') : t('buddies.form.created'))
    emit('saved', saved)
    emit('update:modelValue', false)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>
