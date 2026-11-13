import { defineStore } from 'pinia'
import * as safetyApi from '@/api/safetyApi'
import { LOCATION_INTERVAL_MS } from '@/utils/safety'

const SHARE_KEY = 'safety-share-location'

function readShared() {
  try {
    return localStorage.getItem(SHARE_KEY)
  } catch {
    return null
  }
}

function writeShared(id) {
  try {
    if (id) localStorage.setItem(SHARE_KEY, id)
    else localStorage.removeItem(SHARE_KEY)
  } catch {
    // alleen voor deze sessie
  }
}

/**
 * De actieve veiligheids-check-in van de gebruiker (statuschip in de header, Vandaag-modus) en het optioneel
 * delen van de locatie. Locatie delen werkt alleen terwijl de app open is: er is geen achtergrondtracking.
 */
export const useSafetyStore = defineStore('safety', {
  state: () => ({
    active: null,
    loaded: false,
    sharingLocation: false,
    locationError: false,
    _timer: null,
  }),

  actions: {
    async load() {
      try {
        this.setActive(await safetyApi.getActive())
      } catch {
        // offline: de laatst bekende status blijft staan
      } finally {
        this.loaded = true
      }
    },

    setActive(checkIn) {
      this.active = checkIn && checkIn.status === 'Active' ? checkIn : null
      // Locatie delen hoort bij één check-in; na een herlaad van de app gaat het verder als het zo aangevinkt was.
      const shouldShare = !!this.active && readShared() === this.active.id
      if (shouldShare !== this.sharingLocation || (shouldShare && !this._timer)) this._applySharing(shouldShare)
    },

    async start(payload) {
      const created = await safetyApi.start(payload)
      this.setActive(created)
      return created
    },

    async checkIn() {
      if (!this.active) return
      await safetyApi.checkIn(this.active.id)
      this.setActive(null)
    },

    async extend(minutes) {
      if (!this.active) return
      this.setActive(await safetyApi.extend(this.active.id, minutes))
    },

    async cancel() {
      if (!this.active) return
      await safetyApi.cancel(this.active.id)
      this.setActive(null)
    },

    setSharing(enabled) {
      writeShared(enabled && this.active ? this.active.id : null)
      this._applySharing(enabled && !!this.active)
    },

    _applySharing(enabled) {
      this.sharingLocation = enabled
      this.locationError = false
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
      if (!enabled) return
      this._sendLocation()
      this._timer = setInterval(() => this._sendLocation(), LOCATION_INTERVAL_MS)
    },

    _sendLocation() {
      const id = this.active?.id
      if (!id || typeof navigator === 'undefined' || !navigator.geolocation) {
        this.locationError = true
        return
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const updated = await safetyApi.updateLocation(id, pos.coords.latitude, pos.coords.longitude)
            if (this.active?.id === id) this.active = updated
            this.locationError = false
          } catch {
            this.locationError = true
          }
        },
        () => { this.locationError = true },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      )
    },

    reset() {
      this._applySharing(false)
      this.active = null
      this.loaded = false
    },
  },
})
