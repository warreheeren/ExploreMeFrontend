<template>
  <article class="card card-pad" :aria-label="$t('flights.aria', { number: flightNumber })">
    <header class="flex flex-wrap items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon name="plane" :size="18" /></span>
      <div class="min-w-0 flex-1">
        <h3 class="card-title">{{ $t('flights.title', { number: flightNumber }) }}</h3>
        <p class="text-xs font-semibold text-muted">
          <span v-if="info?.airline">{{ info.airline }} · </span>
          <span v-if="info?.fromIata || info?.toIata">{{ info.fromIata || '?' }} → {{ info.toIata || '?' }} · </span>
          {{ $t('flights.departsOn', { date: formatDate(stop.flightDate, { weekday: 'short', day: 'numeric', month: 'short' }) }) }}
        </p>
      </div>
      <span v-if="info" class="chip h-6 shrink-0 px-2.5 text-xs" :class="toneClass" role="status">
        <Icon :name="meta.icon" :size="12" /> {{ $t(`flights.status.${info.status}`) }}<template v-if="delay > 0 && showDelay"> · {{ $t('flights.delay', { n: delay }) }}</template>
      </span>
    </header>

    <div v-if="loading && !info" class="mt-3 space-y-2" aria-busy="true">
      <div class="skeleton h-5 w-2/3" />
      <div class="skeleton h-5 w-1/2" />
    </div>

    <dl v-else-if="info" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div v-for="row in rows" :key="row.key" class="rounded-xl border border-line px-3 py-2">
        <dt class="eyebrow">{{ $t(`flights.${row.key}`) }}</dt>
        <dd class="mt-0.5">
          <span v-if="row.time" class="text-lg font-extrabold text-ink">{{ row.time.text }}</span>
          <span v-else class="text-lg font-extrabold text-muted">–</span>
          <s v-if="row.was" class="ml-2 text-sm font-semibold text-muted">
            <span class="sr-only">{{ $t('flights.scheduledWas') }} </span>{{ row.was.text }}
          </s>
          <span v-if="row.time && !row.time.local" class="ml-1.5 text-xs font-semibold text-muted">({{ $t('flights.yourTime') }})</span>
          <span v-if="row.terminal || row.gate" class="mt-0.5 block text-xs font-semibold text-body">
            <template v-if="row.terminal">{{ $t('flights.terminal', { value: row.terminal }) }}</template>
            <template v-if="row.terminal && row.gate"> · </template>
            <template v-if="row.gate">{{ $t('flights.gate', { value: row.gate }) }}</template>
          </span>
        </dd>
      </div>
    </dl>

    <p v-else class="mt-3 text-sm text-muted">{{ providerEnabled ? $t('flights.noStatus') : $t('flights.noProvider') }}</p>

    <footer class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <a v-if="trackerUrl" :href="trackerUrl" target="_blank" rel="noopener noreferrer" class="link inline-flex items-center gap-1.5 text-sm">
        {{ $t('flights.track') }} <Icon name="external" :size="14" />
      </a>
      <span class="flex items-center gap-2">
        <span v-if="checkedAt" class="text-xs text-muted">{{ $t('flights.updated', { ago: timeAgo(checkedAt) }) }}</span>
        <button
          v-if="providerEnabled"
          type="button"
          class="btn-icon btn-icon-sm"
          :disabled="loading"
          :aria-label="$t('flights.refresh')"
          :title="$t('flights.refresh')"
          @click="load"
        >
          <Icon name="refresh" :size="14" :class="loading ? 'animate-spin' : ''" />
        </button>
      </span>
    </footer>
  </article>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Icon from '../ui/Icon.vue'
import * as flightsApi from '@/api/flightsApi'
import { useIntegrations } from '@/composables/useIntegrations'
import { formatDate, timeAgo } from '@/utils/date'
import { delayMinutes, flightStatusMeta, flightTrackerUrl, formatFlightTime, normalizeFlightNumber } from '@/utils/flights'

const props = defineProps({
  tripId: { type: String, required: true },
  /** Stop met `id`, `flightNumber` en `flightDate` (aankomst per vliegtuig). */
  stop: { type: Object, required: true },
})

const TONE_CLASSES = {
  ok: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  muted: 'chip-muted',
}

const { status: integrations, load: loadIntegrations } = useIntegrations()
const providerEnabled = computed(() => !!integrations.value.flightStatus)

const result = ref(null)
const loading = ref(false)

const flightNumber = computed(() => result.value?.flightNumber || normalizeFlightNumber(props.stop.flightNumber) || props.stop.flightNumber)
const trackerUrl = computed(() => result.value?.trackerUrl || flightTrackerUrl(props.stop.flightNumber))
const info = computed(() => result.value?.info || null)
const checkedAt = computed(() => result.value?.checkedAtUtc || null)
const meta = computed(() => flightStatusMeta(info.value?.status))
const toneClass = computed(() => TONE_CLASSES[meta.value.tone] || TONE_CLASSES.muted)
const delay = computed(() => delayMinutes(info.value?.scheduledDepartureUtc, info.value?.estimatedDepartureUtc))
// Na vertrek of bij annulering zegt de vertraging niets meer in de badge.
const showDelay = computed(() => ['scheduled', 'delayed', 'boarding', 'unknown'].includes(info.value?.status))

function row(key, scheduled, estimated, timeZone, terminal, gate) {
  const shifted = delayMinutes(scheduled, estimated) > 0
  return {
    key,
    time: formatFlightTime(estimated || scheduled, timeZone),
    // Geplande tijd doorstrepen als de verwachte tijd later is.
    was: shifted ? formatFlightTime(scheduled, timeZone) : null,
    terminal,
    gate,
  }
}

const rows = computed(() => {
  const i = info.value
  if (!i) return []
  return [
    row('departure', i.scheduledDepartureUtc, i.estimatedDepartureUtc, i.departureTimeZone, i.departureTerminal, i.departureGate),
    row('arrival', i.scheduledArrivalUtc, i.estimatedArrivalUtc, i.arrivalTimeZone, i.arrivalTerminal, i.arrivalGate),
  ]
})

// Snel wisselende stops: alleen het antwoord voor de laatst gevraagde stop telt.
let requestId = 0

async function load() {
  const current = ++requestId
  await loadIntegrations()
  // Zonder provider is er niets live op te halen: alleen het nummer en de tracker-link.
  if (!providerEnabled.value || !props.stop?.id) return
  loading.value = true
  try {
    const data = await flightsApi.getStopFlight(props.tripId, props.stop.id)
    if (current === requestId) result.value = data
  } catch {
    // De vluchtstatus is een extraatje: bij een fout blijft de tracker-link staan.
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch(() => [props.stop?.id, props.stop?.flightNumber, props.stop?.flightDate], () => {
  result.value = null
  load()
})
onMounted(load)
</script>
