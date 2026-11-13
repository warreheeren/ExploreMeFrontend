import http from './http'

// Wat te doen bij een stop (events) en feestdagen tijdens de reis. Namen volgen Accept-Language (http.js).

/** [{ date (UTC-middernacht), countryCode, countryName, name, localName }] */
export async function getHolidays(tripId) {
  const { data } = await http.get(`/trips/${tripId}/holidays`)
  return data
}

/**
 * Events rond een stop tijdens de dagen dat je er bent (leeg zonder event-provider):
 * [{ id, name, startUtc, localDate, localTime, venueName, latitude, longitude, minPrice, currency, url, imageUrl, category, dayNumber }]
 */
export async function getStopEvents(tripId, stopId) {
  const { data } = await http.get(`/trips/${tripId}/stops/${stopId}/events`)
  return data
}
