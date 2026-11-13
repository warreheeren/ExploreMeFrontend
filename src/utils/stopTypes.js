// Eén bron van waarheid voor de vier soorten stops: labels, iconen en kleuren.
// De vier tinten zijn de enige plek waar meerdere kleuren naast het accent mogen.
// Teksten (label/singular/plural) komen uit i18n: stopTypes.<Type>.<sleutel>.
import { t } from '@/i18n'

const texts = (type) => ({
  get label() { return t(`stopTypes.${type}.label`) },
  get singular() { return t(`stopTypes.${type}.singular`) },
  get plural() { return t(`stopTypes.${type}.plural`) },
})

export const STOP_TYPES = {
  Waypoint: {
    icon: 'pin',
    color: '#2563EB',
    chip: 'bg-blue-50 text-blue-700',
    soft: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-600',
  },
  Accommodation: {
    icon: 'bed',
    color: '#7C3AED',
    chip: 'bg-violet-50 text-violet-700',
    soft: 'bg-violet-50 text-violet-700',
    dot: 'bg-violet-600',
  },
  FoodSpot: {
    icon: 'utensils',
    color: '#EA580C',
    chip: 'bg-orange-50 text-orange-700',
    soft: 'bg-orange-50 text-orange-700',
    dot: 'bg-orange-600',
  },
  Activity: {
    icon: 'ticket',
    color: '#059669',
    chip: 'bg-emerald-50 text-emerald-700',
    soft: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-600',
  },
}

// Getters (niet spreaden) zodat de tekst altijd de huidige taal volgt.
for (const type of Object.keys(STOP_TYPES)) {
  Object.defineProperties(STOP_TYPES[type], Object.getOwnPropertyDescriptors(texts(type)))
}

export const STOP_TYPE_ORDER = ['Waypoint', 'Accommodation', 'FoodSpot', 'Activity']

export function stopTypeMeta(type) {
  return STOP_TYPES[type] || STOP_TYPES.Waypoint
}

/** Telt stops per type op basis van de summary-DTO (camelCase keys). */
export function countsFromSummary(stopCounts = {}) {
  return {
    Waypoint: stopCounts.waypoint || 0,
    Accommodation: stopCounts.accommodation || 0,
    FoodSpot: stopCounts.foodSpot || 0,
    Activity: stopCounts.activity || 0,
  }
}

/** Aantal nachten van een overnachting (minstens 1). */
export function nightsFor(stop) {
  if (!stop?.checkInDate || !stop?.checkOutDate) return 1
  const a = new Date(String(stop.checkInDate).slice(0, 10))
  const b = new Date(String(stop.checkOutDate).slice(0, 10))
  const n = Math.round((b - a) / 86400000)
  return n > 0 ? n : 1
}

/** Geschatte kosten uit de stops: hotelnachten × prijs + activiteiten. */
export function estimatedCost(stops = []) {
  return stops.reduce((sum, s) => {
    if (s.type === 'Accommodation' && s.pricePerNight) return sum + Number(s.pricePerNight) * nightsFor(s)
    if (s.type === 'Activity' && s.cost) return sum + Number(s.cost)
    return sum
  }, 0)
}
