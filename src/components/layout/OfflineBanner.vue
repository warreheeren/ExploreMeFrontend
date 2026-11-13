<template>
  <div v-if="!online" class="border-b border-line bg-ink text-surface" role="status" aria-live="polite">
    <div class="mx-auto flex max-w-content flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6">
      <span class="inline-flex items-center gap-2 font-bold"><Icon name="wifi-off" :size="16" /> {{ $t('tripExtras.offline.banner') }}</span>
      <span class="text-xs opacity-80">{{ $t('tripExtras.offline.bannerHint') }}</span>
      <span v-if="trips.length" class="flex min-w-0 flex-wrap items-center gap-2 text-xs">
        <RouterLink v-for="trip in trips.slice(0, 3)" :key="trip.id" :to="`/trips/${trip.id}`" class="max-w-[12rem] truncate font-bold underline underline-offset-2">{{ trip.title }}</RouterLink>
      </span>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import Icon from '../ui/Icon.vue'
import { useOfflineTrips } from '@/composables/useOfflineTrips'
import { useAuthStore } from '@/stores/auth'
import { CACHE_TRIP_DATA, forgetOfflineTrip, getOfflineTrips } from '@/utils/offlineTrips'

const offline = useOfflineTrips()
const online = offline.online
const trips = offline.trips
const auth = useAuthStore()

// Bij uitloggen: gecachete reisgegevens (privé-inhoud) van dit apparaat wissen.
watch(() => auth.isAuthenticated, async (loggedIn, before) => {
  if (loggedIn || !before) return
  for (const t of getOfflineTrips()) forgetOfflineTrip(t.id)
  offline.refresh()
  try {
    if (typeof caches !== 'undefined') await caches.delete(CACHE_TRIP_DATA)
  } catch {
    // Geen Cache API: niets te wissen.
  }
})
</script>
