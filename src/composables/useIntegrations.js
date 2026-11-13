import { ref } from 'vue'
import * as integrationsApi from '@/api/integrationsApi'

// Gedeelde status van de externe koppelingen: één keer per sessie opgehaald (zoals useAiStatus). Zolang de status
// niet geladen is (of het ophalen faalt) staat alles uit: prijzen en events verborgen, deeplinks zonder partner-id.
const DISABLED = Object.freeze({
  hotelPrices: false,
  events: false,
  bookingAffiliateId: null,
  getYourGuidePartnerId: null,
  viatorPartnerId: null,
  flightStatus: false,
  transit: false,
  airaloPartnerId: null,
  airaloQueryParam: null,
  discoverCarsAffiliateId: null,
  calendarGoogle: false,
  calendarMicrosoft: false,
  videoUploads: false,
  nativePush: false,
})

const status = ref({ ...DISABLED })
const loaded = ref(false)
let pending = null

async function load(force = false) {
  if (loaded.value && !force) return status.value
  if (!pending) {
    pending = integrationsApi.getIntegrationStatus()
      .then((s) => {
        status.value = { ...DISABLED, ...s }
        loaded.value = true
        return status.value
      })
      .catch(() => status.value)
      .finally(() => { pending = null })
  }
  return pending
}

export function useIntegrations() {
  return { status, loaded, load }
}

/** Alleen voor tests: terug naar de begintoestand. */
export function resetIntegrationsForTests() {
  status.value = { ...DISABLED }
  loaded.value = false
  pending = null
}
