import { ref } from 'vue'
import * as aiApi from '@/api/aiApi'

// Gedeelde AI-status: één keer per sessie opgehaald; alles wat met AI te maken heeft is verborgen
// zolang `enabled` false is (geen API-sleutel op de server, of de status kon niet geladen worden).
const status = ref({ enabled: false, remainingToday: 0, dailyLimit: 0 })
const loaded = ref(false)
let pending = null

async function load(force = false) {
  if (loaded.value && !force) return status.value
  if (!pending) {
    pending = aiApi.getAiStatus()
      .then((s) => {
        status.value = s
        loaded.value = true
        return s
      })
      .catch(() => status.value)
      .finally(() => { pending = null })
  }
  return pending
}

/** Bijwerken na een AI-aanroep (de API geeft het resterende aantal mee). */
function setRemaining(remaining) {
  if (typeof remaining === 'number') status.value = { ...status.value, remainingToday: remaining }
}

export function useAiStatus() {
  return { status, loaded, load, setRemaining }
}
