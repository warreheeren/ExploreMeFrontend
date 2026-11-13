// Helpers voor de veiligheids-check-in.

import { parseTimestamp } from './date'

/** Minimaal en maximaal vooraf, zoals de backend afdwingt. */
export const MIN_LEAD_MINUTES = 15
export const MAX_LEAD_HOURS = 48
/** Zo vaak wordt de locatie bijgewerkt terwijl de app open is en de gebruiker dat aanvinkte. */
export const LOCATION_INTERVAL_MS = 5 * 60 * 1000

/** Snelle keuzes voor de deadline (minuten vanaf nu). */
export const DEADLINE_PRESETS = [60, 120, 240, 480]
export const GRACE_OPTIONS = [15, 30, 60]
export const EXTEND_OPTIONS = [30, 60]

/** Resterende milliseconden tot de deadline (negatief = voorbij). */
export function msUntil(dueAtUtc, now = new Date()) {
  const due = parseTimestamp(dueAtUtc)
  return due ? due.getTime() - now.getTime() : 0
}

/**
 * Compacte aftelling: "2:05" (uur:min) boven het uur, "45 min" eronder, "3:20" (min:sec) in de laatste
 * 5 minuten en met een min-teken als de deadline voorbij is ("-4 min").
 */
export function formatCountdown(ms) {
  const negative = ms < 0
  const abs = Math.abs(ms)
  const totalSeconds = Math.floor(abs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const sign = negative ? '-' : ''
  if (!negative && minutes < 5) {
    return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`
  }
  if (minutes < 60) return `${sign}${Math.max(1, minutes)} min`
  const hours = Math.floor(minutes / 60)
  return `${sign}${hours}:${String(minutes % 60).padStart(2, '0')}`
}

/** "warning" in het laatste kwartier, "overdue" na de deadline, anders "ok". */
export function countdownState(ms) {
  if (ms < 0) return 'overdue'
  if (ms <= MIN_LEAD_MINUTES * 60 * 1000) return 'warning'
  return 'ok'
}

/** Waarde voor <input type="datetime-local"> in lokale tijd. */
export function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "YYYY-MM-DDTHH:mm" (lokale tijd) → Date, of null. */
export function fromLocalInput(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value || '')
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
}

/** null als de deadline geldig is, anders 'tooSoon' of 'tooLate'. */
export function validateDeadline(date, now = new Date()) {
  if (!date) return 'tooSoon'
  const minutes = (date.getTime() - now.getTime()) / 60000
  if (minutes < MIN_LEAD_MINUTES) return 'tooSoon'
  if (minutes > MAX_LEAD_HOURS * 60) return 'tooLate'
  return null
}

/** IANA-tijdzone van de browser (voor de deadline in de mail aan het noodcontact). */
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}
