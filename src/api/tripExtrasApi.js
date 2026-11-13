import http from './http'

// Reis als sjabloon, terugblik, foto's per stop (route-replay), paklijst-suggesties en landeninfo.

/** payload: { startDate (ISO, UTC-middernacht), title? } → nieuwe privéreis */
export async function copyTrip(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/copy`, payload)
  return data
}

export async function getRecap(tripId) {
  const { data } = await http.get(`/trips/${tripId}/recap`)
  return data
}

/** [{ tripStopId, imageUrl, caption, source }] */
export async function getStopPhotos(tripId) {
  const { data } = await http.get(`/trips/${tripId}/stop-photos`)
  return data
}

/** [{ key, reason, params }] */
export async function getChecklistSuggestions(tripId) {
  const { data } = await http.get(`/trips/${tripId}/checklist/suggestions`)
  return data
}

/** [{ code, name, plugs, voltage, emergency, drivingSide, currency, rateToBase, baseCurrency, tipping, languages, advisoryUrl }] */
export async function getCountryInfo(tripId) {
  const { data } = await http.get(`/trips/${tripId}/country-info`)
  return data
}
