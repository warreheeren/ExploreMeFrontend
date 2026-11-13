// Deeplinks naar tours en tickets (GetYourGuide, Viator) en hulpjes voor de "Wat te doen"-dialoog.
// Partner-id's komen uit /api/integrations/status (publiek: ze staan toch in de link); zonder id een gewone zoeklink.

import { toDateInput } from './date'
import { placeFromAddress } from './stayLinks'

const MAX_NAME = 200
const MAX_DESCRIPTION = 2000
const MAX_ADDRESS = 300

/** Stoptypes waarvan de naam een zaak is (hotel, restaurant): zoek tours dan op de plaats uit het adres. */
const VENUE_TYPES = new Set(['Accommodation', 'FoodSpot'])

function clean(value) {
  return String(value ?? '').trim()
}

/** https://www.getyourguide.com/s/?q={place}&date_from=YYYY-MM-DD[&partner_id=] (datum alleen als ze geldig is). */
export function getYourGuideUrl({ place, date = null, partnerId = null } = {}) {
  const params = [`q=${encodeURIComponent(clean(place))}`]
  const day = date ? toDateInput(date) : ''
  if (day) params.push(`date_from=${day}`)
  if (clean(partnerId)) params.push(`partner_id=${encodeURIComponent(clean(partnerId))}`)
  return `https://www.getyourguide.com/s/?${params.join('&')}`
}

/** https://www.viator.com/searchResults/all?text={place}[&pid=] */
export function viatorUrl({ place, partnerId = null } = {}) {
  const params = [`text=${encodeURIComponent(clean(place))}`]
  if (clean(partnerId)) params.push(`pid=${encodeURIComponent(clean(partnerId))}`)
  return `https://www.viator.com/searchResults/all?${params.join('&')}`
}

/** Zoekterm voor tours bij een stop: bij hotels en restaurants de plaats uit het adres, anders de naam van de stop. */
export function tourPlaceFor(stop) {
  if (!stop) return ''
  if (VENUE_TYPES.has(stop.type)) {
    const place = placeFromAddress(stop.address, stop.name)
    if (place) return place
  }
  return clean(stop.name)
}

function clip(value, max) {
  const s = clean(value)
  return s.length > max ? s.slice(0, max) : s
}

/**
 * Payload voor POST /trips/{id}/stops: het event als Activity-stop op zijn reisdag. De link komt in de beschrijving;
 * de prijs alleen als kosten wanneer ze in de basismunt van de reis staat (het budget rekent niet om).
 */
export function eventToStopPayload(event, { trip, stop }) {
  const sameCurrency = event.currency && event.currency === (trip?.baseCurrency || 'EUR')
  const hasLocation = Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
  const time = /^(\d{2}):(\d{2})/.exec(event.localTime || '')
  return {
    name: clip(event.name, MAX_NAME),
    description: clip(event.url, MAX_DESCRIPTION) || null,
    address: clip(event.venueName, MAX_ADDRESS) || null,
    imageUrl: null,
    latitude: hasLocation ? event.latitude : stop.latitude,
    longitude: hasLocation ? event.longitude : stop.longitude,
    orderIndex: -1,
    type: 'Activity',
    rating: null,
    cuisineType: null,
    priceLevel: null,
    checkInDate: null,
    checkOutDate: null,
    pricePerNight: null,
    duration: null,
    cost: sameCurrency && event.minPrice != null ? event.minPrice : null,
    placeId: null,
    dayNumber: event.dayNumber ?? null,
    startTime: time ? `${time[1]}:${time[2]}` : null,
    arrivalMode: 'Car',
  }
}

/** Feestdagen gegroepeerd per dag: { 'YYYY-MM-DD': [holiday, …] } voor de chips in het dagschema. */
export function holidaysByDay(holidays) {
  const map = {}
  for (const h of holidays || []) {
    const key = toDateInput(h.date)
    if (!key) continue
    if (!map[key]) map[key] = []
    map[key].push(h)
  }
  return map
}
