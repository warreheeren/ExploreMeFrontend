import { describe, expect, it } from 'vitest'
import { dayPages, groupPhotobookDays, pageCss } from './photobook'

const trip = { startDate: '2026-07-01T00:00:00Z', endDate: '2026-07-05T00:00:00Z' }
const photo = (id, day) => ({ id, imageUrl: `/uploads/${id}.jpg`, day })
const entry = (id, date, text, extra = {}) => ({ id, date, text, title: null, createdAtUtc: `${date.slice(0, 10)}T1${id}:00:00Z`, ...extra })

describe('groupPhotobookDays', () => {
  it('bundelt foto\'s en dagboek per dag, chronologisch en met dagnummer', () => {
    const days = groupPhotobookDays(
      trip,
      [photo('a', '2026-07-03T00:00:00Z'), photo('b', '2026-07-01T00:00:00Z'), photo('c', null)],
      [entry(2, '2026-07-03T00:00:00Z', 'later', { mood: 'tired' }), entry(1, '2026-07-03T00:00:00Z', 'eerst', { mood: 'great' })],
    )
    expect(days.map((d) => [d.date, d.dayNumber, d.photos.length, d.entries.length])).toEqual([
      ['2026-07-01', 1, 1, 0],
      ['2026-07-03', 3, 1, 2],
    ])
    expect(days[1].entries.map((e) => e.text)).toEqual(['eerst', 'later'])
    expect(days[1].mood).toBe('great')
  })

  it('neemt dagboekfoto\'s mee zonder dubbels met het album', () => {
    const [day] = groupPhotobookDays(
      trip,
      [photo('a', '2026-07-02T00:00:00Z')],
      [entry(1, '2026-07-02T00:00:00Z', 'tekst', { imageUrls: ['/uploads/a.jpg', '/uploads/j.jpg'] })],
    )
    expect(day.photos.map((p) => p.imageUrl)).toEqual(['/uploads/a.jpg', '/uploads/j.jpg'])
  })
})

describe('dayPages', () => {
  const day = (photos, text = '') => ({ photos: Array.from({ length: photos }, (_, i) => photo(i, '2026-07-01')), entries: text ? [entry(1, '2026-07-01', text)] : [] })

  it('verdeelt foto\'s per pagina met korte tekst naast de eerste foto\'s', () => {
    const pages = dayPages(day(5, 'Kort'), { perPage: 2 })
    expect(pages.map((p) => [p.kind, p.photos.length, p.withText])).toEqual([
      ['photos', 2, true],
      ['photos', 2, false],
      ['photos', 1, false],
    ])
  })

  it('geeft lange tekst of tekst zonder foto\'s een eigen pagina', () => {
    expect(dayPages(day(2, 'x'.repeat(800)), { perPage: 4 }).map((p) => p.kind)).toEqual(['text', 'photos'])
    expect(dayPages(day(2, 'x'.repeat(500)), { perPage: 4, orientation: 'portrait' }).map((p) => p.kind)).toEqual(['text', 'photos'])
    expect(dayPages(day(0, 'Alleen tekst'))).toEqual([{ kind: 'text', photos: [], withText: true }])
  })

  it('laat tekst weg als dat zo gekozen is', () => {
    expect(dayPages(day(1, 'x'.repeat(800)), { includeText: false })).toEqual([{ kind: 'photos', photos: [expect.any(Object)], withText: false }])
    expect(dayPages(day(0, 'tekst'), { includeText: false })).toEqual([])
  })
})

describe('pageCss', () => {
  it('zet het papierformaat', () => {
    expect(pageCss('a5-portrait')).toContain('size: A5 portrait')
    expect(pageCss('onbekend')).toContain('size: A4 landscape')
  })
})
