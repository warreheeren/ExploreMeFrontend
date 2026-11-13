import { onBeforeUnmount, ref, watch } from 'vue'
import * as tracksApi from '@/api/tracksApi'
import { onRealtime } from '@/services/realtime'

/**
 * GPX-tracks van een reis (fase 6): laadt bij een nieuwe reis-id en ververst stil bij `tripChanged` met
 * area "tracks" (wijzigingen van reisgenoten). Fouten zijn niet kritiek: zonder tracks blijft de kaart werken.
 * @param {() => string | null | undefined} getTripId
 */
export function useTripTracks(getTripId) {
  const tracks = ref([])

  async function load() {
    const tripId = getTripId()
    if (!tripId) {
      tracks.value = []
      return
    }
    try {
      const list = await tracksApi.getTracks(tripId)
      // Een trage respons van een vorige reis niet over de huidige heen zetten.
      if (getTripId() === tripId) tracks.value = list
    } catch {
      if (getTripId() === tripId) tracks.value = []
    }
  }

  function upsert(track) {
    const index = tracks.value.findIndex((t) => t.id === track.id)
    tracks.value = index >= 0 ? tracks.value.map((t) => (t.id === track.id ? track : t)) : [...tracks.value, track]
  }

  function remove(trackId) {
    tracks.value = tracks.value.filter((t) => t.id !== trackId)
  }

  watch(getTripId, load, { immediate: true })
  const off = onRealtime('tripChanged', (p) => {
    if (p?.tripId === getTripId() && p.area === 'tracks') load()
  })
  onBeforeUnmount(off)

  return { tracks, load, upsert, remove }
}
