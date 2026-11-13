// Terugblik ("Wrapped"): welke slides er zijn en hoe we de deelkaart opslaan/delen.
import { saveBlob } from './format'

/** Slides in volgorde; onderdelen zonder gegevens vallen weg. De samenvatting komt altijd als laatste. */
export function recapSlides(recap) {
  if (!recap) return []
  const slides = ['intro', 'numbers']
  if (recap.stopCount > 0) slides.push('stops')
  if (recap.weather) slides.push('weather')
  if (recap.photos?.length) slides.push('photos')
  if (recap.journal?.length) slides.push('journal')
  if (recap.budget && recap.budget.spentTotal > 0) slides.push('budget')
  if (recap.participants?.length > 1) slides.push('crew')
  // Tijdcapsules worden apart opgehaald (alleen deelnemers); alleen geopende, leesbare capsules tellen.
  if (recap.capsules?.length) slides.push('capsules')
  slides.push('summary')
  return slides
}

/** Is de terugblik al zinvol? Vanaf de startdatum; na de einddatum heet hij "terugblik". */
export function recapState(trip, today = new Date()) {
  if (!trip?.startDate) return 'none'
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const now = iso(today)
  const start = String(trip.startDate).slice(0, 10)
  const end = String(trip.endDate || trip.startDate).slice(0, 10)
  if (now < start) return 'none'
  return now > end ? 'finished' : 'underway'
}

/**
 * Deelt een afbeelding via de Web Share API (met bestand) wanneer dat kan, anders download.
 * Geeft 'shared', 'downloaded' of 'cancelled' terug.
 */
export async function shareOrDownload(blob, fileName, title) {
  const file = typeof File !== 'undefined' ? new File([blob], fileName, { type: blob.type || 'image/png' }) : null
  if (file && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
      // Delen mislukt (bv. geen toestemming): val terug op downloaden.
    }
  }
  saveBlob(blob, fileName)
  return 'downloaded'
}
