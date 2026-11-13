// Logica voor de Vandaag-modus: welke reisdag het is, de stops van vandaag en de volgende stop.
import { buildItinerary, timeToMinutes } from './itinerary'
import { daysUntil, diffDays, toDateInput, todayDateOnly } from './date'

/**
 * Waar vandaag valt ten opzichte van de reis (op de lokale datum).
 * → { state: 'before' | 'during' | 'after', daysUntilStart, dayNumber, date }
 */
export function tripDayStatus(trip, now = new Date()) {
  const today = todayDateOnly(now)
  const untilStart = daysUntil(trip.startDate, now)
  if (untilStart > 0) return { state: 'before', daysUntilStart: untilStart, dayNumber: null, date: today }
  if (daysUntil(trip.endDate, now) < 0) return { state: 'after', daysUntilStart: untilStart, dayNumber: null, date: today }
  return { state: 'during', daysUntilStart: 0, dayNumber: diffDays(trip.startDate, today) + 1, date: today }
}

/** True wanneer de reis op de lokale datum van vandaag loopt. */
export function isTripRunning(trip, now = new Date()) {
  return !!trip?.startDate && tripDayStatus(trip, now).state === 'during'
}

/** Stops van vandaag, in dagschema-volgorde (vastgezette dag, tijd, volgorde). */
export function stopsForToday(trip, now = new Date()) {
  const key = toDateInput(todayDateOnly(now))
  return buildItinerary(trip).find((d) => toDateInput(d.date) === key)?.stops || []
}

/**
 * De volgende stop: de eerste niet-afgevinkte stop met een starttijd na nu,
 * anders de eerste niet-afgevinkte stop in volgorde. null als alles gedaan is.
 */
export function nextStop(stops, doneIds = [], now = new Date()) {
  const done = new Set(doneIds)
  const open = stops.filter((s) => !done.has(s.id))
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  return open.find((s) => {
    const m = timeToMinutes(s.startTime)
    return m !== null && m > minutesNow
  }) || open[0] || null
}

/** Navigatielink: geo-URI op Android (opent de standaard kaarten-app), anders Google Maps (werkt ook op iOS). */
export function navigationUrl(stop, userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const { latitude: lat, longitude: lng } = stop
  if (/android/i.test(userAgent)) return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(stop.name || '')})`
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

// ---------- afgevinkte stops (per reis en dag, alleen lokaal) ----------

const doneKey = (tripId, date) => `today-done:${tripId}:${toDateInput(date)}`

export function getDoneStops(tripId, date) {
  try {
    const parsed = JSON.parse(localStorage.getItem(doneKey(tripId, date)) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setDoneStops(tripId, date, ids) {
  try {
    localStorage.setItem(doneKey(tripId, date), JSON.stringify(ids))
  } catch {
    // geen opslag: het vinkje geldt alleen voor deze sessie
  }
}
