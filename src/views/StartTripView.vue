<template>
  <div class="mx-auto max-w-lg">
    <PageHeader :title="again ? $t('startTrip.againTitle') : $t('startTrip.title')" :subtitle="$t('startTrip.subtitle')" back-to="/" :back-label="$t('myTrips.title')" />

    <form class="card card-pad space-y-5" novalidate @submit.prevent="create">
      <div>
        <label for="start-title" class="label">{{ $t('startTrip.name') }}</label>
        <input id="start-title" v-model.trim="form.title" class="input" maxlength="120" :placeholder="$t('startTrip.namePlaceholder')" required autofocus />
      </div>

      <fieldset>
        <legend class="label">{{ $t('startTrip.when') }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="option in ['known', 'unknown']"
            :key="option"
            type="button"
            class="rounded-2xl border p-3 text-left transition"
            :class="form.mode === option ? 'border-ink ring-1 ring-ink' : 'border-line-strong hover:border-ink'"
            :aria-pressed="form.mode === option"
            @click="form.mode = option"
          >
            <span class="block text-sm font-bold text-ink">{{ $t(`startTrip.${option}.label`) }}</span>
            <span class="block text-xs text-muted">{{ $t(`startTrip.${option}.hint`) }}</span>
          </button>
        </div>
      </fieldset>

      <!-- We weten de data -->
      <div v-if="form.mode === 'known'" class="grid grid-cols-2 gap-3">
        <div>
          <label for="start-from" class="label">{{ $t('startTrip.from') }}</label>
          <input id="start-from" v-model="form.start" type="date" class="input" required />
        </div>
        <div>
          <label for="start-to" class="label">{{ $t('startTrip.to') }}</label>
          <input id="start-to" v-model="form.end" type="date" class="input" :min="form.start" required />
        </div>
      </div>

      <!-- Weten we nog niet: de groep prikt een datum binnen een periode -->
      <div v-else class="space-y-3">
        <p class="text-sm text-muted">{{ $t('startTrip.unknown.explain') }}</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="start-range-from" class="label">{{ $t('startTrip.rangeFrom') }}</label>
            <input id="start-range-from" v-model="form.rangeStart" type="date" class="input" :min="today" required />
          </div>
          <div>
            <label for="start-range-to" class="label">{{ $t('startTrip.rangeTo') }}</label>
            <input id="start-range-to" v-model="form.rangeEnd" type="date" class="input" :min="form.rangeStart || today" required />
          </div>
        </div>
        <div>
          <label for="start-length" class="label">{{ $t('startTrip.length') }}</label>
          <input id="start-length" v-model.number="form.length" type="number" inputmode="numeric" min="1" :max="MAX_LENGTH" class="input w-28" required />
        </div>
      </div>

      <!-- Nog een keer: dezelfde groep uitnodigen -->
      <fieldset v-if="again && group.length" class="rounded-2xl border border-line p-3.5">
        <label class="flex items-start gap-2.5 text-sm text-body">
          <input v-model="form.inviteGroup" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-accent-700 focus:ring-accent-700" />
          <span>
            <span class="block font-bold text-ink">{{ $t('startTrip.inviteGroup', group.length) }}</span>
            <span class="block text-xs text-muted">{{ $t('startTrip.inviteGroupHint') }}</span>
          </span>
        </label>
        <ul v-if="form.inviteGroup" class="mt-3 flex flex-wrap gap-1.5">
          <li v-for="p in group" :key="p.userName">
            <PersonToggle :person="p" :pressed="form.invitees.includes(p.userName)" @toggle="toggleInvitee(p.userName)" />
          </li>
        </ul>
      </fieldset>

      <p v-if="error" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <RouterLink to="/trips/new" class="text-sm font-bold text-muted hover:text-ink hover:underline">{{ $t('startTrip.full') }}</RouterLink>
          <RouterLink v-if="ai.enabled" to="/trips/plan-ai" class="inline-flex items-center gap-1 text-sm font-bold text-accent-700 hover:underline"><Icon name="sparkle" :size="14" /> {{ $t('startTrip.ai') }}</RouterLink>
        </div>
        <button type="submit" class="btn btn-dark" :disabled="saving || !canSubmit">{{ saving ? $t('startTrip.creating') : $t('startTrip.create') }}</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import Icon from '@/components/ui/Icon.vue'
import PersonToggle from '@/components/trip/PersonToggle.vue'
import * as tripsApi from '@/api/tripsApi'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useAiStatus } from '@/composables/useAiStatus'
import { errorMessage } from '@/utils/errors'
import { dateInputToIso, toDateInput } from '@/utils/date'
import { datePollPlan, groupOf } from '@/utils/startTrip'

