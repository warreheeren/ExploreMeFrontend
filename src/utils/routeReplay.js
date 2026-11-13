// Helpers voor de geanimeerde route-replay op de reiskaart.
import { buildItinerary } from './itinerary'

const sq = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

/**
 * Knipt de routegeometrie ([[lat, lon], …]) in etappes tussen opeenvolgende stops.
 * Per stop zoeken we het dichtstbijzijnde punt ná het vorige knippunt (de route loopt in volgorde).
 * Zonder bruikbare geometrie: rechte lijnen tussen de stops.
 */
export function splitRouteIntoLegs(geometry, stops) {
  const points = (stops || []).map((s) => [s.latitude, s.longitude])
  if (points.length < 2) return []
  if (!Array.isArray(geometry) || geometry.length < 2) {
    return points.slice(1).map((p, i) => [points[i], p])
  }

  const cuts = [0]
  for (let s = 1; s < points.length; s++) {
    const from = cuts[s - 1]
    let best = from
    let bestDist = Infinity
    for (let i = from; i < geometry.length; i++) {
      const d = sq(geometry[i], points[s])
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    cuts.push(s === points.length - 1 ? geometry.length - 1 : best)
  }

  return cuts.slice(1).map((end, i) => {
    const leg = geometry.slice(cuts[i], end + 1)
    // Twee stops op dezelfde plek: toch een (nul-)etappe zodat de telling klopt.
    return leg.length >= 2 ? leg : [points[i], points[i + 1]]
  })
}

/** Deel van een etappe na voortgang t (0–1), op basis van afgelegde (benaderde) afstand. */
export function partialLeg(points, t) {
  if (!points?.length) return []
  if (t >= 1) return points.slice()
  if (t <= 0) return [points[0]]
  const lengths = [0]
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.sqrt(sq(points[i - 1], points[i])))
  const target = lengths[lengths.length - 1] * t
  const result = [points[0]]
  for (let i = 1; i < points.length; i++) {
    if (lengths[i] <= target) {
      result.push(points[i])
      continue
    }
    const span = lengths[i] - lengths[i - 1] || 1
    const f = (target - lengths[i - 1]) / span
    const [a, b] = [points[i - 1], points[i]]
    result.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
    break
  }
  return result
}

/** Dagnummer per stop-id volgens het dagschema (zelfde verdeling als in de dagschema-tab). */
export function dayNumberByStop(trip) {
  const map = {}
  for (const day of buildItinerary(trip)) for (const stop of day.stops) map[stop.id] = day.dayNumber
  return map
}

/** Foto's per stop-id groeperen (uit /stop-photos). */
export function photosByStop(photos) {
  const map = {}
  for (const p of photos || []) (map[p.tripStopId] ||= []).push(p)
  return map
}
