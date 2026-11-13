// Datum-helpers. Twee soorten waarden komen van de API:
//  - tijdstempels (createdAtUtc, ...): ISO met "Z" → parseTimestamp
//  - kalenderdatums (startDate, checkInDate, ...): enkel het YYYY-MM-DD-deel telt → parseDateOnly
// Zo verschuift een reis nooit een dag door tijdzones.

import { localeTag, t } from '@/i18n'

const DAY_MS = 86400000
/** Taal-tag van de app ('nl-NL' of 'en-GB'), op het moment van formatteren. */
const loc = () => localeTag()

export function parseTimestamp(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const s = String(value)
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s)
  const d = new Date(hasZone || !s.includes('T') ? s : `${s}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function parseDateOnly(value) {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** 'YYYY-MM-DD' voor <input type="date">. */
export function toDateInput(value) {
  const d = parseDateOnly(value)
  if (!d) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Kalenderdatum → ISO op UTC-middernacht, zodat de backend exact die dag bewaart. */
export function dateInputToIso(value) {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`
}

export function todayDateOnly(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Aantal hele dagen tussen twee kalenderdatums (b - a). */
export function diffDays(a, b) {
  const da = parseDateOnly(a)
  const db = parseDateOnly(b)
  if (!da || !db) return 0
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate())
  return Math.round((ub - ua) / DAY_MS)
}

/** Reisduur inclusief start- en einddag (minimaal 1). */
export function tripDays(start, end) {
  return Math.max(1, diffDays(start, end) + 1)
}

/** Dagen tot een kalenderdatum vanaf vandaag (negatief = verleden). */
export function daysUntil(value, now = new Date()) {
  return diffDays(todayDateOnly(now), value)
}

export function addDays(value, days) {
  const d = parseDateOnly(value)
  if (!d) return null
  d.setDate(d.getDate() + days)
  return d
}

export function formatDate(value, options = { day: 'numeric', month: 'short' }) {
  const d = parseDateOnly(value)
  return d ? d.toLocaleDateString(loc(), options) : ''
}

export function formatLongDate(value) {
  return formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Eerste letter als hoofdletter ("woensdag 4 november" → "Woensdag 4 november"). */
export function capitalizeFirst(text) {
  const s = String(text || '')
  return s ? s[0].toLocaleUpperCase(loc()) + s.slice(1) : s
}

export function formatFullDate(value) {
  return capitalizeFirst(formatDate(value, { weekday: 'long', day: 'numeric', month: 'long' }))
}

/** "14 – 26 jun 2026", "28 jun – 3 jul 2026" of "28 dec 2025 – 3 jan 2026". */
export function formatDateRange(start, end) {
  const s = parseDateOnly(start)
  const e = parseDateOnly(end)
  if (!s && !e) return ''
  if (!s || !e) return formatDate(s || e, { day: 'numeric', month: 'short', year: 'numeric' })

  const sameYear = s.getFullYear() === e.getFullYear()
  const sameMonth = sameYear && s.getMonth() === e.getMonth()
  const endStr = e.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' })

  if (sameMonth) {
    if (s.getDate() === e.getDate()) return endStr
    return `${s.getDate()} – ${endStr}`
  }
  const startStr = s.toLocaleDateString(loc(), sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startStr} – ${endStr}`
}

export function formatTime(value) {
  const d = parseTimestamp(value)
  return d ? d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }) : ''
}

/** Compacte relatieve tijd: "zojuist", "5 min", "3 u", "2 d", "3 w", anders een datum. */
export function timeAgo(value, now = new Date()) {
  const d = parseTimestamp(value)
  if (!d) return ''
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (seconds < 60) return t('common.time.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('common.time.minutes', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('common.time.hours', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('common.time.days', { n: days })
  if (days < 30) return t('common.time.weeks', { n: Math.floor(days / 7) })
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString(loc(), sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isSameDay(a, b) {
  const da = parseTimestamp(a)
  const db = parseTimestamp(b)
  return !!da && !!db && da.toDateString() === db.toDateString()
}

/** "Vandaag", "Gisteren" of een volledige datum (voor scheidingslijnen in chats). */
export function dayLabel(value, now = new Date()) {
  const d = parseTimestamp(value)
  if (!d) return ''
  if (d.toDateString() === now.toDateString()) return t('common.time.today')
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return t('common.time.yesterday')
  return capitalizeFirst(d.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }))
}

/** Tekst voor een aftelling naar een reis. */
export function countdownLabel(start, end, now = new Date()) {
  const untilStart = daysUntil(start, now)
  if (untilStart > 1) return t('common.countdown.days', { n: untilStart })
  if (untilStart === 1) return t('common.countdown.tomorrow')
  if (untilStart === 0) return t('common.countdown.today')
  const untilEnd = daysUntil(end, now)
  if (untilEnd >= 0) return t('common.countdown.underway')
  return t('common.countdown.past')
}

export function formatCurrency(value, currency = 'EUR') {
  const n = Number(value) || 0
  return n.toLocaleString(loc(), { style: 'currency', currency, maximumFractionDigits: n % 1 === 0 ? 0 : 2 })
}
