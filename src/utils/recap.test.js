import { describe, expect, it } from 'vitest'
import { recapSlides, recapState } from './recap'

describe('recapSlides', () => {
  it('laat lege onderdelen weg en eindigt met de samenvatting', () => {
    expect(recapSlides({ stopCount: 0, photos: [], journal: [], participants: [{}] })).toEqual(['intro', 'numbers', 'summary'])
    expect(recapSlides({
      stopCount: 3,
      weather: { dayCount: 3 },
      photos: [{}],
      journal: [{}],
      budget: { spentTotal: 10 },
      participants: [{}, {}],
    })).toEqual(['intro', 'numbers', 'stops', 'weather', 'photos', 'journal', 'budget', 'crew', 'summary'])
    expect(recapSlides({ stopCount: 0, participants: [{}], capsules: [{}] })).toEqual(['intro', 'numbers', 'capsules', 'summary'])
    expect(recapSlides(null)).toEqual([])
  })
})

describe('recapState', () => {
  const trip = { startDate: '2026-06-10T00:00:00Z', endDate: '2026-06-14T00:00:00Z' }
  it('volgt start- en einddatum', () => {
    expect(recapState(trip, new Date(2026, 5, 9))).toBe('none')
    expect(recapState(trip, new Date(2026, 5, 10))).toBe('underway')
    expect(recapState(trip, new Date(2026, 5, 14))).toBe('underway')
    expect(recapState(trip, new Date(2026, 5, 15))).toBe('finished')
  })
})
