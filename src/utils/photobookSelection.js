// Fotoboek: welke foto's van een dag komen in het boek. Een album van een groepsreis heeft al snel honderden
// foto's; het boek kiest er per dag een paar, zodat het zonder werk al een goed boek is.

/** Dikte van het boek = hoogstens zoveel foto's per dag. Bij "alles" valt er niets weg, ook geen bijna-dubbels. */
export const BOOK_DENSITY = { short: 3, normal: 6, all: Infinity }
export const BOOK_DENSITY_KEYS = Object.keys(BOOK_DENSITY)

/** Foto's van dezelfde persoon binnen zoveel seconden zijn pogingen voor hetzelfde plaatje. */
export const NEAR_DUPLICATE_SECONDS = 10

/** Vanaf zoveel hartjes is een foto een keuze van de groep en komt hij er altijd in zolang er plek is. */
export const FAVOURITE_LIKES = 2

const takenMs = (p) => (p.takenAtUtc ? Date.parse(p.takenAtUtc) : NaN)
const sortMs = (p) => {
  const ms = Date.parse(p.takenAtUtc || p.createdAtUtc || '')
  return Number.isNaN(ms) ? 0 : ms
}
const likes = (p) => p.likeCount || 0
const chronological = (a, b) => sortMs(a) - sortMs(b)

/**
 * Houdt van elke reeks bijna-dubbels één foto over: een vastgezette foto, anders die met de meeste hartjes,
 * anders de eerste. Foto's zonder opnametijd (geen EXIF) of zonder uploader (uit het dagboek) blijven altijd.
 */
function dropNearDuplicates(photos, pinned) {
  const kept = []
  const byUploader = new Map()
  for (const p of photos) {
    if (!p.uploadedByUserName || Number.isNaN(takenMs(p))) kept.push(p)
    else byUploader.set(p.uploadedByUserName, [...(byUploader.get(p.uploadedByUserName) || []), p])
  }
  for (const list of byUploader.values()) {
    list.sort((a, b) => takenMs(a) - takenMs(b))
    let series = []
    const flush = () => {
      if (!series.length) return
      // Een vastgezette foto blijft altijd; van de rest van de reeks blijft er dan geen extra over.
      const fixed = series.filter((p) => pinned.has(p.id))
      kept.push(...(fixed.length ? fixed : [series.reduce((best, p) => (likes(p) > likes(best) ? p : best))]))
      series = []
    }
    for (const p of list) {
      // Vergelijken met de vorige foto, zodat een lange reeks (burst) één reeks blijft.
      if (series.length && takenMs(p) - takenMs(series[series.length - 1]) > NEAR_DUPLICATE_SECONDS * 1000) flush()
      series.push(p)
    }
    flush()
  }
  return kept
}

/** Verdeelt de lijst in beurten per sleutel: [a1, a2, b1] → [a1, b1, a2]. De volgorde binnen een sleutel blijft. */
function roundRobin(items, keyOf) {
  const queues = new Map()
  for (const item of items) {
    const key = keyOf(item)
    queues.set(key, [...(queues.get(key) || []), item])
  }
  const lists = [...queues.values()]
  const result = []
  for (let round = 0; result.length < items.length; round++) {
    for (const list of lists) if (round < list.length) result.push(list[round])
  }
  return result
}

/**
 * Kiest de foto's van één dag voor het boek.
 * 1. Uitgesloten foto's vallen weg; bijna-dubbels worden één foto (niet bij `max = Infinity`).
 * 2. Vastgezette foto's komen er altijd in.
 * 3. Foto's met meerdere hartjes (FAVOURITE_LIKES) gaan voor, populairste eerst. De rest gaat om de beurt per
 *    fotograaf, binnen een fotograaf afwisselend per stop en met de meeste hartjes eerst, tot `max` bereikt is.
 *    Zo domineert niet één persoon of één plek de dag, behalve als de groep dat zelf zo koos.
 * 4. Het resultaat staat in chronologische volgorde.
 *
 * @param {object[]} photos albumfoto's van één dag (TripPhotoDto) en foto's uit dagboekupdates
 * @param {{ max?: number, pinned?: string[], excluded?: string[] }} options
 * @returns {{ chosen: object[], skipped: number }} `skipped` = foto's van die dag die niet in het boek staan
 */
export function selectDayPhotos(photos = [], { max = BOOK_DENSITY.normal, pinned = [], excluded = [] } = {}) {
  const pinnedIds = new Set(pinned)
  const excludedIds = new Set(excluded)
  const available = photos.filter((p) => !excludedIds.has(p.id))
  const candidates = Number.isFinite(max) ? dropNearDuplicates(available, pinnedIds) : available

  const fixed = candidates.filter((p) => pinnedIds.has(p.id))
  const rest = candidates.filter((p) => !pinnedIds.has(p.id)).sort(chronological)

  // Per fotograaf: hartjes eerst (stabiel, dus anders chronologisch), daarna afwisselen per stop.
  const photographerOf = (p) => p.uploadedByUserName || `journal:${p.id}`
  const byPhotographer = new Map()
  for (const p of rest) byPhotographer.set(photographerOf(p), [...(byPhotographer.get(photographerOf(p)) || []), p])
  const ordered = []
  for (const list of byPhotographer.values()) {
    const ranked = [...list].sort((a, b) => likes(b) - likes(a))
    ordered.push(...roundRobin(ranked, (p) => p.tripStopId || 'none'))
  }
  const spread = roundRobin(ordered, photographerOf)

  // Wat de groep duidelijk koos (meerdere hartjes) gaat vóór de spreiding: populairste eerst.
  const favourites = spread.filter((p) => likes(p) >= FAVOURITE_LIKES).sort((a, b) => likes(b) - likes(a))
  const others = spread.filter((p) => likes(p) < FAVOURITE_LIKES)

  const room = Math.max(0, max - fixed.length)
  const chosen = [...fixed, ...[...favourites, ...others].slice(0, room)].sort(chronological)
  return { chosen, skipped: photos.length - chosen.length }
}

/**
 * De omslag van het boek: de foto met de meeste hartjes, bij een gelijke stand de vroegste. Zonder hartjes is er
 * geen keuze van de groep en geeft dit null (het boek gebruikt dan de omslagfoto van de reis).
 */
export function pickCoverPhoto(photos = []) {
  const liked = photos.filter((p) => likes(p) > 0)
  if (!liked.length) return null
  return liked.reduce((best, p) => (likes(p) > likes(best) || (likes(p) === likes(best) && sortMs(p) < sortMs(best)) ? p : best))
}
