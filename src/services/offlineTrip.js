// Reis offline beschikbaar maken: API-antwoorden, foto's en (waar toegestaan) kaarttegels in dezelfde caches
// steken die de service worker gebruikt (zie workbox.runtimeCaching in vite.config.js).
// De service worker draait alleen in de productiebuild/preview; in dev vult dit enkel de Cache API.
import { API_ROOT } from '@/api/http'
import { currentLocale } from '@/i18n'
import { TILE_PREFETCH_ALLOWED, TILE_URL } from '@/utils/leaflet'
import {
  CACHE_IMAGES,
  CACHE_TILES,
  CACHE_TRIP_DATA,
  forgetOfflineTrip,
  rememberOfflineTrip,
  tilesForBounds,
  tileUrl,
  tripApiUrls,
  tripBounds,
  tripImageUrls,
} from '@/utils/offlineTrips'

/** Zoomniveaus om voor te laden (alleen bij een tegeldienst die prefetchen toestaat). */
const TILE_ZOOMS = [6, 8, 10, 12]
const PARALLEL = 4

export function offlineSupported() {
  return typeof window !== 'undefined' && 'caches' in window
}

/** True wanneer een service worker de pagina beheert (dus offline echt uit de cache kan serveren). */
export function serviceWorkerActive() {
  return typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller
}

async function fetchJsonInto(cache, url) {
  const token = (() => { try { return localStorage.getItem('token') } catch { return null } })()
  const headers = { Accept: 'application/json', 'Accept-Language': currentLocale() }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { headers, credentials: 'same-origin' })
  if (!res.ok) return null
  await cache.put(url, res.clone())
  return res.json().catch(() => null)
}

async function fetchInto(cache, url) {
  const sameOrigin = new URL(url, window.location.href).origin === window.location.origin
  // Externe foto's/tegels zonder CORS worden "opaque" bewaard; de service worker accepteert status 0.
  const res = await fetch(url, sameOrigin ? {} : { mode: 'no-cors' })
  if (res.ok || res.type === 'opaque') await cache.put(url, res)
}

/** Voert taken uit met beperkte parallelliteit en meldt de voortgang; mislukte taken worden overgeslagen. */
async function runLimited(tasks, onDone) {
  let index = 0
  const worker = async () => {
    while (index < tasks.length) {
      const task = tasks[index++]
      try { await task() } catch { /* één mislukte download breekt de rest niet */ }
      onDone()
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, tasks.length) }, worker))
}

/**
 * Laadt alles wat de reispagina nodig heeft in de caches. onProgress(done, total).
 * Geeft { urls, tiles } terug; `tiles` is 0 wanneer de tegeldienst prefetchen niet toestaat.
 */
export async function makeTripAvailableOffline(trip, onProgress = () => {}) {
  if (!offlineSupported()) throw new Error('unsupported')
  const dataCache = await caches.open(CACHE_TRIP_DATA)
  const apiUrls = tripApiUrls(trip, API_ROOT)

  // 1. API-gegevens (eerst, want posts/dagboek/album bepalen welke foto's we nodig hebben).
  let done = 0
  const results = {}
  onProgress(done, apiUrls.length)
  await runLimited(apiUrls.map((url) => async () => { results[url] = await fetchJsonInto(dataCache, url) }), () => onProgress(++done, apiUrls.length))

  const base = `${API_ROOT}/api/trips/${trip.id}`
  const imageUrls = tripImageUrls(trip, {
    posts: results[`${base}/posts?take=30`] || [],
    journal: results[`${base}/journal`] || [],
    photos: [...(results[`${base}/stop-photos`] || []), ...(results[`${base}/recap`]?.photos || [])],
  })

  // 2. Kaarttegels: alleen bij een eigen tegeldienst die het toestaat (max. MAX_PREFETCH_TILES = 300 tegels).
  const tiles = TILE_PREFETCH_ALLOWED ? tilesForBounds(tripBounds(trip.stops), TILE_ZOOMS) : []
  const tileUrls = tiles.map((t) => tileUrl(TILE_URL, t))

  const total = apiUrls.length + imageUrls.length + tileUrls.length
  const imageCache = await caches.open(CACHE_IMAGES)
  const tileCache = await caches.open(CACHE_TILES)
  await runLimited(
    [...imageUrls.map((u) => () => fetchInto(imageCache, u)), ...tileUrls.map((u) => () => fetchInto(tileCache, u))],
    () => onProgress(++done, total),
  )

  rememberOfflineTrip({ id: trip.id, title: trip.title, urls: apiUrls })
  return { urls: apiUrls.length, images: imageUrls.length, tiles: tileUrls.length }
}

/** Haalt de reisgegevens uit de cache en uit de lijst (foto's/tegels verlopen vanzelf via workbox). */
export async function removeTripOffline(trip) {
  if (offlineSupported()) {
    try {
      const cache = await caches.open(CACHE_TRIP_DATA)
      await Promise.all(tripApiUrls({ ...trip, canEdit: true }, API_ROOT).map((u) => cache.delete(u)))
    } catch {
      // Cache niet beschikbaar: de lijst opschonen volstaat.
    }
  }
  return forgetOfflineTrip(trip.id)
}
