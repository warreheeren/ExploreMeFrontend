// Deeplinks voor een OV-been (trein/bus) tussen twee stops: Google Maps (transit), Trainline en NS (alleen als
// beide stops in Nederland liggen). Altijd getoond, ook wanneer de echte OV-reis (Transitous) niet lukte.
// Stops: { name, address?, latitude, longitude }. Alle waarden gaan door encodeURIComponent.

import { placeFromAddress } from './stayLinks'

const GOOGLE_DIR_URL = 'https://www.google.com/maps/dir/'
const TRAINLINE_URL = 'https://www.thetrainline.com/en/train-times/'
const NS_URL = 'https://www.ns.nl/reisplanner/#/'

/** Landnamen (laatste adresdeel) die op Nederland wijzen; de plaatszoeker geeft ze in de taal van de gebruiker. */
const NL_NAMES = new Set(['nederland', 'netherlands', 'the netherlands', 'holland', 'nl', 'pays-bas', 'niederlande'])

/**
 * Ruw kader rond Nederland ten noorden van 51,5° (zonder Vlaanderen); alleen gebruikt als het adres geen land noemt.
 * Zuid-Limburg en Zeeuws-Vlaanderen vallen erbuiten: dan liever geen NS-link dan een foute.
 */
const NL_BOX = { minLat: 51.5, maxLat: 53.7, minLon: 3.3, maxLon: 7.25 }

function hasCoordinates(stop) {
  return Number.isFinite(Number(stop?.latitude)) && Number.isFinite(Number(stop?.longitude))
}

/** "52.37,4.9" met max. 5 decimalen (≈ 1 m). */
function coordinate(stop) {
  const round = (n) => String(Math.round(Number(n) * 1e5) / 1e5)
  return `${round(stop.latitude)},${round(stop.longitude)}`
}

/** Nederlandse postcode vooraan een adresdeel: "1012 AB Amsterdam" → "Amsterdam". */
const NL_POSTCODE_PLACE = /^\d{4}\s?[A-Z]{2}\s+(\D+)$/

/** Plaatsnaam van een stop: de plaats uit het adres, anders de naam van de stop. */
export function placeName(stop) {
  const parts = String(stop?.address || '').split(',').map((p) => p.trim())
  const dutch = parts.map((p) => NL_POSTCODE_PLACE.exec(p)?.[1]?.trim()).find(Boolean)
  return dutch || placeFromAddress(stop?.address, '') || String(stop?.name || '').trim()
}

/** "Den Haag Centraal" → "den-haag-centraal"; accenten weg, alles behalve letters/cijfers wordt een streepje. */
export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Ligt de stop in Nederland? Het land in het adres beslist; zonder land het kader rond (Noord-)Nederland. */
export function isInNetherlands(stop) {
  const parts = String(stop?.address || '').split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)
  const country = parts.length > 1 ? parts[parts.length - 1] : ''
  if (country && !/\d/.test(country) && country !== placeName(stop).toLowerCase()) return NL_NAMES.has(country)
  if (!hasCoordinates(stop)) return false
  const lat = Number(stop.latitude)
  const lon = Number(stop.longitude)
  return lat >= NL_BOX.minLat && lat <= NL_BOX.maxLat && lon >= NL_BOX.minLon && lon <= NL_BOX.maxLon
}

/** Google Maps-routeplanner met openbaar vervoer tussen de coördinaten van beide stops; null zonder coördinaten. */
export function googleTransitUrl(from, to) {
  if (!hasCoordinates(from) || !hasCoordinates(to)) return null
  const params = [
    ['api', '1'],
    ['origin', coordinate(from)],
    ['destination', coordinate(to)],
    ['travelmode', 'transit'],
  ]
  return `${GOOGLE_DIR_URL}?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
}

/**
 * Trainline-dienstregelingpagina "{van}-to-{naar}" op plaatsnaam (de zoek-URL met parameters is niet stabiel).
 * Null als een van beide plaatsen geen bruikbare naam heeft of ze gelijk zijn.
 */
export function trainlineUrl(from, to) {
  const a = slugify(placeName(from))
  const b = slugify(placeName(to))
  if (!a || !b || a === b) return null
  return `${TRAINLINE_URL}${encodeURIComponent(a)}-to-${encodeURIComponent(b)}`
}

/**
 * NS-reisplanner met vertrek en aankomst op plaatsnaam (de planner zoekt zelf het station of adres).
 * Alleen als beide stops in Nederland liggen; anders null.
 */
export function nsUrl(from, to) {
  if (!isInNetherlands(from) || !isInNetherlands(to)) return null
  const a = placeName(from)
  const b = placeName(to)
  if (!a || !b) return null
  return `${NS_URL}?vertrek=${encodeURIComponent(a)}&aankomst=${encodeURIComponent(b)}`
}

/** Alle beschikbare deeplinks voor een OV-been, in vaste volgorde: [{ key: 'google'|'trainline'|'ns', url }]. */
export function transitLinks(from, to) {
  return [
    ['google', googleTransitUrl(from, to)],
    ['trainline', trainlineUrl(from, to)],
    ['ns', nsUrl(from, to)],
  ]
    .filter(([, url]) => url)
    .map(([key, url]) => ({ key, url }))
}
