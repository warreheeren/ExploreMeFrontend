// Export van een reis naar iCalendar (.ics, RFC 5545) met hele-dag-events.
import { t } from '@/i18n'

function ymd(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  return m ? `${m[1]}${m[2]}${m[3]}` : null
}

function addDaysYmd(value, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days))
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}

function stamp(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

/** Vouwt regels langer dan 75 tekens (RFC 5545 §3.1). */
export function foldLine(line) {
  if (line.length <= 75) return line
  const chunks = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) chunks.push(' ' + line.slice(i, i + 74))
  return chunks.join('\r\n')
}

function event({ uid, start, endExclusive, summary, description, location, geo, url }, now) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${endExclusive}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ]
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
  if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) lines.push(`GEO:${geo.lat.toFixed(6)};${geo.lng.toFixed(6)}`)
  if (url) lines.push(`URL:${url}`)
  lines.push('END:VEVENT')
  return lines
}

/**
 * Bouwt een .ics met één event voor de hele reis plus één event per overnachting met datums.
 * @param {object} trip TripDto van de API
 * @param {{ url?: string, now?: Date }} options
 */
export function buildTripIcs(trip, { url, now = new Date() } = {}) {
  const start = ymd(trip.startDate)
  const endExclusive = addDaysYmd(trip.endDate, 1)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ExploreMe//Reisplanner//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeIcsText(trip.title)}`]

  if (start && endExclusive) {
    lines.push(...event({
      uid: `trip-${trip.id}@exploreme`,
      start,
      endExclusive,
      summary: trip.title,
      description: [trip.description, url].filter(Boolean).join('\n\n'),
      location: trip.country,
      url,
    }, now))
  }

  for (const stop of trip.stops || []) {
    if (stop.type !== 'Accommodation') continue
    const checkIn = ymd(stop.checkInDate)
    const checkOut = ymd(stop.checkOutDate)
    if (!checkIn || !checkOut || checkOut <= checkIn) continue
    lines.push(...event({
      uid: `stop-${stop.id}@exploreme`,
      start: checkIn,
      endExclusive: checkOut,
      summary: t('trips.ics.overnight', { name: stop.name }),
      description: stop.description || '',
      location: stop.address || stop.name,
      geo: { lat: stop.latitude, lng: stop.longitude },
    }, now))
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

export function safeFileName(value, fallback = t('trips.ics.fileFallback')) {
  const cleaned = String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return cleaned || fallback
}

export function downloadTextFile(fileName, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
