// Helpers voor stemmingen: links bij voorstellen.

/** Alleen http(s)-links worden klikbaar; alles anders (javascript:, data:, ...) negeren we. */
export function isSafeHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim())
}

/**
 * Maakt van wat iemand in het linkveld plakt of typt een bruikbare url:
 * "booking.com/hotel" wordt "https://booking.com/hotel"; leeg blijft leeg.
 * Andere schema's (javascript:, ftp:, ...) blijven staan, zodat de validatie ze afkeurt.
 */
export function normalizeUrl(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s
  return /^[^\s/]+\.[^\s/]+/.test(s) ? `https://${s}` : s
}

/** Korte hostnaam voor een link ("booking.com"), of '' als de url niet te lezen is. */
export function linkHost(value) {
  if (!isSafeHttpUrl(value)) return ''
  try {
    return new URL(value.trim()).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}
