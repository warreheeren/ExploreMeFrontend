import http from './http'

// AI-reisassistent. De antwoordtaal volgt de Accept-Language-header (zie http.js).

/** { enabled, remainingToday, dailyLimit } */
export async function getAiStatus() {
  const { data } = await http.get('/ai/status')
  return data
}

/**
 * payload: { prompt, days?, startDate? (ISO, UTC-middernacht) }
 * → { title, country, description, startDate, endDate, stops: [{ name, type, day, description, address, latitude, longitude, placeId }], unresolvedStops, remainingToday }
 * Kan lang duren (model + geocoderen), daarom een ruime time-out.
 */
export async function planTrip(payload) {
  const { data } = await http.post('/ai/plan', payload, { timeout: 120000 })
  return data
}

/** Maakt van een (bewerkt) voorstel een private reis → TripDto. */
export async function createTripFromPlan(draft) {
  const { data } = await http.post('/ai/plan/create', draft)
  return data
}

/**
 * Boekingsvoorstellen uit geplakte tekst (of tekst uit een PDF); niets wordt opgeslagen.
 * → { bookings: [BookingDraftDto], remainingToday }
 */
export async function importBooking(tripId, text) {
  const { data } = await http.post(`/ai/trips/${tripId}/import-booking`, { text }, { timeout: 120000 })
  return data
}

/**
 * kind: 'post' | 'comment' | 'tripComment' | 'journal' | 'tripDescription'; target: 'nl' | 'en'
 * → { sourceLanguage, text, cached } (sourceLanguage === target = al in die taal, text is dan het origineel)
 */
export async function translateContent(kind, id, target) {
  const { data } = await http.post('/translate', { kind, id, target }, { timeout: 60000 })
  return data
}

/** history: [{ role: 'user' | 'assistant', text }] → { answer, remainingToday } */
export async function askTripAssistant(tripId, question, history = []) {
  const { data } = await http.post(`/trips/${tripId}/ai/ask`, { question, history }, { timeout: 90000 })
  return data
}
