<template>
  <div class="space-y-4">
    <p v-if="!days.length" class="card card-pad text-sm text-muted">{{ $t('trip.itinerary.empty') }}</p>
    <section v-for="day in days" :key="day.dayNumber" class="card overflow-hidden break-inside-avoid">
      <header class="flex items-center gap-3 border-b border-line bg-gray-50/70 px-4 py-3">
        <span class="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface leading-none">
          <span class="text-[9px] font-extrabold uppercase tracking-wider text-accent-700">{{ $t('trip.itinerary.day') }}</span>
          <span class="text-base font-bold text-ink">{{ day.dayNumber }}</span>
        </span>
        <div class="min-w-0">
          <p class="text-sm font-bold text-ink">{{ formatFullDate(day.date) }}</p>
          <p class="text-xs font-semibold text-muted">{{ $t('trip.itinerary.stops', day.stops.length) }}</p>
          <ul v-if="holidaysOn(day).length" class="mt-1.5 flex flex-wrap gap-1.5">
            <li v-for="h in holidaysOn(day)" :key="`${h.countryCode}-${h.localName}`" class="chip h-auto whitespace-normal bg-amber-50 py-0.5 text-amber-800" :title="h.localName !== h.name ? h.localName : undefined">
              <Icon name="calendar" :size="12" class="shrink-0" /> {{ $t('stopDiscover.holidays.chip', { country: h.countryName, name: h.name }) }}
            </li>
          </ul>
        </div>
      </header>
      <div class="space-y-0.5 p-1.5">
        <template v-for="stop in day.stops" :key="stop.id">
          <p v-if="legs?.[stop.id]" class="flex items-center gap-2 py-0.5 pl-8 text-[11px] font-bold text-muted">
            <Icon name="car" :size="12" /> {{ formatDistance(legs[stop.id].distanceMeters) }} · {{ formatDuration(legs[stop.id].durationSeconds) }}
          </p>
          <div class="group flex items-start">
            <StopRow
              class="min-w-0 flex-1"
              :stop="stop"
              :selected="stop.id === selectedStopId"
              :clickable="clickable"
              :date="day.date"
              :timezone="timezones?.[toDateInput(day.date)] || null"
              @select="$emit('select', $event)"
            />
            <StopActions
              v-if="actions"
              :stop="stop"
              :trip-id="trip.id"
              :can-edit="!!trip.canEdit"
              :trip-start-date="trip.startDate"
              :trip-end-date="trip.endDate"
              :base-currency="trip.baseCurrency || 'EUR'"
              @save="$emit('save', $event)"
              @stops-added="$emit('stops-added', $event)"
            />
          </div>
          <!-- Uitklapdetail van een geselecteerde vliegtuig-stop: vluchtstatus (of alleen de tracker-link). -->
          <FlightStatusCard v-if="actions && stop.flightNumber && stop.id === selectedStopId" :trip-id="trip.id" :stop="stop" class="mx-2.5 mb-2" />
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import StopRow from './StopRow.vue'
import StopActions from './StopActions.vue'
import Icon from '../ui/Icon.vue'
import { buildItinerary } from '@/utils/itinerary'
import { formatFullDate, toDateInput } from '@/utils/date'
import { formatDistance, formatDuration } from '@/utils/format'
import { holidaysByDay } from '@/utils/tourLinks'

// Lazy: alleen nodig als een stop met vluchtnummer geselecteerd is.
const FlightStatusCard = defineAsyncComponent(() => import('./FlightStatusCard.vue'))

const props = defineProps({
  trip: { type: Object, required: true },
  selectedStopId: { type: String, default: null },
  clickable: { type: Boolean, default: true },
  /** Etappe naar elke stop: { [stopId]: { distanceMeters, durationSeconds } }. */
  legs: { type: Object, default: null },
  /** IANA-tijdzone per reisdag: { 'YYYY-MM-DD': 'Europe/Rome' }; zonder zone: browsertijd. */
  timezones: { type: Object, default: null },
  actions: { type: Boolean, default: false },
  /** Nationale feestdagen tijdens de reis (GET /trips/{id}/holidays); als chip per dag. */
  holidays: { type: Array, default: () => [] },
})
defineEmits(['select', 'save', 'stops-added'])

const days = computed(() => buildItinerary(props.trip))
const holidayMap = computed(() => holidaysByDay(props.holidays))
const holidaysOn = (day) => holidayMap.value[toDateInput(day.date)] || []
</script>
