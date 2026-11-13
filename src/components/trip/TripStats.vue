<template>
  <div>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="stat-tile">
        <div class="flex items-center gap-2 text-muted"><Icon name="calendar" :size="16" /><span class="eyebrow">{{ $t('trip.stats.duration') }}</span></div>
        <p class="stat-value mt-1.5">{{ days }}</p>
        <p class="stat-label">{{ $t('trip.stats.dayUnit', days) }} · {{ formatDateRange(trip.startDate, trip.endDate) }}</p>
      </div>
      <div class="stat-tile">
        <div class="flex items-center gap-2 text-muted"><Icon name="route" :size="16" /><span class="eyebrow">{{ $t('trip.stats.stops') }}</span></div>
        <p class="stat-value mt-1.5">{{ trip.stops?.length || 0 }}</p>
        <p class="stat-label"><template v-if="route?.distanceMeters">{{ formatDistance(route.distanceMeters) }} · </template>{{ $t('trip.stats.placesActivities', { places: counts.Waypoint, activities: counts.Activity }) }}</p>
      </div>
      <div class="stat-tile">
        <div class="flex items-center gap-2 text-muted"><Icon name="bed" :size="16" /><span class="eyebrow">{{ $t('trip.stats.sleep') }}</span></div>
        <p class="stat-value mt-1.5">{{ totalNights }}</p>
        <p class="stat-label">{{ $t('trip.stats.nightsIn', { nights: $t('trip.stats.nightUnit', totalNights), stays: $t('trip.stats.stays', counts.Accommodation) }) }}</p>
      </div>
      <div class="stat-tile">
        <div class="flex items-center gap-2 text-muted"><Icon name="euro" :size="16" /><span class="eyebrow">{{ $t('trip.stats.estimated') }}</span></div>
        <p class="stat-value mt-1.5">{{ formatCurrency(cost) }}</p>
        <p class="stat-label">{{ $t('trip.stats.costHint') }}</p>
      </div>
    </div>
    <FootprintCard v-if="showFootprint && (trip.stops?.length || 0) > 1" :footprint="footprint" :loading="footprintLoading" :failed="footprintFailed" class="mt-3" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '../ui/Icon.vue'
import FootprintCard from './FootprintCard.vue'
import { formatCurrency, formatDateRange, tripDays } from '@/utils/date'
import { estimatedCost, nightsFor } from '@/utils/stopTypes'
import { formatDistance } from '@/utils/format'

const props = defineProps({
  trip: { type: Object, required: true },
  /** Route van de API (afstand), optioneel. */
  route: { type: Object, default: null },
  /** CO₂-kaart tonen (niet op de publieke deelpagina). */
  showFootprint: { type: Boolean, default: false },
  footprint: { type: Object, default: null },
  footprintLoading: { type: Boolean, default: false },
  footprintFailed: { type: Boolean, default: false },
})

const days = computed(() => tripDays(props.trip.startDate, props.trip.endDate))
const counts = computed(() => {
  const c = { Waypoint: 0, Accommodation: 0, FoodSpot: 0, Activity: 0 }
  for (const s of props.trip.stops || []) c[s.type] = (c[s.type] || 0) + 1
  return c
})
const totalNights = computed(() => (props.trip.stops || []).filter((s) => s.type === 'Accommodation').reduce((n, s) => n + nightsFor(s), 0))
const cost = computed(() => estimatedCost(props.trip.stops))
</script>
