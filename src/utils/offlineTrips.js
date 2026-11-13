// Pure helpers voor "offline beschikbaar maken": lijst in localStorage, te cachen URL's en kaarttegels.
import { thumbUrl } from './media'

const STORAGE_KEY = 'offlineTrips'

/** Cachenamen; moeten overeenkomen met workbox.runtimeCaching in vite.config.js. */
export const CACHE_TRIP_DATA = 'trip-data'
export const CACHE_IMAGES = 'images'
export const CACHE_TILES = 'map-tiles'

/** Harde bovengrens voor voorgeladen kaarttegels per reis (houdt de belasting van de tegelserver bescheiden). */
export const MAX_PREFETCH_TILES = 300
/** Harde bovengrens voor voorgeladen foto's per reis. */
export const MAX_PREFETCH_IMAGES = 80

// ---------- lijst van offline reizen (per apparaat) ----------

/** [{ id, title, savedAt }] — leeg wanneer storage niet beschikbaar is. */
export function getOfflineTrips() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === 'string') : []
  } catch {
    return []
  }
}

function saveOfflineTrips(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Geen opslag (privévenster/vol): de cache werkt nog, alleen de lijst onthouden we niet.
  }
}

export function getOfflineTrip(id) {
  return getOfflineTrips().find((t) => t.id === id) || null
}

export function rememberOfflineTrip({ id, title, urls = [] }, now = new Date()) {
  const list = getOfflineTrips().filter((t) => t.id !== id)
  list.unshift({ id, title, savedAt: now.toISOString(), urls })
  saveOfflineTrips(list)
  return list
}

export function forgetOfflineTrip(id) {
  const list = getOfflineTrips().filter((t) => t.id !== id)
  saveOfflineTrips(list)
  return list
}

// ---------- te cachen gegevens ----------

/**
 * API-URL's die de reispagina gebruikt (exact zoals axios ze opvraagt, incl. query), zodat de
 * service worker ze offline uit de cache kan serveren.
 */
export function tripApiUrls(trip, apiRoot = '') {
  const base = `${apiRoot}/api/trips/${trip.id}`
  const urls = [base, `${base}/route`, `${base}/weather`, `${base}/journal`, `${base}/posts?take=30`, `${base}/comments?take=200`, `${base}/stop-photos`, `${base}/recap`, `${base}/country-info`]
  if (trip.canEdit) urls.push(`${base}/checklist`, `${base}/budget`, `${base}/attachments`, `${base}/polls`)
  return urls
}

/** Foto-URL's om voor te laden: cover (groot + klein), stops, posts, dagboek en albumfoto's als miniatuur. */
export function tripImageUrls(trip, { posts = [], journal = [], photos = [] } = {}) {
  const urls = new Set()
  const add = (u, thumb = true) => { if (u) urls.add(thumb ? thumbUrl(u) : u) }
  add(trip.coverImageUrl, false)
  add(trip.coverImageUrl)
  add(trip.profilePhotoUrl, false)
  for (const s of trip.stops || []) add(s.imageUrl)
  for (const p of posts) for (const u of p.imageUrls?.length ? p.imageUrls : [p.imageUrl]) add(u)
  for (const j of journal) for (const u of j.imageUrls || []) add(u)
  for (const p of photos) add(p.imageUrl)
  return [...urls].slice(0, MAX_PREFETCH_IMAGES)
}

// ---------- kaarttegels ----------

/** Omhullende van de stops met wat marge; null zonder stops. */
export function tripBounds(stops, padding = 0.1) {
  if (!stops?.length) return null
  const lats = stops.map((s) => s.latitude)
  const lons = stops.map((s) => s.longitude)
  const [south, north, west, east] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)]
  const dLat = Math.max(0.01, (north - south) * padding)
  const dLon = Math.max(0.01, (east - west) * padding)
  return {
    south: Math.max(-85, south - dLat),
    north: Math.min(85, north + dLat),
    west: Math.max(-180, west - dLon),
    east: Math.min(180, east + dLon),
  }
}

/** Web-Mercator tegelcoördinaten (slippy map) voor een punt. */
export function lonLatToTile(lon, lat, z) {
  const n = 2 ** z
  const x = Math.floor(((lon + 180) / 360) * n)
  const rad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)
  const clamp = (v) => Math.min(n - 1, Math.max(0, v))
  return { x: clamp(x), y: clamp(y) }
}

/**
 * Tegels die de omhullende afdekken, laagste zoom eerst. Stopt vóór een zoomniveau dat de limiet zou
 * overschrijden, zodat we nooit meer dan `cap` tegels opvragen.
 */
export function tilesForBounds(bounds, zooms, cap = MAX_PREFETCH_TILES) {
  if (!bounds) return []
  const tiles = []
  for (const z of [...zooms].sort((a, b) => a - b)) {
    const nw = lonLatToTile(bounds.west, bounds.north, z)
    const se = lonLatToTile(bounds.east, bounds.south, z)
    const count = (se.x - nw.x + 1) * (se.y - nw.y + 1)
    if (tiles.length + count > cap) break
    for (let x = nw.x; x <= se.x; x++) for (let y = nw.y; y <= se.y; y++) tiles.push({ z, x, y })
  }
  return tiles
}

/** Vult een Leaflet-achtige tegel-URL in ({s} = eerste subdomein). */
export function tileUrl(template, { z, x, y }, subdomain = 'a') {
  return template.replace('{s}', subdomain).replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{r}', '')
}
