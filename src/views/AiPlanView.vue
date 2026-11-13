<template>
  <div>
    <PageHeader :title="$t('ai.title')" :subtitle="$t('ai.subtitle')" back-to="/trips" />

    <div v-if="!aiLoaded" class="space-y-3" aria-busy="true"><div class="skeleton h-48 rounded-2xl" /></div>

    <EmptyState v-else-if="!aiStatus.enabled" icon="sparkle" :title="$t('ai.disabledTitle')" :text="$t('ai.disabledText')">
      <RouterLink to="/trips/new" class="btn btn-secondary btn-sm">{{ $t('trips.list.newTrip') }}</RouterLink>
    </EmptyState>

    <!-- Stap 1: wensen beschrijven -->
    <form v-else-if="!draft" class="card card-pad space-y-5 sm:p-6" @submit.prevent="generate">
      <div>
        <label for="ai-prompt" class="label">{{ $t('ai.promptLabel') }}</label>
        <textarea
          id="ai-prompt"
          v-model="prompt"
          rows="4"
          maxlength="1000"
          class="textarea"
          :placeholder="$t('ai.promptPlaceholder')"
          :disabled="generating"
          autofocus
        />
      </div>

      <div>
        <p class="eyebrow mb-2">{{ $t('ai.examplesTitle') }}</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="key in EXAMPLES" :key="key" type="button" class="chip-toggle h-auto min-h-7 whitespace-normal py-1 text-left" :disabled="generating" @click="prompt = $t(`ai.examples.${key}`)">
            {{ $t(`ai.examples.${key}`) }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="ai-days" class="label">{{ $t('ai.days') }}</label>
          <select id="ai-days" v-model="days" class="select" :disabled="generating">
            <option :value="null">{{ $t('ai.daysAuto') }}</option>
            <option v-for="n in MAX_DAYS" :key="n" :value="n">{{ $t('ai.daysOption', n) }}</option>
          </select>
        </div>
        <div>
          <label for="ai-start" class="label">{{ $t('ai.startDate') }}</label>
          <input id="ai-start" v-model="startDate" type="date" class="input" :min="todayInput" :disabled="generating" />
        </div>
      </div>

      <div class="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs font-semibold text-muted">
          {{ aiStatus.remainingToday > 0 ? $t('ai.remaining', aiStatus.remainingToday) : $t('ai.limitReached') }}
        </p>
        <button type="submit" class="btn btn-primary" :disabled="generating || prompt.trim().length < 3 || aiStatus.remainingToday <= 0">
          <Spinner v-if="generating" :size="16" />
          <Icon v-else name="sparkle" :size="16" />
          {{ generating ? $t('ai.generating') : $t('ai.generate') }}
        </button>
      </div>
      <p v-if="generating" class="text-sm text-muted" role="status">{{ $t('ai.generatingHint') }}</p>
    </form>

    <!-- Stap 2: voorstel bekijken en aanpassen -->
    <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <section class="card card-pad min-w-0 space-y-5 sm:p-6" :aria-label="$t('ai.preview')">
        <div>
          <p class="eyebrow-accent mb-2">{{ $t('ai.preview') }}</p>
          <label for="ai-title" class="sr-only">{{ $t('ai.titleLabel') }}</label>
          <input id="ai-title" v-model="draft.title" class="input text-base font-extrabold" maxlength="120" />
          <p class="mt-2 text-sm text-muted">
            <span v-if="draft.country" class="font-bold text-body">{{ draft.country }} · </span>{{ formatDateRange(draft.startDate, draft.endDate) }} · {{ $t('ai.stopCount', draft.stops.length) }}
          </p>
          <p v-if="draft.description" class="mt-2 text-sm text-body">{{ draft.description }}</p>
        </div>

        <p v-if="draft.unresolvedStops?.length" class="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-body" role="status">
          <Icon name="info" :size="14" class="mr-1 inline" /> {{ $t('ai.unresolved', { names: draft.unresolvedStops.join(', ') }) }}
        </p>

        <ol class="space-y-4">
          <li v-for="d in draftDays" :key="d.day">
            <h3 class="eyebrow mb-1.5">{{ $t('ai.dayN', { n: d.day }) }} · {{ formatDate(addDays(draft.startDate, d.day - 1), { weekday: 'short', day: 'numeric', month: 'short' }) }}</h3>
            <p v-if="!d.stops.length" class="text-sm text-muted">{{ $t('ai.noStopsDay') }}</p>
            <ul v-else class="space-y-1.5">
              <li v-for="s in d.stops" :key="s.index" class="flex items-start gap-3 rounded-xl border border-line p-2.5">
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="stopTypeMeta(s.type).soft"><Icon :name="stopTypeMeta(s.type).icon" :size="16" /></span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-extrabold text-ink">{{ s.name }}</span>
                  <span v-if="s.description" class="block text-[13px] leading-snug text-body">{{ s.description }}</span>
                  <span v-if="s.address" class="mt-0.5 block truncate text-xs text-muted">{{ s.address }}</span>
                </span>
                <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('ai.removeStop', { name: s.name })" @click="removeStop(s.index)">
                  <Icon name="x" :size="16" />
                </button>
              </li>
            </ul>
          </li>
        </ol>

        <p class="text-xs text-muted">{{ $t('ai.disclaimer') }} {{ $t('ai.privateNote') }}</p>

        <div class="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-secondary" :disabled="creating" @click="draft = null"><Icon name="refresh" :size="16" /> {{ $t('ai.startOver') }}</button>
          <button type="button" class="btn btn-primary" :disabled="creating || !draft.title.trim()" @click="create">
            <Spinner v-if="creating" :size="16" />
            <Icon v-else name="check" :size="16" />
            {{ creating ? $t('ai.creating') : $t('ai.create') }}
          </button>
        </div>
      </section>

      <div class="order-first lg:order-none">
        <div class="card overflow-hidden lg:sticky lg:top-24">
          <TripMap :stops="mapStops" :aria-label="$t('ai.mapAria')" height-class="h-[260px] sm:h-[340px] lg:h-[calc(100vh-9rem)]" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import TripMap from '@/components/trip/TripMap.vue'
import * as aiApi from '@/api/aiApi'
import { useAiStatus } from '@/composables/useAiStatus'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { addDays, dateInputToIso, formatDate, formatDateRange, toDateInput, tripDays } from '@/utils/date'
import { draftMapStops, stopsByDay } from '@/utils/ai'
import { stopTypeMeta } from '@/utils/stopTypes'

const EXAMPLES = ['slovenia', 'japan', 'portugal', 'weekend']
const MAX_DAYS = 21
const DEFAULT_START_OFFSET_DAYS = 30

const router = useRouter()
const { t } = useI18n()
const toast = useToastStore()
const { status: aiStatus, loaded: aiLoaded, load: loadAiStatus, setRemaining } = useAiStatus()

const todayInput = toDateInput(new Date())
const prompt = ref('')
const days = ref(null)
const startDate = ref(toDateInput(addDays(new Date(), DEFAULT_START_OFFSET_DAYS)))
const generating = ref(false)
const creating = ref(false)
const draft = ref(null)

const totalDays = computed(() => (draft.value ? tripDays(draft.value.startDate, draft.value.endDate) : 1))
const draftDays = computed(() => (draft.value ? stopsByDay(draft.value.stops, totalDays.value) : []))
const mapStops = computed(() => (draft.value ? draftMapStops(draft.value.stops) : []))

async function generate() {
  generating.value = true
  try {
    const result = await aiApi.planTrip({
      prompt: prompt.value.trim(),
      days: days.value,
      startDate: dateInputToIso(startDate.value),
    })
    setRemaining(result.remainingToday)
    draft.value = result
  } catch (e) {
    toast.error(errorMessage(e, t('ai.planFailed')))
    // Bij de daglimiet (429) de teller meteen bijwerken.
    if (e?.response?.status === 429) setRemaining(0)
  } finally {
    generating.value = false
  }
}

function removeStop(index) {
  draft.value.stops = draft.value.stops.filter((_, i) => i !== index)
}

async function create() {
  if (!draft.value.stops.length) {
    toast.error(t('ai.noStopsLeft'))
    return
  }
  creating.value = true
  try {
    const { title, country, description, startDate: start, endDate, stops } = draft.value
    const trip = await aiApi.createTripFromPlan({ title: title.trim(), country, description, startDate: start, endDate, stops })
    toast.success(t('ai.created'))
    router.push(`/trips/${trip.id}/edit`)
  } catch (e) {
    toast.error(errorMessage(e, t('ai.createFailed')))
  } finally {
    creating.value = false
  }
}

onMounted(() => loadAiStatus(true))
</script>
