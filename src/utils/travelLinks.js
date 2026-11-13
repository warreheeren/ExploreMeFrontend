// Partnerdeeplinks voor eSIM (Airalo) en autohuur (DiscoverCars). Zonder partner-/affiliate-id blijven het gewone
// links; de ids zijn publiek (komen uit GET /api/integrations/status) en gaan door encodeURIComponent.

import { toDateInput } from './date'

const AIRALO_URL = 'https://www.airalo.com/'
const DISCOVER_CARS_URL = 'https://www.discovercars.com/'
const DEFAULT_AIRALO_PARAM = 'ref'

/** Attributen voor elke partnerlink: nieuw tabblad, gemarkeerd als gesponsord, zonder referrer-lek. */
export const PARTNER_LINK_ATTRS = Object.freeze({ target: '_blank', rel: 'sponsored noopener noreferrer' })

/** "Côte d'Ivoire" → "cote-divoire": zonder accenten, lowercase, kebab-case (zelfde regels als de backend). */
export function slugify(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Airalo-landpagina voor een Engelse landnaam ("United States" → /united-states-esim).
 * @param {string} countryName Engelse naam van het land
 * @param {string|null} [partnerId] Integrations:Airalo:PartnerId
 * @param {string|null} [queryParam] Integrations:Airalo:QueryParam (standaard "ref")
 * @returns {string|null} null zonder bruikbare naam
 */
export function airaloUrl(countryName, partnerId = null, queryParam = null) {
  const slug = slugify(countryName)
  if (!slug) return null
  const url = `${AIRALO_URL}${slug}-esim`
  const id = String(partnerId ?? '').trim()
  if (!id) return url
  const param = String(queryParam ?? '').trim() || DEFAULT_AIRALO_PARAM
  return `${url}?${encodeURIComponent(param)}=${encodeURIComponent(id)}`
}

/**
 * Aaneengesloten autoritten in een route: per eerste leg van een reeks Car-legs de index van de laatste stop van die
 * reeks ({ [fromIndex]: toIndex }). Zo tonen we één "auto huren"-link per reeks (ophalen bij de eerste stop,
 * inleveren op de dag van de laatste) in plaats van op elke leg — Car is ook de standaard-vervoerswijze.
 * @param {Array<{ fromIndex: number, toIndex: number, mode?: string }>} legs
 */
export function carRentalRuns(legs = []) {
  const runs = {}
  let start = null
  for (const leg of legs) {
    const isCar = !leg.mode || leg.mode === 'Car'
    if (isCar && start !== null && runs[start] === leg.fromIndex) {
      runs[start] = leg.toIndex
    } else if (isCar) {
      start = leg.fromIndex
      runs[start] = leg.toIndex
    } else {
      start = null
    }
  }
  return runs
}

/**
 * DiscoverCars-zoekopdracht met plaats en ophaal-/inleverdatum (kalenderdatums als YYYY-MM-DD; ontbrekende datums
 * vallen weg). Een inleverdatum vóór de ophaaldatum laten we weg in plaats van een ongeldige zoekopdracht te maken.
 * @param {{ place: string, pickup?: string|Date|null, dropoff?: string|Date|null, affiliateId?: string|null }} options
 * @returns {string|null} null zonder plaats
 */
export function discoverCarsUrl({ place, pickup = null, dropoff = null, affiliateId = null } = {}) {
  const location = String(place || '').trim()
  if (!location) return null
  const pick = toDateInput(pickup)
  let drop = toDateInput(dropoff)
  if (pick && drop && drop < pick) drop = ''

  const params = [
    ['a_aid', String(affiliateId ?? '').trim()],
    ['location', location],
    ['pick_date', pick],
    ['drop_date', drop],
  ].filter(([, value]) => value)
  return `${DISCOVER_CARS_URL}?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
}
