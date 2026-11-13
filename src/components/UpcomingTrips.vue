<template>
  <section class="card card-pad">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="card-title">{{ $t('trips.upcoming.title') }}</h2>
      <RouterLink to="/trips/new" class="btn-icon btn-icon-sm" :aria-label="$t('trips.upcoming.planNew')"><Icon name="plus" :size="16" /></RouterLink>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="flex items-center gap-3">
        <div class="skeleton h-14 w-14 rounded-xl" />
        <div class="flex-1 space-y-1.5"><div class="skeleton h-3 w-3/4" /><div class="skeleton h-3 w-1/2" /></div>
      </div>
    </div>

    <div v-else-if="!trips.length" class="rounded-xl bg-gray-50 px-4 py-5 text-center">
      <p class="text-sm font-bold text-ink">{{ $t('trips.upcoming.emptyTitle') }}</p>
      <p class="mt-0.5 text-xs text-muted">{{ $t('trips.upcoming.emptyText') }}</p>
      <RouterLink to="/trips/new" class="btn btn-primary btn-sm mt-3"><Icon name="plus" :size="14" /> {{ $t('trips.upcoming.planTrip') }}</RouterLink>
    </div>

    <ul v-else class="space-y-1">
      <li v-for="trip in trips" :key="trip.id">
        <RouterLink :to="`/trips/${trip.id}`" class="-mx-2 flex items-center gap-3 rounded-xl p-2 transition hover:bg-gray-50">
          <span class="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            <CoverImage :src="thumbUrl(trip.coverImageUrl)" :seed="trip.id" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-bold text-ink">{{ trip.title }}</span>
            <span class="block truncate text-xs font-semibold text-muted">{{ formatDateRange(trip.startDate, trip.endDate) }}</span>
            <span v-if="trip.userName !== auth.userName" class="block truncate text-xs text-muted">{{ $t('trips.upcoming.with', { name: trip.displayName }) }}</span>
          </span>
          <span
            class="chip shrink-0"
            :class="isSoon(trip) ? 'bg-accent-700 text-white' : 'chip-muted'"
          >
            {{ countdownLabel(trip.startDate, trip.endDate) }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Icon from './ui/Icon.vue'
import CoverImage from './ui/CoverImage.vue'
import * as tripsApi from '@/api/tripsApi'
import { useAuthStore } from '@/stores/auth'
import { countdownLabel, daysUntil, formatDateRange } from '@/utils/date'
import { thumbUrl } from '@/utils/media'

const props = defineProps({
  take: { type: Number, default: 3 },
})

const auth = useAuthStore()
const trips = ref([])
const loading = ref(true)

function isSoon(trip) {
  const d = daysUntil(trip.startDate)
  return d <= 7
}

async function load() {
  loading.value = true
  try {
    trips.value = await tripsApi.getUpcomingTrips(props.take)
  } catch {
    trips.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>
