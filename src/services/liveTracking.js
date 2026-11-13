// Live locatie op de achtergrond (alleen native app, @capacitor-community/background-geolocation).
//
// Opt-in, zoals de bestaande live locatie: de gebruiker plaatst een story mét locatie bij een reis die nu bezig is
// en zet "live bijwerken" aan. Daarna verschuift de app de positie van die story (POST /api/trips/{id}/live):
// - hoogstens om de 2 minuten én pas na 100 m verplaatsing;
// - stopt vanzelf als de story verloopt of de reis voorbij is (`until`), als de API 404/403/401 geeft (story weg,
//   geen deelnemer meer, uitgelogd) of als de gebruiker op "Stoppen" tikt;
// - Android toont zolang een vaste melding (verplicht voor locatie op de achtergrond).
//
// Verzoeken gaan via CapacitorHttp (native HTTP): Android knijpt fetch/XHR uit de WebView af na ~5 min op de achtergrond.

import { reactive } from 'vue'
import { isNative } from '@/services/native'
import { API_ROOT } from '@/api/http'
import { currentLocale, t } from '@/i18n'

export const MIN_INTERVAL_MS = 2 * 60 * 1000
export const MIN_DISTANCE_M = 100
const STORAGE_KEY = 'liveTracking'
/** setTimeout aanvaardt maximaal ~24,8 dagen. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1

/** Zichtbare toestand (banner op de reispagina). */
export const liveTracking = reactive({ active: false, tripId: null, tripTitle: '', until: null })

let watcherId = null
let stopTimer = null
let flushTimer = null
let lastSent = null // { latitude, longitude, at }
let pending = null // { latitude, longitude }

let plugin = null
/** Het pakket heeft geen JS-entry (alleen types): de plugin wordt via registerPlugin aan de native kant gekoppeld. */
const loadPlugin = async () => {
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    plugin = registerPlugin('BackgroundGeolocation')
  }
  return plugin
}

/** Afstand in meter tussen twee punten (haversine). */
export function distanceMeters(a, b) {
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Throttle: de eerste positie altijd; daarna pas na 2 minuten én 100 m. */
export function shouldSend(last, next, now = Date.now()) {
  if (!next) return false
  if (!last) return true
  return now - last.at >= MIN_INTERVAL_MS && distanceMeters(last, next) >= MIN_DISTANCE_M
}

/**
 * Tot wanneer volgen: het vroegste van het einde van de story en het einde van de laatste reisdag
 * (`tripEndDate` is UTC-middernacht van die dag). Geeft een timestamp in ms, of null als het al voorbij is.
 */
export function trackingUntil(storyExpiresAt, tripEndDate, now = Date.now()) {
  const candidates = []
  const expires = Date.parse(storyExpiresAt)
  if (Number.isFinite(expires)) candidates.push(expires)
  const tripEnd = Date.parse(tripEndDate)
  if (Number.isFinite(tripEnd)) candidates.push(tripEnd + 24 * 60 * 60 * 1000)
  if (!candidates.length) return null
  const until = Math.min(...candidates)
  return until > now ? until : null
}

/** Is de reis vandaag bezig? (start/einde als UTC-middernacht, einde inclusief.) */
export function isTripActive(trip, now = Date.now()) {
  const start = Date.parse(trip?.startDate)
  const end = Date.parse(trip?.endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  return now >= start && now < end + 24 * 60 * 60 * 1000
}

function persist() {
  try {
    if (liveTracking.active) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tripId: liveTracking.tripId, tripTitle: liveTracking.tripTitle, until: liveTracking.until }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // geen storage: na een herstart van de app loopt het volgen dan niet verder (veilige kant)
  }
}

async function send(location) {
  const token = localStorage.getItem('token')
  if (!token) return stopLiveTracking()
  const { CapacitorHttp } = await import('@capacitor/core')
  try {
    const response = await CapacitorHttp.post({
      url: `${API_ROOT}/api/trips/${encodeURIComponent(liveTracking.tripId)}/live`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Language': currentLocale() },
      data: { latitude: location.latitude, longitude: location.longitude },
    })
    if ([401, 403, 404].includes(response.status)) return stopLiveTracking()
    if (response.status >= 200 && response.status < 300) {
      lastSent = { latitude: location.latitude, longitude: location.longitude, at: Date.now() }
    }
  } catch {
    // offline: de volgende positie probeert het opnieuw
  }
}

function flush() {
  flushTimer = null
  if (!liveTracking.active || !pending) return
  if (Date.now() >= liveTracking.until) return stopLiveTracking()
  if (!shouldSend(lastSent, pending)) {
    // Te vroeg (of te dichtbij): de positie blijft klaarstaan voor het einde van het interval.
    if (lastSent && Date.now() - lastSent.at < MIN_INTERVAL_MS) scheduleFlush()
    return
  }
  const location = pending
  pending = null
  return send(location)
}

function scheduleFlush() {
  if (flushTimer || !lastSent) return
  flushTimer = setTimeout(flush, Math.max(0, lastSent.at + MIN_INTERVAL_MS - Date.now()))
}

function onLocation(location, error) {
  if (error) {
    if (error.code === 'NOT_AUTHORIZED') stopLiveTracking()
    return
  }
  if (!location || !liveTracking.active) return
  pending = { latitude: location.latitude, longitude: location.longitude }
  flush()
}

async function startWatcher() {
  const geolocation = await loadPlugin()
  watcherId = await geolocation.addWatcher(
    {
      backgroundTitle: t('nativeApp.live.notificationTitle'),
      backgroundMessage: t('nativeApp.live.notificationText', { trip: liveTracking.tripTitle }),
      requestPermissions: true,
      stale: false,
      distanceFilter: MIN_DISTANCE_M,
    },
    onLocation
  )
  clearTimeout(stopTimer)
  stopTimer = setTimeout(stopLiveTracking, Math.min(MAX_TIMEOUT_MS, Math.max(0, liveTracking.until - Date.now())))
}

/**
 * Start (of herstart) het volgen voor één reis. `until` in ms (zie trackingUntil). Geeft false buiten de native app
 * of als het niet kon starten (geen toestemming, plugin ontbreekt).
 */
export async function startLiveTracking({ tripId, tripTitle = '', until }) {
  if (!isNative || !tripId || !Number.isFinite(until) || until <= Date.now()) return false
  await stopLiveTracking()
  Object.assign(liveTracking, { active: true, tripId, tripTitle, until })
  lastSent = null
  pending = null
  try {
    await startWatcher()
    persist()
    return true
  } catch {
    await stopLiveTracking()
    return false
  }
}

export async function stopLiveTracking() {
  clearTimeout(stopTimer)
  clearTimeout(flushTimer)
  stopTimer = null
  flushTimer = null
  pending = null
  lastSent = null
  const id = watcherId
  watcherId = null
  Object.assign(liveTracking, { active: false, tripId: null, tripTitle: '', until: null })
  persist()
  if (id) {
    try {
      await (await loadPlugin()).removeWatcher({ id })
    } catch {
      // watcher was al weg
    }
  }
}

/** Na een herstart van de app: een lopende sessie verder zetten als ze nog geldig is. */
export async function resumeLiveTracking() {
  if (!isNative || liveTracking.active) return
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    saved = null
  }
  if (!saved?.tripId || !(saved.until > Date.now())) {
    persist()
    return
  }
  await startLiveTracking({ tripId: saved.tripId, tripTitle: saved.tripTitle || '', until: saved.until })
}
