import { describe, expect, it } from 'vitest'
import { BOOK_DENSITY, pickCoverPhoto, selectDayPhotos } from './photobookSelection'

const at = (seconds) => new Date(Date.UTC(2026, 6, 3, 10, 0, seconds)).toISOString()
const photo = (id, user, seconds, extra = {}) => ({ id, uploadedByUserName: user, takenAtUtc: at(seconds), createdAtUtc: at(seconds), ...extra })
const ids = (result) => result.chosen.map((p) => p.id)

describe('selectDayPhotos', () => {
  it('maakt van een reeks bijna-dubbels één foto', () => {
    const result = selectDayPhotos([photo('a1', 'emma', 0), photo('a2', 'emma', 4), photo('a3', 'emma', 9), photo('b', 'emma', 300)])
    expect(ids(result)).toEqual(['a1', 'b'])
    expect(result.skipped).toBe(2)
  })

  it('ziet een lange reeks als één reeks, ook als begin en einde ver uit elkaar liggen', () => {
    const burst = [0, 8, 16, 24, 32].map((s, i) => photo(`p${i}`, 'emma', s))
    expect(ids(selectDayPhotos(burst))).toEqual(['p0'])
  })

  it('houdt van een reeks de foto met de meeste hartjes', () => {
    const result = selectDayPhotos([photo('a1', 'emma', 0), photo('a2', 'emma', 4, { likeCount: 3 }), photo('a3', 'emma', 8, { likeCount: 1 })])
    expect(ids(result)).toEqual(['a2'])
  })

  it('ziet foto\'s van verschillende mensen op hetzelfde moment niet als dubbel', () => {
    expect(ids(selectDayPhotos([photo('e', 'emma', 0), photo('l', 'lucas', 2)]))).toEqual(['e', 'l'])
  })

  it('laat foto\'s zonder opnametijd en dagboekfoto\'s altijd staan', () => {
    const noExif = { id: 'x', uploadedByUserName: 'emma', takenAtUtc: null, createdAtUtc: at(1) }
    const noExif2 = { id: 'y', uploadedByUserName: 'emma', takenAtUtc: null, createdAtUtc: at(2) }
    const journal = { id: 'entry-0', imageUrl: '/uploads/j.jpg', caption: null }
    expect(ids(selectDayPhotos([noExif, noExif2, journal])).sort()).toEqual(['entry-0', 'x', 'y'])
  })

  it('spreidt over fotografen als er meer foto\'s zijn dan plek', () => {
    const emma = [0, 60, 120, 180, 240].map((s, i) => photo(`e${i}`, 'emma', s))
    const lucas = [30, 90].map((s, i) => photo(`l${i}`, 'lucas', s))
    const result = selectDayPhotos([...emma, ...lucas], { max: 4 })
    expect(result.chosen.filter((p) => p.uploadedByUserName === 'lucas')).toHaveLength(2)
    expect(result.chosen.filter((p) => p.uploadedByUserName === 'emma')).toHaveLength(2)
    expect(result.skipped).toBe(3)
    // Chronologisch teruggegeven.
    expect(ids(result)).toEqual([...ids(result)].sort((a, b) => Date.parse(result.chosen.find((p) => p.id === a).takenAtUtc) - Date.parse(result.chosen.find((p) => p.id === b).takenAtUtc)))
  })

  it('wisselt binnen één fotograaf af tussen stops', () => {
    const photos = [
      photo('a1', 'emma', 0, { tripStopId: 'A' }), photo('a2', 'emma', 60, { tripStopId: 'A' }), photo('a3', 'emma', 120, { tripStopId: 'A' }),
      photo('b1', 'emma', 180, { tripStopId: 'B' }),
    ]
    expect(ids(selectDayPhotos(photos, { max: 2 }))).toEqual(['a1', 'b1'])
  })

  it('geeft foto\'s met hartjes voorrang', () => {
    const photos = [photo('a', 'emma', 0), photo('b', 'emma', 60), photo('c', 'emma', 120, { likeCount: 2 })]
    expect(ids(selectDayPhotos(photos, { max: 1 }))).toEqual(['c'])
  })

  it('neemt vastgezette foto\'s altijd mee en uitgesloten foto\'s nooit', () => {
    const photos = [photo('a', 'emma', 0), photo('b', 'emma', 60), photo('c', 'emma', 120), photo('d', 'emma', 124)]
    const result = selectDayPhotos(photos, { max: 2, pinned: ['d'], excluded: ['a'] })
    expect(ids(result)).toEqual(['b', 'd'])     // d is vastgezet en wint dus van zijn bijna-dubbel c
  })

  it('laat bij "alles" niets weg, ook geen bijna-dubbels', () => {
    const photos = [photo('a1', 'emma', 0), photo('a2', 'emma', 3), photo('b', 'lucas', 1)]
    const result = selectDayPhotos(photos, { max: BOOK_DENSITY.all })
    expect(result.chosen).toHaveLength(3)
    expect(result.skipped).toBe(0)
  })

  it('verdraagt een lege dag', () => {
    expect(selectDayPhotos()).toEqual({ chosen: [], skipped: 0 })
  })

  it('laat een foto met veel hartjes niet wegvallen door de spreiding over fotografen', () => {
    // Emma heeft de drie foto's die de groep koos; die gaan vóór de foto's van Lucas zonder hartjes.
    const photos = [
      photo('e1', 'emma', 0, { likeCount: 5 }), photo('e2', 'emma', 60, { likeCount: 4 }), photo('e3', 'emma', 120, { likeCount: 3 }),
      photo('l1', 'lucas', 30), photo('l2', 'lucas', 90, { likeCount: 1 }),
    ]
    expect(ids(selectDayPhotos(photos, { max: 3 }))).toEqual(['e1', 'e2', 'e3'])
    // Met meer plek komt de rest er weer gespreid bij.
    expect(ids(selectDayPhotos(photos, { max: 4 }))).toEqual(['e1', 'e2', 'l2', 'e3'])
  })
})

describe('pickCoverPhoto', () => {
  it('kiest de foto met de meeste hartjes, bij gelijke stand de vroegste', () => {
    const photos = [photo('a', 'emma', 60, { likeCount: 2 }), photo('b', 'lucas', 0, { likeCount: 2 }), photo('c', 'emma', 30, { likeCount: 1 })]
    expect(pickCoverPhoto(photos).id).toBe('b')
    expect(pickCoverPhoto([...photos, photo('d', 'emma', 500, { likeCount: 3 })]).id).toBe('d')
  })

  it('geeft niets terug zonder hartjes', () => {
    expect(pickCoverPhoto([photo('a', 'emma', 0), photo('b', 'emma', 60, { likeCount: 0 })])).toBeNull()
    expect(pickCoverPhoto()).toBeNull()
  })
})
