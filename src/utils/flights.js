// Vluchtnummers en vluchtstatus (zie FlightNumbers.cs en FlightStatusService.cs in de backend).
import { localeTag } from '@/i18n'

// IATA-code (2 tekens) of ICAO-code (3 letters) + 1-4 cijfers + optionele suffixletter.
const FLIGHT_PATTERN = /^([A-Z0-9]{2}|[A-Z]{3})(\d{1,4})([A-Z]?)$/

/** "kl 0123" → "KL123"; null als het geen geldig vluchtnummer is (zelfde regels als de backend). */
export function normalizeFlightNumber(value) {
  if (!value || typeof value !== 'string') return null
  const compact = value.replace(/[\s-]/g, '').toUpperCase()
  const match = compact.match(FLIGHT_PATTERN)
  if (!match) return null
  const number = match[2].replace(/^0+/, '')
  if (!number) return null
  return match[1] + number + match[3]
}

/** Flightradar24-pagina van een vlucht (werkt ook zonder vluchtstatus-provider). */
export function flightTrackerUrl(flightNumber) {
  const normalized = normalizeFlightNumber(flightNumber)
  return normalized ? `https://www.flightradar24.com/data/flights/${encodeURIComponent(normalized.toLowerCase())}` : null
}

/** Statussen van de backend → badge-stijl (tokens) en icoon. */
const STATUS_META = {
  scheduled: { tone: 'ok', icon: 'plane' },
  delayed: { tone: 'warn', icon: 'clock' },
  boarding: { tone: 'info', icon: 'plane' },
  departed: { tone: 'info', icon: 'plane' },
  landed: { tone: 'ok', icon: 'check' },
  cancelled: { tone: 'danger', icon: 'x' },
  diverted: { tone: 'danger', icon: 'route' },
  unknown: { tone: 'muted', icon: 'plane' },
}

export function flightStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.unknown
}

/** Vertraging in hele minuten (verwacht − gepland), of 0 als een van beide ontbreekt of de vlucht vroeger is. */
export function delayMinutes(scheduledUtc, estimatedUtc) {
  if (!scheduledUtc || !estimatedUtc) return 0
  const diff = Math.round((new Date(estimatedUtc) - new Date(scheduledUtc)) / 60000)
  return Number.isFinite(diff) && diff > 0 ? diff : 0
}

/**
 * Tijd "14:35" in de tijdzone van de luchthaven als die bekend is (de API levert IANA-zones), anders in de tijd van
 * het toestel; `local` zegt welke van de twee (de kaart zet er dan "jouw tijd" bij).
 */
export function formatFlightTime(utc, timeZone) {
  if (!utc) return null
  const date = new Date(utc)
  if (Number.isNaN(date.getTime())) return null
  const options = { hour: '2-digit', minute: '2-digit' }
  if (timeZone) {
    try {
      return { text: date.toLocaleTimeString(localeTag(), { ...options, timeZone }), local: true }
    } catch {
      // onbekende zone: val terug op de tijd van het toestel
    }
  }
  return { text: date.toLocaleTimeString(localeTag(), options), local: false }
}

/** Is `flightDate` (UTC-middernacht, lokale vertrekdatum) vandaag volgens het toestel? */
export function isFlightToday(flightDate, now = new Date()) {
  if (!flightDate) return false
  const d = new Date(flightDate)
  if (Number.isNaN(d.getTime())) return false
  return d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth() && d.getUTCDate() === now.getDate()
}
