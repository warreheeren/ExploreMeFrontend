import { readonly, ref } from 'vue'
import { getOfflineTrips } from '@/utils/offlineTrips'
import { makeTripAvailableOffline, removeTripOffline } from '@/services/offlineTrip'

// Gedeelde, reactieve lijst van offline beschikbare reizen (bron: localStorage op dit apparaat) + online-status.
const trips = ref(getOfflineTrips())
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine !== false)

function refresh() {
  trips.value = getOfflineTrips()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { online.value = true })
  window.addEventListener('offline', () => { online.value = false })
  // Andere tabbladen kunnen de lijst ook wijzigen.
  window.addEventListener('storage', (e) => { if (e.key === 'offlineTrips') refresh() })
}

export function useOfflineTrips() {
  return {
    trips: readonly(trips),
    online: readonly(online),
    isOffline: (id) => trips.value.some((t) => t.id === id),
    async save(trip, onProgress) {
      const result = await makeTripAvailableOffline(trip, onProgress)
      refresh()
      return result
    },
    async remove(trip) {
      trips.value = await removeTripOffline(trip)
    },
    refresh,
  }
}