// Korte start van een groepsreis: een titel en óf de data óf een datumprikker. Daarna meteen de uitnodigingslink.
// De uitgebreide editor (/trips/new) blijft bestaan voor wie direct een route wil bouwen.
// Met ?again=<reis-id> ("Nog een keer?") staat de titel klaar en kan dezelfde groep uitgenodigd worden.
const MAX_LENGTH = 60

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const { t } = useI18n()
const { status: ai, load: loadAi } = useAiStatus()

const today = toDateInput(new Date())
const again = ref(null)
const group = ref([])
const form = reactive({ title: '', mode: 'known', start: '', end: '', rangeStart: '', rangeEnd: '', length: 4, inviteGroup: true, invitees: [] })
const saving = ref(false)
const error = ref('')

const canSubmit = computed(() => {
  if (!form.title) return false
  if (form.mode === 'known') return !!form.start && !!form.end && form.end >= form.start
  return !!form.rangeStart && !!form.rangeEnd && form.rangeEnd >= form.rangeStart && form.length >= 1 && form.length <= MAX_LENGTH
})

function toggleInvitee(userName) {
  form.invitees = form.invitees.includes(userName) ? form.invitees.filter((n) => n !== userName) : [...form.invitees, userName]
}

async function create() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = ''
  let trip = null
  try {
    const plan = form.mode === 'unknown' ? datePollPlan(form.rangeStart, form.rangeEnd, form.length) : null
    trip = await tripsApi.createTrip({
      title: form.title,
      description: '',
      coverImageUrl: null,
      country: '',
      startDate: dateInputToIso(plan ? plan.tripStart : form.start),
      endDate: dateInputToIso(plan ? plan.tripEnd : form.end),
      isPublic: false,
      stops: [],
    })
  } catch (e) {
    error.value = errorMessage(e)
    saving.value = false
    return
  }

  // De reis bestaat: wat hierna misgaat (prikker, uitnodigingen) mag de gebruiker niet terug naar het formulier sturen.
  const problems = []
  if (form.mode === 'unknown') {
    try {
      await tripsApi.openDatePoll(trip.id, { rangeStart: dateInputToIso(form.rangeStart), rangeEnd: dateInputToIso(form.rangeEnd), lengthDays: form.length })
    } catch (e) {
      problems.push(errorMessage(e, t('startTrip.pollFailed')))
    }
  }
  if (again.value && form.inviteGroup) {
    const results = await Promise.allSettled(form.invitees.map((userName) => collaboratorsApi.inviteCollaborator(trip.id, userName)))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed) problems.push(t('startTrip.invitesFailed', failed))
  }
  if (problems.length) toast.error(problems.join(' '))

  // ?invite=1: de reispagina opent meteen het venster met de uitnodigingslink.
  router.replace({ name: 'trip-detail', params: { id: trip.id }, query: { invite: '1' } })
}

onMounted(async () => {
  loadAi?.()
  const id = typeof route.query.again === 'string' ? route.query.again : ''
  if (!id) return
  try {
    const previous = await tripsApi.getTripById(id)
    again.value = previous
    form.title = previous.title
    group.value = groupOf(previous, auth.userName)
    form.invitees = group.value.map((p) => p.userName)
  } catch {
    // De oude reis is niet (meer) te lezen: dan is dit gewoon een nieuwe reis.
    again.value = null
  }
})
</script>
