import { describe, expect, it } from 'vitest'
import { barWidths, donutSegments } from './chart'

describe('donutSegments', () => {
  it('verdeelt de omtrek naar aandeel en laat nul-waarden weg', () => {
    const segments = donutSegments([
      { key: 'Food', value: 30 },
      { key: 'Other', value: 0 },
      { key: 'Transport', value: 70 },
    ])
    expect(segments.map((s) => s.key)).toEqual(['Food', 'Transport'])
    expect(segments[0].percent).toBe(30)
    expect(segments[0].dashArray).toBe('30 70')
    expect(segments[1].dashOffset).toBe(-30)
  })

  it('is leeg zonder positieve waarden en een volle ring bij één segment', () => {
    expect(donutSegments([{ key: 'a', value: 0 }])).toEqual([])
    expect(donutSegments([{ key: 'a', value: 5 }], 100, 2)[0].dashArray).toBe('100 0')
  })
})

describe('barWidths', () => {
  it('schaalt naar de grootste waarde', () => {
    expect(barWidths([50, 100, 0])).toEqual([50, 100, 0])
    expect(barWidths([0, 0])).toEqual([0, 0])
  })
})
