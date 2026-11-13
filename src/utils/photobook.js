// Fotoboek: albumfoto's en dagboekupdates per reisdag verdelen over printbare pagina's.
import { diffDays, toDateInput } from '@/utils/date'

/** Paginaformaten. Beide hebben 190 mm bruikbare hoogte (210 mm − 2 × 10 mm marge). */
export const PHOTOBOOK_FORMATS = {
  'a4-landscape': { size: 'A4 landscape', widthMm: 277, heightMm: 190, orientation: 'landscape' },
  'a5-portrait': { size: 'A5 portrait', widthMm: 128, heightMm: 190, orientation: 'portrait' },
}

export const PHOTOS_PER_PAGE = [1, 2, 4]

/** Langere dagboektekst krijgt een eigen pagina; korter past naast de foto's. */
const TEXT_BESIDE_PHOTOS_MAX = { landscape: 700, portrait: 450 }

export function pageCss(format) {
  const f = PHOTOBOOK_FORMATS[format] || PHOTOBOOK_FORMATS['a4-landscape']
  return `@page { size: ${f.size}; margin: 10mm; }`
}

/**
 * Bundelt foto's (op opnamedag, zie utils/album.js) en dagboekupdates per kalenderdag.
 * Alleen dagen met inhoud; foto's zonder dag vallen weg. Chronologisch, met het dagnummer t.o.v. de start.
 * → [{ date: 'YYYY-MM-DD', dayNumber, photos, entries, mood }]
 */
export function groupPhotobookDays(trip, photos = [], entries = []) {
  const days = new Map()
  const dayFor = (date) => {
    if (!days.has(date)) days.set(date, { date, dayNumber: diffDays(trip.startDate, date) + 1, photos: [], entries: [], mood: null })
    return days.get(date)
  }

  for (const photo of photos) {
    if (!photo.day) continue
    dayFor(String(photo.day).slice(0, 10)).photos.push(photo)
  }
  // Oudste update eerst: zo leest een dag als een verhaal.
  const ordered = [...entries].sort((a, b) => String(a.createdAtUtc).localeCompare(String(b.createdAtUtc)))
  for (const entry of ordered) {
    const day = dayFor(toDateInput(entry.date))
    day.entries.push(entry)
    day.mood ??= entry.mood || null
    // Foto's uit de dagboekupdate horen ook bij die dag (zonder dubbels met het album).
    for (const [i, url] of (entry.imageUrls || []).entries()) {
      if (!day.photos.some((p) => p.imageUrl === url)) day.photos.push({ id: `${entry.id}-${i}`, imageUrl: url, caption: null })
    }
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Pagina's voor één dag: een aparte tekstpagina bij lange dagboektekst, daarna fotopagina's van `perPage` foto's.
 * Korte tekst staat op de eerste fotopagina. Zonder foto's wordt het één tekstpagina.
 * → [{ kind: 'text' | 'photos', photos, withText }]
 */
export function dayPages(day, { perPage = 2, includeText = true, orientation = 'landscape' } = {}) {
  const textLength = includeText ? day.entries.reduce((n, e) => n + (e.title?.length || 0) + (e.text?.length || 0), 0) : 0
  const hasText = textLength > 0
  const pages = []
  const chunks = []
  for (let i = 0; i < day.photos.length; i += perPage) chunks.push(day.photos.slice(i, i + perPage))

  const textBeside = hasText && chunks.length > 0 && textLength <= TEXT_BESIDE_PHOTOS_MAX[orientation]
  if (hasText && !textBeside) pages.push({ kind: 'text', photos: [], withText: true })
  chunks.forEach((photos, i) => pages.push({ kind: 'photos', photos, withText: textBeside && i === 0 }))
  return pages
}

/** Wacht tot de kaarttegels geladen zijn (of tot de time-out), zodat de print geen grijze vlakken heeft. */
export function waitForTiles(map, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!map) return resolve(false)
    const layers = []
    map.eachLayer((l) => {
      if (typeof l.isLoading === 'function' && typeof l.getTileUrl === 'function') layers.push(l)
    })
    const pending = layers.filter((l) => l.isLoading())
    if (!pending.length) return resolve(true)

    let left = pending.length
    const timer = setTimeout(() => done(false), timeoutMs)
    function onLoad() {
      left -= 1
      if (left <= 0) done(true)
    }
    function done(ok) {
      clearTimeout(timer)
      pending.forEach((l) => l.off('load', onLoad))
      resolve(ok)
    }
    pending.forEach((l) => l.once('load', onLoad))
  })
}

/** Wacht tot alle afbeeldingen binnen `root` geladen (of mislukt) zijn. */
export function waitForImages(root, timeoutMs = 15000) {
  const images = [...(root?.querySelectorAll('img') || [])].filter((img) => !img.complete)
  if (!images.length) return Promise.resolve(true)
  return Promise.race([
    Promise.all(images.map((img) => new Promise((r) => {
      img.addEventListener('load', r, { once: true })
      img.addEventListener('error', r, { once: true })
    }))).then(() => true),
    new Promise((r) => setTimeout(() => r(false), timeoutMs)),
  ])
}
