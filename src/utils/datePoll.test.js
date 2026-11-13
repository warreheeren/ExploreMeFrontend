import { describe, expect, it } from 'vitest'
import { addDaysToKey, buildMonths, dayStats, nextAvailability, toVotePayload } from './datePoll'

describe('datePoll utils', () => {
  it('cycles none → yes → maybe → no → none', () => {
    expect(nextAvailability(undefined)).toBe('Yes')
    expect(nextAvailability('Yes')).toBe('Maybe')
    expect(nextAvailability('Maybe')).toBe('No')
    expect(nextAvailability('No')).toBeNull()
  })

  it('builds Monday-first months covering the range', () => {
    const months = buildMonths('2026-11-28T00:00:00Z', '2026-12-02T00:00:00Z')
    expect(months.map((m) => m.key)).toEqual(['2026-11', '2026-12'])
    // 1 november 2026 is een zondag → 6 lege cellen ervoor.
    expect(months[0].cells.slice(0, 6).every((c) => c === null)).toBe(true)
    expect(months[0].cells[6]).toMatchObject({ key: '2026-11-01', inRange: false })
    const inRange = months.flatMap((m) => m.cells).filter((c) => c?.inRange).map((c) => c.key)
    expect(inRange).toEqual(['2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02'])
  })

  it('crosses year boundaries', () => {
    expect(buildMonths('2026-12-30', '2027-01-02').map((m) => m.key)).toEqual(['2026-12', '2027-01'])
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('scores days relative to all participants', () => {
    const stats = dayStats([
      { days: { '2026-11-01': 'Yes', '2026-11-02': 'Maybe' } },
      { days: { '2026-11-01': 'Yes', '2026-11-02': 'No' } },
      { days: {} },
    ])
    expect(stats['2026-11-01']).toMatchObject({ yes: 2, maybe: 0, no: 0 })
    expect(stats['2026-11-01'].ratio).toBeCloseTo(4 / 6)
    expect(stats['2026-11-02']).toMatchObject({ yes: 0, maybe: 1, no: 1 })
  })

  it('serializes votes as sorted UTC midnights', () => {
    expect(toVotePayload({ '2026-11-02': 'No', '2026-11-01': 'Yes', '2026-11-03': null })).toEqual([
      { date: '2026-11-01T00:00:00.000Z', availability: 'Yes' },
      { date: '2026-11-02T00:00:00.000Z', availability: 'No' },
    ])
  })
})
