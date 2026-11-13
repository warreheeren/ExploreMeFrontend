<template>
  <div class="mx-auto max-w-3xl">
    <div v-if="loading" class="space-y-4" aria-busy="true">
      <div class="skeleton h-8 w-2/3" />
      <div class="skeleton h-40 rounded-2xl" />
      <div class="skeleton h-28 rounded-2xl" />
    </div>

    <EmptyState v-else-if="!trip" icon="map" :title="$t('trip.notFound.title')" :text="$t('today.notFound')">
      <RouterLink to="/trips" class="btn btn-secondary btn-sm">{{ $t('trip.notFound.action') }}</RouterLink>
    </EmptyState>

    <template v-else>
      <RouterLink :to="`/trips/${trip.id}`" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="chevron-left" :size="16" /> {{ $t('today.backToTrip') }}
      </RouterLink>

      <header class="mb-5">
        <p class="eyebrow-accent">
          <template v-if="status.state === 'during'">{{ $t('today.eyebrow', { day: status.dayNumber, total: totalDays }) }} · </template>{{ formatFullDate(status.date) }}
        </p>
        <h1 class="page-title mt-0.5">{{ trip.title }}</h1>
      </header>

      <!-- Buiten de reis -->
      <EmptyState v-if="status.state === 'before'" icon="calendar" :title="$t('today.before.title', status.daysUntilStart)" :text="$t('today.before.text')">
        <RouterLink :to="`/trips/${trip.id}`" class="btn btn-secondary btn-sm">{{ $t('today.backToTrip') }}</RouterLink>
      </EmptyState>
      <EmptyState v-else-if="status.state === 'after'" icon="sparkle" :title="$t('today.after.title')" :text="$t('today.after.text')">
        <RouterLink :to="`/trips/${trip.id}/recap`" class="btn btn-primary btn-sm"><Icon name="sparkle" :size="14" /> {{ $t('today.after.recap') }}</RouterLink>
      </EmptyState>

      <div v-else class="space-y-5">
        <!-- Vlucht(en) van vandaag bovenaan: status, gate en vertraging (zonder provider alleen de tracker-link). -->
        <FlightStatusCard v-for="flight in todaysFlights" :key="flight.id" :trip-id="trip.id" :stop="flight" />

        <!-- Volgende stop -->
        <section class="card card-pad" aria-labelledby="today-next">
          <h2 id="today-next" class="eyebrow">{{ $t('today.next.title') }}</h2>
          <template v-if="next">
            <div class="mt-2 flex items-start gap-3">
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :class="stopTypeMeta(next.type).soft"><Icon :name="stopTypeMeta(next.type).icon" :size="22" /></span>
              <div class="min-w-0 flex-1">
                <p class="text-xl font-extrabold leading-tight text-ink">{{ next.name }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-muted">
                  <span v-if="next.startTime" class="inline-flex items-center gap-1"><Icon name="clock" :size="14" /> {{ $t('today.next.at', { time: next.startTime.slice(0, 5) }) }}</span>
                  <span v-if="nextLeg" class="inline-flex items-center gap-1"><Icon name="route" :size="14" /> {{ $t('today.next.leg', { distance: formatDistance(nextLeg.distanceMeters), duration: formatDuration(nextLeg.durationSeconds) }) }}</span>
                </p>
                <p v-if="next.address" class="mt-1 truncate text-sm text-body">{{ next.address }}</p>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <a v-if="hasCoords(next)" :href="navigationUrl(next)" target="_blank" rel="noopener" class="btn btn-primary"><Icon name="compass" :size="16" /> {{ $t('today.next.navigate') }}</a>
              <button type="button" class="btn btn-secondary" @click="toggleDone(next)"><Icon name="check" :size="16" /> {{ $t('today.next.done') }}</button>
            </div>
          </template>
          <div v-else class="mt-2">
            <p class="text-lg font-extrabold text-ink">{{ todaysStops.length ? $t('today.next.none') : $t('today.next.noStops') }}</p>
            <p class="mt-0.5 text-sm text-muted">{{ todaysStops.length ? $t('today.next.noneText') : $t('today.next.noStopsText') }}</p>
          </div>
        </section>

        <!-- Weer + zon -->
        <WeatherStrip v-if="trip.stops.length" :trip-id="trip.id" :only-date="todayKey" @loaded="onWeatherLoaded" />
        <section v-if="sunStop" class="card card-pad" :aria-label="$t('sun.today')">
          <h2 class="card-title mb-1.5 flex items-center gap-2"><Icon name="sun" :size="18" /> {{ $t('sun.today') }}</h2>
          <SunTimes :date="todayKey" :lat="sunStop.latitude" :lng="sunStop.longitude" :timezone="todayTimezone" />
        </section>

        <!-- Stops van vandaag -->
        <section v-if="todaysStops.length" class="card" aria-labelledby="today-stops">
          <h2 id="today-stops" class="card-title px-4 pt-4 sm:px-5">{{ $t('today.stops.title') }}</h2>
          <ul class="divide-y divide-line px-2 pb-2 pt-2 sm:px-3">
            <li v-for="stop in todaysStops" :key="stop.id" class="flex items-center gap-2">
              <button
                type="button"
                class="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition"
                :class="isDone(stop) ? 'border-accent-700 bg-accent-700 text-white' : 'border-line-strong text-transparent hover:border-accent-700'"
                role="checkbox"
                :aria-checked="isDone(stop)"
                :aria-label="isDone(stop) ? $t('today.stops.markUndone', { name: stop.name }) : $t('today.stops.markDone', { name: stop.name })"
                @click="toggleDone(stop)"
              >
                <Icon name="check" :size="14" :stroke-width="3" />
              </button>
              <RouterLink :to="`/places/${stop.id}`" class="min-w-0 flex-1" :class="isDone(stop) ? 'opacity-60' : ''">
                <StopRow :stop="stop" :clickable="false" :selected="next?.id === stop.id" :badge="stop.startTime ? stop.startTime.slice(0, 5) : ''" />
              </RouterLink>
            </li>
          </ul>
        </section>

        <!-- Snelle acties -->
        <section class="card card-pad" aria-labelledby="today-quick">
          <h2 id="today-quick" class="card-title mb-3">{{ $t('today.quick.title') }}</h2>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" class="btn btn-secondary" @click="storyOpen = true"><Icon name="camera" :size="16" /> {{ $t('today.quick.story') }}</button>
            <RouterLink v-if="trip.canEdit" :to="`/trips/${trip.id}?tab=budget`" class="btn btn-secondary"><Icon name="wallet" :size="16" /> {{ $t('today.quick.expense') }}</RouterLink>
            <RouterLink v-if="trip.canEdit" :to="`/trips/${trip.id}?tab=dagboek`" class="btn btn-secondary"><Icon name="book" :size="16" /> {{ $t('today.quick.journal') }}</RouterLink>
          </div>
        </section>

        <!-- Veiligheids-check-in -->
        <SafetyCheckInCard :trip-id="trip.id" />

        <!-- Open paklijst-items -->
        <TripChecklist v-if="trip.canEdit" :trip-id="trip.id" compact />

        <!-- Laatste chatberichten -->
        <section v-if="trip.canEdit" class="card" aria-labelledby="today-chat">
          <div class="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
            <h2 id="today-chat" class="card-title flex items-center gap-2"><Icon name="chat" :size="18" /> {{ $t('today.chat.title') }}</h2>
            <RouterLink :to="`/messages/trip/${trip.id}`" class="text-xs font-bold text-accent-700 hover:underline">{{ $t('today.chat.open') }}</RouterLink>
          </div>
          <p v-if="!messages.length" class="px-4 pb-4 pt-2 text-sm text-muted sm:px-5">{{ $t('today.chat.empty') }}</p>
          <ul v-else class="space-y-3 px-4 pb-4 pt-3 sm:px-5">
            <li v-for="m in messages" :key="m.id" class="flex items-start gap-2.5">
              <Avatar :src="m.senderProfilePhotoUrl" :name="m.senderDisplayName" size="xs" />
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-muted"><span class="font-extrabold text-ink">{{ m.fromMe ? $t('today.chat.you') : m.senderDisplayName }}</span> · {{ timeAgo(m.createdAtUtc) }}</p>
                <p class="line-clamp-2 text-sm text-body">{{ m.text }}</p>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <StoryCreateDialog v-model="storyOpen" :preset-trip-id="trip.id" />
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StopRow from '@/components/trip/StopRow.vue'
import SunTimes from '@/components/trip/SunTimes.vue'
import WeatherStrip from '@/components/trip/WeatherStrip.vue'
import TripChecklist from '@/components/trip/TripChecklist.vue'
import StoryCreateDialog from '@/components/stories/StoryCreateDialog.vue'
import SafetyCheckInCard from '@/components/safety/SafetyCheckInCard.vue'
import FlightStatusCard from '@/components/trip/FlightStatusCard.vue'
import * as tripsApi from '@/api/tripsApi'
import { onRealtime } from '@/services/realtime'
import { formatFullDate, timeAgo, toDateInput, todayDateOnly, tripDays } from '@/utils/date'
import { formatDistance, formatDuration } from '@/utils/format'
import { stopTypeMeta } from '@/utils/stopTypes'
import { isFlightToday } from '@/utils/flights'
import { getDoneStops, navigationUrl, nextStop, setDoneStops, stopsForToday, tripDayStatus } from '@/utils/today'

const route = useRoute()
const { t } = useI18n()

const trip = ref(null)
const loading = ref(true)
const tripRoute = ref(null)
const messages = ref([])
const doneIds = ref([])
const todayTimezone = ref(null)
const storyOpen = ref(false)
// Klok die elke minuut tikt, zodat "volgende stop" meeschuift en een nieuwe dag vanzelf begint.
const now = ref(new Date())

// Null zolang de reis laadt: de watch op todayKey loopt al vóór de eerste load.
const status = computed(() => (trip.value ? tripDayStatus(trip.value, now.value) : null))
const todayKey = computed(() => toDateInput(todayDateOnly(now.value)))
const totalDays = computed(() => (trip.value ? tripDays(trip.value.startDate, trip.value.endDate) : 0))
const todaysStops = computed(() => (trip.value ? stopsForToday(trip.value, now.value) : []))
const next = computed(() => nextStop(todaysStops.value, doneIds.value, now.value))
/** Stops waarvan de vlucht vandaag vertrekt (lokale vertrekdatum), in reisvolgorde. */
const todaysFlights = computed(() => (trip.value
  ? trip.value.stops
    .filter((s) => s.flightNumber && isFlightToday(s.flightDate, now.value))
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  : []))
const sunStop = computed(() => (next.value && hasCoords(next.value) ? next.value : todaysStops.value.find(hasCoords) || null))

/** Routebeen naar de volgende stop (de route is op orderIndex gesorteerd, zoals in TripDetailView). */
const nextLeg = computed(() => {
  if (!tripRoute.value || !next.value) return null
  const ordered = [...trip.value.stops].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  const index = ordered.findIndex((s) => s.id === next.value.id)
  return tripRoute.value.legs.find((leg) => leg.toIndex === index) || null
})

function hasCoords(stop) {
  return Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)
}

