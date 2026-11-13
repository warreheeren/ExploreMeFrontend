import { parseDateOnly } from './date'

// Zonnehoogtes (graden) voor de verschillende momenten.
const SUNRISE_ALTITUDE = -0.833 // rand van de zon op de horizon, incl. refractie
const GOLDEN_ALTITUDE = 6 // gouden uur: zon tussen de horizon en 6°

const rad = (deg) => (deg * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

/** Declinatie (graden) en tijdvereffening (minuten) volgens NOAA voor een Juliaanse dag. */
function solarPosition(jd) {
  const t = (jd - 2451545) / 36525
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
  const c = Math.sin(rad(m)) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(rad(2 * m)) * (0.019993 - 0.000101 * t)
    + Math.sin(rad(3 * m)) * 0.000289
  const omega = 125.04 - 1934.136 * t
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(rad(omega))
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const eps = eps0 + 0.00256 * Math.cos(rad(omega))

  const declination = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))))
  const y = Math.tan(rad(eps / 2)) ** 2
  const eqTime = 4 * deg(
    y * Math.sin(2 * rad(l0))
    - 2 * e * Math.sin(rad(m))
    + 4 * e * y * Math.sin(rad(m)) * Math.cos(2 * rad(l0))
    - 0.5 * y * y * Math.sin(4 * rad(l0))
    - 1.25 * e * e * Math.sin(2 * rad(m))
  )
  return { declination, eqTime }
}

/** Uurhoek (graden) waarop de zon `altitude` bereikt; null = nooit (te laag), Infinity = altijd erboven. */
function hourAngle(lat, declination, altitude) {
  const cosH = (Math.sin(rad(altitude)) - Math.sin(rad(lat)) * Math.sin(rad(declination)))
    / (Math.cos(rad(lat)) * Math.cos(rad(declination)))
  if (cosH > 1) return null
  if (cosH < -1) return Infinity
  return deg(Math.acos(cosH))
}

/**
 * Zonstijden voor een kalenderdag op een plek (NOAA-algoritme, ±1 minuut).
 * `date` is een kalenderdatum ('YYYY-MM-DD', ISO-string of Date) in de lokale tijd van de plek.
 * Alle tijden zijn `Date`-objecten (UTC-momenten); formatteer ze met de tijdzone van de plek.
 * In poolgebieden is `polar` 'day' (middernachtzon) of 'night' (poolnacht) en zijn op/onder null.
 */
export function getSunTimes(date, lat, lng) {
  const empty = { sunrise: null, sunset: null, goldenMorningEnd: null, goldenEveningStart: null, polar: null }
  const day = parseDateOnly(date)
  if (!day || !Number.isFinite(lat) || !Number.isFinite(lng)) return empty

  const midnightUtc = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())
  const jdOf = (minutes) => (midnightUtc + minutes * 60000) / 86400000 + 2440587.5

  // Zonnemiddag in minuten na middernacht UTC; tweede ronde met de positie op dat moment.
  let { declination, eqTime } = solarPosition(jdOf(720 - 4 * lng))
  const noon = 720 - 4 * lng - eqTime
  ;({ declination, eqTime } = solarPosition(jdOf(noon)))
  const solarNoon = 720 - 4 * lng - eqTime

  const at = (minutes) => new Date(midnightUtc + Math.round(minutes * 60000))
  const result = { ...empty }

  const rise = hourAngle(lat, declination, SUNRISE_ALTITUDE)
  if (rise === null) return { ...result, polar: 'night' }
  if (rise === Infinity) return { ...result, polar: 'day' }
  result.sunrise = at(solarNoon - 4 * rise)
  result.sunset = at(solarNoon + 4 * rise)

  // Komt de zon niet boven 6°, dan duurt het gouden uur de hele dag: geen aparte grenzen.
  const golden = hourAngle(lat, declination, GOLDEN_ALTITUDE)
  if (golden !== null && golden !== Infinity) {
    result.goldenMorningEnd = at(solarNoon - 4 * golden)
    result.goldenEveningStart = at(solarNoon + 4 * golden)
  }
  return result
}

/** Kalenderdatum ('YYYY-MM-DD') van `now` in een IANA-tijdzone; zonder (geldige) zone de datum van de browser. */
export function todayIn(timeZone, now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  if (!timeZone) return local
  try {
    // en-CA formatteert als YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  } catch {
    return local
  }
}

/** 'HH:mm' van een moment in een IANA-tijdzone (of de tijdzone van de browser zonder zone). */
export function formatClock(value, timeZone, locale) {
  if (!value) return ''
  const options = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  try {
    return new Intl.DateTimeFormat(locale, timeZone ? { ...options, timeZone } : options).format(value)
  } catch {
    // Onbekende zone: val terug op de browsertijd.
    return new Intl.DateTimeFormat(locale, options).format(value)
  }
}
