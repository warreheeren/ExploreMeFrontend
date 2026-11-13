import { addDays, diffDays, parseDateOnly, tripDays } from './date'

/**
 * Verdeelt de stops van een reis over de reisdagen.
 * Stops met een vastgezette `dayNumber` landen op die dag, overnachtingen daarna op hun check-in-dag;
 * de rest wordt in volgorde proportioneel over de dagen verspreid. Binnen een dag eerst de stops
 * met een `startTime` (op tijd), dan de rest in volgorde. Lege dagen worden weggelaten.
 */
export function buildItinerary(trip) {
  if (!trip?.startDate) return []
  const total = tripDays(trip.startDate, trip.endDate)
  const days = Array.from({ length: total }, (_, i) => ({ dayNumber: i + 1, date: addDays(trip.startDate, i), stops: [] }))

  const stops = [...(trip.stops || [])].sort(byOrder)
  const floating = []

  for (const stop of stops) {
    if (Number.isInteger(stop.dayNumber) && stop.dayNumber >= 1 && stop.dayNumber <= total) {
      days[stop.dayNumber - 1].stops.push(stop)
      continue
    }
    if (stop.type === 'Accommodation' && parseDateOnly(stop.checkInDate)) {
      const index = diffDays(trip.startDate, stop.checkInDate)
      if (index >= 0 && index < total) {
        days[index].stops.push(stop)
        continue
      }
    }
    floating.push(stop)
  }

  floating.forEach((stop, i) => {
    const index = Math.min(total - 1, Math.floor((i * total) / Math.max(1, floating.length)))
    days[index].stops.push(stop)
  })

  for (const day of days) day.stops.sort(byTimeThenOrder)
  return days.filter((d) => d.stops.length > 0)
}

/** "HH:mm" (of "HH:mm:ss") → minuten sinds middernacht; null zonder tijd. */
export function timeToMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})/.exec(time || '')
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function byOrder(a, b) {
  return (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
}

function byTimeThenOrder(a, b) {
  const ta = timeToMinutes(a.startTime)
  const tb = timeToMinutes(b.startTime)
  if (ta !== null && tb !== null && ta !== tb) return ta - tb
  if ((ta === null) !== (tb === null)) return ta === null ? 1 : -1
  return byOrder(a, b)
}
