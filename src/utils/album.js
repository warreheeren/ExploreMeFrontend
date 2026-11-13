// Fotoalbum: EXIF uitlezen vóór het uploaden (de server verkleint de foto en strip de metadata)
// en foto's groeperen per dag → stop.

/**
 * Camera's bewaren de opnametijd zonder tijdzone; exifr maakt er een lokale Date van.
 * We sturen die wandkloktijd als "zwevende" UTC-tijd, zodat de opnamedag nooit verschuift
 * (zoals kalenderdatums elders in de app als UTC-middernacht bewaard worden).
 */
export function toFloatingUtcIso(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(
    date.getFullYear(), date.getMonth(), date.getDate(),
    date.getHours(), date.getMinutes(), date.getSeconds(),
  )).toISOString()
}

function validCoordinate(value, max) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max
}

/** Ruwe exifr-uitvoer → { takenAtUtc, latitude, longitude } (null wanneer onbekend of onzinnig). */
export function normalizeExif(raw) {
  if (!raw || typeof raw !== 'object') return { takenAtUtc: null, latitude: null, longitude: null }
  const taken = raw.DateTimeOriginal || raw.CreateDate || null
  const takenAtUtc = taken instanceof Date ? toFloatingUtcIso(taken) : null

  let latitude = validCoordinate(raw.latitude, 90) ? raw.latitude : null
  let longitude = validCoordinate(raw.longitude, 180) ? raw.longitude : null
  // 0,0 ("Null Island") betekent bijna altijd: geen GPS-fix.
  if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
    latitude = null
    longitude = null
  }
  return { takenAtUtc, latitude, longitude }
}

/** Leest opnamedatum en GPS uit een bestand; zonder EXIF (of bij een fout) alles null. */
export async function readPhotoMeta(file) {
  try {
    const { default: exifr } = await import('exifr')
    const raw = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: false, icc: false, iptc: false, jfif: false, ihdr: false })
    return normalizeExif(raw)
  } catch {
    return normalizeExif(null)
  }
}

/**
 * Groepeert albumfoto's per dag en daarbinnen per stop.
 * Dagen chronologisch (foto's zonder dag achteraan), stops in reisvolgorde (zonder stop achteraan);
 * binnen een groep blijft de volgorde van de server (opnamemoment).
 * → [{ day: 'YYYY-MM-DD' | null, stops: [{ stopId, stopName, stopType, orderIndex, photos }] }]
 */
export function groupAlbum(photos = []) {
  const days = new Map()
  for (const photo of photos) {
    const day = photo.day ? String(photo.day).slice(0, 10) : null
    if (!days.has(day)) days.set(day, new Map())
    const stops = days.get(day)
    const stopKey = photo.tripStopId || null
    if (!stops.has(stopKey)) {
      stops.set(stopKey, {
        stopId: stopKey,
        stopName: photo.stopName || null,
        stopType: photo.stopType || null,
        orderIndex: photo.stopOrderIndex ?? null,
        photos: [],
      })
    }
    stops.get(stopKey).photos.push(photo)
  }

  const byStopOrder = (a, b) => {
    if (a.stopId === null) return 1
    if (b.stopId === null) return -1
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  }

  return [...days.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
    .map(([day, stops]) => ({ day, stops: [...stops.values()].sort(byStopOrder) }))
}

/** Foto's in weergavevolgorde (voor de lightbox: vorige/volgende volgt het raster). */
export function flattenAlbum(groups = []) {
  return groups.flatMap((g) => g.stops.flatMap((s) => s.photos))
}
