import { describe, expect, it } from 'vitest'
import { actionCountByGroup, groupSteps } from './tripOverview'

const NOW = new Date(2026, 10, 18, 14, 0)
const day = (offset) => new Date(Date.UTC(2026, 10, 18 + offset)).toISOString()
const base = { participantCount: 4, hasOpenDatePoll: false, stopCount: 3, startDate: day(30), endDate: day(34), balance: null }
const states = (s) => Object.fromEntries(groupSteps(s, NOW).map((x) => [x.id, x.state]))

describe('groupSteps', () => {
  it('alles geregeld vóór vertrek: alleen verrekenen komt later', () => {
    expect(states(base)).toEqual({ group: 'done', dates: 'done', route: 'done', settle: 'later' })
  })

  it('maakt alleen de eerste open stap "nu"', () => {
    expect(states({ ...base, participantCount: 1, stopCount: 0 })).toEqual({ group: 'now', dates: 'done', route: 'later', settle: 'later' })
    expect(states({ ...base, hasOpenDatePoll: true, stopCount: 0 })).toEqual({ group: 'done', dates: 'now', route: 'later', settle: 'later' })
    expect(states({ ...base, stopCount: 0 })).toEqual({ group: 'done', dates: 'done', route: 'now', settle: 'later' })
  })

  it('na de reis: verrekenen is nu zolang er een saldo openstaat, daarna klaar', () => {
    const past = { ...base, startDate: day(-9), endDate: day(-2) }
    expect(states({ ...past, balance: -12.5 }).settle).toBe('now')
    expect(states({ ...past, balance: 42 }).settle).toBe('now')
    expect(states({ ...past, balance: null }).settle).toBe('done')
    expect(states({ ...past, balance: 0.001 }).settle).toBe('done')
  })

  it('tijdens de reis is verrekenen nog niet aan de orde, ook niet met een saldo', () => {
    expect(states({ ...base, startDate: day(-1), endDate: day(2), balance: 30 }).settle).toBe('later')
  })
})

describe('actionCountByGroup', () => {
  const groups = [{ id: 'regelen', tabs: ['stemmen', 'paklijst', 'documenten'] }, { id: 'geld', tabs: ['budget'] }]

  it('telt acties per hoofdtabblad', () => {
    const actions = [{ tab: 'stemmen' }, { tab: 'paklijst' }, { tab: 'budget' }, { tab: 'onbekend' }]
    expect(actionCountByGroup(actions, groups)).toEqual({ regelen: 2, geld: 1 })
  })

  it('verdraagt een lege lijst', () => {
    expect(actionCountByGroup(undefined, groups)).toEqual({})
  })
})
