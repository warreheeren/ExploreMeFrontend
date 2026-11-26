import { describe, expect, it } from 'vitest'
import { groupTrips, tripDayProgress, tripPhase, waitingCount } from './myTrips'

const NOW = new Date(2026, 10, 18, 14, 0)   // 18 november 2026, lokale tijd
const day = (offset) => new Date(Date.UTC(2026, 10, 18 + offset)).toISOString()
const item = (id, start, end, extra = {}) => ({ trip: { id, startDate: day(start), endDate: day(end) }, actionCount: 0, ...extra })

describe('tripPhase', () => {
  it('deelt een reis in op de datum van vandaag', () => {
    expect(tripPhase(item('a', -1, 2), NOW)).toBe('active')
    expect(tripPhase(item('b', 0, 0), NOW)).toBe('active')     // eendaagse reis vandaag
    expect(tripPhase(item('c', 1, 5), NOW)).toBe('upcoming')
    expect(tripPhase(item('d', -9, -1), NOW)).toBe('past')
  })

  it('noemt een reis alleen "zonder datum" zolang ze niet begonnen is', () => {
    expect(tripPhase(item('a', 30, 34, { hasOpenDatePoll: true }), NOW)).toBe('undated')
    expect(tripPhase(item('b', -1, 2, { hasOpenDatePoll: true }), NOW)).toBe('active')
    expect(tripPhase(item('c', -9, -1, { hasOpenDatePoll: true }), NOW)).toBe('past')
  })
})

describe('groupTrips', () => {
  it('sorteert komend op vroegste start en afgelopen op recentste einde', () => {
    const groups = groupTrips([
      item('later', 40, 44), item('soon', 3, 6), item('old', -60, -50), item('recent', -9, -2), item('now', -1, 1),
    ], NOW)
    expect(groups.active.map((i) => i.trip.id)).toEqual(['now'])
    expect(groups.upcoming.map((i) => i.trip.id)).toEqual(['soon', 'later'])
    expect(groups.past.map((i) => i.trip.id)).toEqual(['recent', 'old'])
    expect(groups.undated).toEqual([])
  })

  it('verdraagt een lege of ontbrekende lijst', () => {
    expect(groupTrips(undefined, NOW).active).toEqual([])
  })
})

describe('tripDayProgress', () => {
  it('telt de dag van de reis', () => {
    expect(tripDayProgress(item('a', -1, 2).trip, NOW)).toEqual({ day: 2, total: 4 })
    expect(tripDayProgress(item('b', 0, 0).trip, NOW)).toEqual({ day: 1, total: 1 })
  })
})

describe('waitingCount', () => {
  it('telt acties over alle reizen plus uitnodigingen', () => {
    expect(waitingCount([{ actionCount: 2 }, { actionCount: 0 }, { actionCount: 5 }], [{}, {}])).toBe(9)
    expect(waitingCount([], [])).toBe(0)
  })
})
