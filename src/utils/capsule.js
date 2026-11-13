// Tijdcapsules: openingsmoment (zelfde regel als de backend), aftelling en welke capsules de kijker al openmaakte.
import { parseTimestamp } from './date'

/** Automatische capsules gaan om 9 uur UTC open (zie TimeCapsuleService.OpenAtFor). */
const OPEN_HOUR_UTC = 9
const UNSEALED_KEY = 'capsules.unsealed'

/**
 * Openingsmoment voor een trigger: 'TripEnd' = dag na de einddatum, 'OneYear' = einddatum + 1 jaar (29 februari
 * wordt 28 februari, zoals DateTime.AddYears), 'Custom' = null (de gebruiker kiest).
 */
export function capsuleOpenAt(trigger, endDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(endDate || ''))
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])]
  if (trigger === 'TripEnd') return new Date(Date.UTC(y, mo, d + 1, OPEN_HOUR_UTC))
  if (trigger === 'OneYear') {
    const lastDay = new Date(Date.UTC(y + 1, mo + 1, 0)).getUTCDate()
    return new Date(Date.UTC(y + 1, mo, Math.min(d, lastDay), OPEN_HOUR_UTC))
  }
  return null
}

/** Resterende tijd tot de opening: { open, days, hours, minutes }. */
export function capsuleCountdown(openAtUtc, now = new Date()) {
  const at = parseTimestamp(openAtUtc)
  const ms = at ? at.getTime() - now.getTime() : 0
  if (ms <= 0) return { open: true, days: 0, hours: 0, minutes: 0 }
  const totalMinutes = Math.ceil(ms / 60000)
  return {
    open: false,
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  }
}

/** 'YYYY-MM-DDTHH:mm' in lokale tijd, voor <input type="datetime-local">. */
export function toDateTimeInput(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Standaard voor een zelf gekozen opening: morgen om 9 uur (lokaal). */
export function defaultCustomOpenInput(now = new Date()) {
  return toDateTimeInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0))
}

// Per kijker onthouden welke geopende capsules al "opengescheurd" zijn, zodat de animatie maar één keer speelt.
function readUnsealed() {
  try {
    const list = JSON.parse(localStorage.getItem(UNSEALED_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function isUnsealed(id) {
  return readUnsealed().includes(id)
}

export function markUnsealed(id) {
  try {
    const list = readUnsealed().filter((x) => x !== id)
    list.push(id)
    localStorage.setItem(UNSEALED_KEY, JSON.stringify(list.slice(-200)))
  } catch {
    // geen opslag: de animatie speelt dan opnieuw
  }
}
