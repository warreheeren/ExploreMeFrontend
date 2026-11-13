// Hulpfuncties voor digitale ansichtkaarten (zelfde grenzen als PostcardService in de API).

export const MAX_MESSAGE = 500
export const STAMP_STYLES = ['classic', 'mountain', 'beach', 'city', 'retro']

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function isValidEmail(value) {
  const v = (value || '').trim()
  return v.length > 0 && v.length <= 254 && EMAIL.test(v)
}

/**
 * Foto's om uit te kiezen: eigen uploads eerst, dan het album van de reis, dan foto's van stops en de cover.
 * Elke URL één keer; `stopId` laat de composer de plaats invullen.
 */
export function photoChoicesFor(trip, album = [], uploads = []) {
  const seen = new Set()
  const out = []
  const add = (url, label, stopId = null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push({ url, label, stopId })
  }
  for (const url of uploads) add(url, '')
  for (const p of album) add(p.imageUrl, p.caption || p.stopName || '', p.tripStopId || null)
  for (const s of trip?.stops || []) add(s.imageUrl, s.name, s.id)
  if (trip) add(trip.coverImageUrl, trip.title)
  return out
}

/** Naam voor de "Aan"-regel en de lijst: account, of het e-mailadres bij een e-mailkaart. */
export function recipientName(card) {
  return card?.recipientDisplayName || card?.recipientEmail || ''
}
