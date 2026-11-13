// Deeplinks om een verblijf te checken op Booking.com en Google Hotels (fase 3, "verblijven checken").
// Naam + plaats, check-in/out (kalenderdatums als YYYY-MM-DD) en het aantal volwassenen zijn al ingevuld.
// Alle waarden gaan door encodeURIComponent; ontbrekende datums laten we weg (zoeken op naam blijft nuttig).

import { toDateInput } from './date'

export const MIN_ADULTS = 1
export const MAX_ADULTS = 8
const DEFAULT_ADULTS = 2

const BOOKING_URL = 'https://www.booking.com/searchresults.html'
const GOOGLE_HOTELS_URL = 'https://www.google.com/travel/hotels'

const DIGIT = /\d/

/** Aantal volwassenen als geheel getal binnen 1–8 (standaard 2). */
export function clampAdults(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n <= 0) return value == null || value === '' ? DEFAULT_ADULTS : MIN_ADULTS
  return Math.min(MAX_ADULTS, Math.max(MIN_ADULTS, n))
}

/** Woorden met cijfers (postcodes, huisnummers) weg: "4260 Bled" → "Bled". */
function withoutNumbers(part) {
  return part.split(/\s+/).filter((w) => w && !DIGIT.test(w)).join(' ').trim()
}

/**
 * De plaats uit een adres: het laatste zinvolle deel (meestal de stad). Volgt het adresformaat van de
 * plaatszoeker ("Straat 1, 4260 Bled, Slovenië"), maar werkt ook met vrije invoer:
 * - een deel dat met een postcode begint is de plaats;
 * - bij 3+ delen het voorlaatste (het laatste is meestal het land);
 * - bij 2 delen het tweede als het eerste een straat met huisnummer is, anders het eerste ("Bled, Slovenië").
 * Geeft '' wanneer er niets bruikbaars is of de plaats gelijk is aan de naam van het verblijf.
 */
export function placeFromAddress(address, name = '') {
  const parts = String(address || '').split(',').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return ''

  let place = ''
  const withPostcode = [...parts].reverse().find((p) => DIGIT.test(p.split(/\s+/)[0]) && withoutNumbers(p))
  if (withPostcode) place = withoutNumbers(withPostcode)
  else if (parts.length >= 3) place = withoutNumbers(parts[parts.length - 2])
  else if (parts.length === 2) place = withoutNumbers(DIGIT.test(parts[0].split(/\s+/).pop()) ? parts[1] : parts[0])
  else place = withoutNumbers(parts[0])

  return place && place.toLowerCase() !== String(name || '').trim().toLowerCase() ? place : ''
}

function buildUrl(base, params) {
  const query = params
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return query ? `${base}?${query}` : base
}

function searchParts(stop, city) {
  const name = String(stop?.name || '').trim()
  const place = city != null && String(city).trim() ? String(city).trim() : placeFromAddress(stop?.address, name)
  return { name, place }
}

/**
 * Booking.com-zoekresultaten voor een verblijf.
 * @param {{ name: string, address?: string, checkInDate?: string, checkOutDate?: string }} stop
 * @param {{ adults?: number, affiliateId?: string|null, city?: string }} [options]
 */
export function bookingUrl(stop, { adults, affiliateId, city } = {}) {
  const { name, place } = searchParts(stop, city)
  return buildUrl(BOOKING_URL, [
    ['ss', place ? `${name}, ${place}` : name],
    ['checkin', toDateInput(stop?.checkInDate)],
    ['checkout', toDateInput(stop?.checkOutDate)],
    ['group_adults', clampAdults(adults)],
    ['no_rooms', 1],
    ['group_children', 0],
    ['aid', affiliateId ? String(affiliateId).trim() : ''],
  ])
}

/**
 * Google Hotels-zoekopdracht. Google negeert onbekende parameters; werken de datums niet, dan blijft de
 * zoekopdracht op naam + plaats nuttig.
 * @param {{ name: string, address?: string, checkInDate?: string, checkOutDate?: string }} stop
 * @param {{ adults?: number, city?: string }} [options]
 */
export function googleHotelsUrl(stop, { adults, city } = {}) {
  const { name, place } = searchParts(stop, city)
  return buildUrl(GOOGLE_HOTELS_URL, [
    ['q', place ? `${name} ${place}` : name],
    ['checkin', toDateInput(stop?.checkInDate)],
    ['checkout', toDateInput(stop?.checkOutDate)],
    ['adults', clampAdults(adults)],
  ])
}
