// Boekingen importeren via AI: van een voorstel (BookingDraftDto) naar een bewerkbaar item, en van dat item naar de
// payloads van de bestaande stop- en uitgave-endpoints. Puur en testbaar; teksten komen uit i18n (bookingImport.*).
import { dateInputToIso, diffDays, toDateInput, tripDays } from './date'
import { normalizeFlightNumber } from './flights'

export const MAX_BOOKING_TEXT = 20000

export const BOOKING_KINDS = ['accommodation', 'flight', 'train', 'bus', 'ferry', 'car_rental', 'activity', 'restaurant', 'other']

const TRANSPORT = new Set(['flight', 'train', 'bus', 'ferry'])

export const KIND_ICONS = {
  accommodation: 'bed',
  flight: 'plane',
  train: 'train',
  bus: 'bus',
  ferry: 'ship',
  car_rental: 'car',
  activity: 'ticket',
  restaurant: 'utensils',
  other: 'pin',
}

/** Stoptype en vervoerswijze per soort boeking (autohuur wordt geen stop). */
const KIND_STOP = {
  accommodation: { type: 'Accommodation', mode: null, category: 'Accommodation' },
  flight: { type: 'Waypoint', mode: 'Plane', category: 'Transport' },
  train: { type: 'Waypoint', mode: 'Train', category: 'Transport' },
  bus: { type: 'Waypoint', mode: 'Bus', category: 'Transport' },
  ferry: { type: 'Waypoint', mode: 'Ferry', category: 'Transport' },
  car_rental: { type: null, mode: null, category: 'Transport' },
  activity: { type: 'Activity', mode: null, category: 'Activity' },
  restaurant: { type: 'FoodSpot', mode: null, category: 'Food' },
  other: { type: 'Waypoint', mode: null, category: 'Other' },
}

export const isTransport = (kind) => TRANSPORT.has(kind)

let keySeq = 0

/** Bewerkbaar item uit een voorstel van de API. Standaard: meenemen, uitgave als er een prijs is, PDF bij het eerste item. */
export function toEditable(draft, index = 0) {
  const price = typeof draft.price === 'number' && draft.price > 0 ? draft.price : null
  return {
    _key: `booking-${++keySeq}`,
    include: true,
    kind: BOOKING_KINDS.includes(draft.kind) ? draft.kind : 'other',
    name: draft.name || '',
    address: draft.address || '',
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
    placeId: draft.placeId || null,
    startDate: toDateInput(draft.startDate),
    startTime: draft.startTime || '',
    endDate: toDateInput(draft.endDate),
    endTime: draft.endTime || '',
    price: price ?? '',
    currency: draft.currency || 'EUR',
    description: draft.description || '',
    flightNumber: draft.flightNumber || '',
    createExpense: price !== null,
    attachPdf: index === 0,
  }
}

/** Soort wijzigen: de rest van het item blijft staan. */
export function changeKind(item, kind) {
  return { ...item, kind: BOOKING_KINDS.includes(kind) ? kind : 'other' }
}

export function stopTypeFor(item) {
  return (KIND_STOP[item.kind] || KIND_STOP.other).type
}

export function createsStop(item) {
  return stopTypeFor(item) !== null
}

export function hasLocation(item) {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
}

/** Reisdag (1-based) van het item: bij vervoer de aankomstdag. Overnachtingen landen via hun check-in (null). */
export function dayNumberFor(item, trip) {
  const type = stopTypeFor(item)
  if (!type || type === 'Accommodation') return null
  const date = isTransport(item.kind) ? item.endDate || item.startDate : item.startDate
  if (!date) return null
  const day = diffDays(trip.startDate, date) + 1
  return day >= 1 && day <= tripDays(trip.startDate, trip.endDate) ? day : null
}

export function nightsFor(item) {
  if (!item.startDate || !item.endDate) return 0
  return Math.max(0, diffDays(item.startDate, item.endDate))
}

function amount(item) {
  const n = Number(item.price)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

const clip = (text, max) => {
  const s = (text || '').trim()
  return s.length > max ? s.slice(0, max).trimEnd() : s
}

/** Payload voor POST /trips/{id}/stops (CreateTripStopRequest). Bedragen alleen in de basismunt van de reis. */
export function toStopPayload(item, trip) {
  const type = stopTypeFor(item)
  const meta = KIND_STOP[item.kind] || KIND_STOP.other
  const price = item.currency === (trip.baseCurrency || 'EUR') ? amount(item) : null
  const stay = type === 'Accommodation'
  const nights = nightsFor(item)
  const time = isTransport(item.kind) ? item.endTime : stay ? '' : item.startTime
  return {
    name: clip(item.name, 200),
    description: clip(item.description, 2000) || null,
    address: clip(item.address, 300) || null,
    imageUrl: null,
    latitude: item.latitude,
    longitude: item.longitude,
    orderIndex: -1,
    type,
    rating: null,
    cuisineType: null,
    priceLevel: null,
    checkInDate: stay ? dateInputToIso(item.startDate) : null,
    checkOutDate: stay && item.endDate && item.endDate >= item.startDate ? dateInputToIso(item.endDate) : null,
    pricePerNight: stay && price && nights > 0 ? Math.round((price / nights) * 100) / 100 : null,
    duration: null,
    cost: type === 'Activity' ? price : null,
    placeId: item.placeId || null,
    dayNumber: dayNumberFor(item, trip),
    startTime: time || null,
    arrivalMode: meta.mode || 'Car',
    ...flightFields(item),
  }
}

/** Vluchtnummer + lokale vertrekdatum (= begindatum van de boeking) voor de vluchtstatus; alleen bij een geldige vlucht. */
function flightFields(item) {
  const flightNumber = item.kind === 'flight' ? normalizeFlightNumber(item.flightNumber) : null
  const date = item.startDate || item.endDate
  return flightNumber && date
    ? { flightNumber, flightDate: dateInputToIso(date) }
    : { flightNumber: null, flightDate: null }
}

/** Payload voor POST /trips/{id}/expenses, of null wanneer er geen bedrag is. */
export function toExpensePayload(item) {
  const value = amount(item)
  if (!value) return null
  return {
    title: clip(item.name, 120),
    amount: value,
    category: (KIND_STOP[item.kind] || KIND_STOP.other).category,
    date: dateInputToIso(item.startDate),
    paidByUserName: null,
    note: clip(item.description, 500) || null,
    currency: item.currency || null,
  }
}

/** Wat ontbreekt er nog voor dit item aangemaakt kan worden? null = in orde. */
export function missingFor(item) {
  if (!item.include) return null
  if (!item.name.trim()) return 'name'
  if (createsStop(item) && !hasLocation(item)) return 'location'
  if (!createsStop(item) && !(item.createExpense && amount(item))) return 'nothing'
  return null
}
