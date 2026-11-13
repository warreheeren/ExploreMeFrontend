import { describe, expect, it } from 'vitest'
import { flattenAlbum, groupAlbum, normalizeExif, toFloatingUtcIso } from './album'

describe('toFloatingUtcIso', () => {
  it('keeps the camera wall-clock time as UTC', () => {
    // exifr levert een lokale Date; de lokale componenten zijn de wandklok van de camera.
    expect(toFloatingUtcIso(new Date(2026, 8, 3, 23, 45, 10))).toBe('2026-09-03T23:45:10.000Z')
  })

  it('returns null for invalid input', () => {
    expect(toFloatingUtcIso(new Date('nope'))).toBeNull()
    expect(toFloatingUtcIso('2026-09-03')).toBeNull()
  })
})

describe('normalizeExif', () => {
  it('reads date and GPS', () => {
    const meta = normalizeExif({ DateTimeOriginal: new Date(2026, 0, 2, 8, 0, 0), latitude: 46.37, longitude: 14.11 })
    expect(meta).toEqual({ takenAtUtc: '2026-01-02T08:00:00.000Z', latitude: 46.37, longitude: 14.11 })
  })

  it('falls back to CreateDate and drops impossible or empty coordinates', () => {
    expect(normalizeExif({ CreateDate: new Date(2026, 0, 2), latitude: 0, longitude: 0 }))
      .toEqual({ takenAtUtc: '2026-01-02T00:00:00.000Z', latitude: null, longitude: null })
    expect(normalizeExif({ latitude: 95, longitude: 10 }).latitude).toBeNull()
    expect(normalizeExif({ latitude: 50 }).latitude).toBeNull()
  })

  it('handles missing EXIF', () => {
    expect(normalizeExif(undefined)).toEqual({ takenAtUtc: null, latitude: null, longitude: null })
  })
})

describe('groupAlbum', () => {
  const photo = (id, day, stopId, orderIndex, stopName = stopId) => ({
    id, day, tripStopId: stopId, stopOrderIndex: orderIndex, stopName, stopType: 'Waypoint',
  })

  it('groups by day, then by stop in trip order, unknowns last', () => {
    const groups = groupAlbum([
      photo('a', '2026-09-03T00:00:00Z', 's2', 2),
      photo('b', null, null, null),
      photo('c', '2026-09-01T00:00:00Z', 's1', 0),
      photo('d', '2026-09-03T00:00:00Z', null, null),
      photo('e', '2026-09-03T00:00:00Z', 's1', 0),
      photo('f', '2026-09-03T00:00:00Z', 's2', 2),
    ])

    expect(groups.map((g) => g.day)).toEqual(['2026-09-01', '2026-09-03', null])
    expect(groups[1].stops.map((s) => s.stopId)).toEqual(['s1', 's2', null])
    expect(groups[1].stops[1].photos.map((p) => p.id)).toEqual(['a', 'f'])
    expect(flattenAlbum(groups).map((p) => p.id)).toEqual(['c', 'e', 'a', 'f', 'd', 'b'])
  })

  it('returns an empty list without photos', () => {
    expect(groupAlbum([])).toEqual([])
  })
})