function isDone(stop) {
  return doneIds.value.includes(stop.id)
}

function toggleDone(stop) {
  doneIds.value = isDone(stop) ? doneIds.value.filter((id) => id !== stop.id) : [...doneIds.value, stop.id]
  setDoneStops(trip.value.id, todayKey.value, doneIds.value)
}

function onWeatherLoaded(weather) {
  todayTimezone.value = (weather?.days || []).find((d) => toDateInput(d.date) === todayKey.value)?.timezone || null
}

async function loadExtras() {
  // Alles hier is optioneel: offline of zonder rechten blijft de rest van de pagina werken.
  const [routeResult, chatResult] = await Promise.allSettled([
    trip.value.stops.length > 1 ? tripsApi.getRoute(trip.value.id) : Promise.resolve(null),
    trip.value.canEdit ? tripsApi.getTripChat(trip.value.id, 3) : Promise.resolve([]),
  ])
  tripRoute.value = routeResult.status === 'fulfilled' ? routeResult.value : null
  messages.value = chatResult.status === 'fulfilled' ? chatResult.value : []
}

async function load() {
  loading.value = true
  try {
    trip.value = await tripsApi.getTripById(route.params.id)
  } catch {
    trip.value = null
  } finally {
    loading.value = false
  }
  if (!trip.value) return
  document.title = `${t('today.routeTitle')} · ${trip.value.title} · ExploreMe`
  doneIds.value = getDoneStops(trip.value.id, todayKey.value)
  if (status.value.state === 'during') loadExtras()
}

watch(todayKey, (key, previous) => {
  if (trip.value && previous && key !== previous) doneIds.value = getDoneStops(trip.value.id, key)
})
watch(() => route.params.id, (id) => { if (id) load() })

let timer = null
let unsubscribe = () => {}
onMounted(() => {
  load()
  timer = setInterval(() => { now.value = new Date() }, 60000)
  unsubscribe = onRealtime('tripMessage', (p) => {
    if (trip.value?.canEdit && p?.tripId === trip.value.id) {
      tripsApi.getTripChat(trip.value.id, 3).then((m) => { messages.value = m }).catch(() => {})
    }
  })
})
onBeforeUnmount(() => {
  clearInterval(timer)
  unsubscribe()
})
</script>
