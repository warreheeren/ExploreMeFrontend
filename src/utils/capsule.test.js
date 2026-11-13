import { describe, expect, it } from 'vitest'
import { capsuleCountdown, capsuleOpenAt, isUnsealed, markUnsealed } from './capsule'

describe('capsuleOpenAt', () => {
  it('opens the day after the trip at 09:00 UTC', () => {
    expect(capsuleOpenAt('TripEnd', '2026-11-12T00:00:00Z').toISOString()).toBe('2026-11-13T09:00:00.000Z')
    expect(capsuleOpenAt('TripEnd', '2026-12-31').toISOString()).toBe('2027-01-01T09:00:00.000Z')
  })

  it('opens one year after the end date, clamping 29 February', () => {
    expect(capsuleOpenAt('OneYear', '2026-11-12').toISOString()).toBe('2027-11-12T09:00:00.000Z')
    expect(capsuleOpenAt('OneYear', '2028-02-29').toISOString()).toBe('2029-02-28T09:00:00.000Z')
  })

  it('returns null for custom or missing dates', () => {
    expect(capsuleOpenAt('Custom', '2026-11-12')).toBeNull()
    expect(capsuleOpenAt('TripEnd', null)).toBeNull()
  })
})

describe('capsuleCountdown', () => {
  const now = new Date('2026-10-13T12:00:00Z')

  it('splits the remaining time in days, hours and minutes', () => {
    expect(capsuleCountdown('2026-10-15T15:30:00Z', now)).toEqual({ open: false, days: 2, hours: 3, minutes: 30 })
    expect(capsuleCountdown('2026-10-13T12:00:20Z', now)).toEqual({ open: false, days: 0, hours: 0, minutes: 1 })
  })

  it('is open once the moment has passed', () => {
    expect(capsuleCountdown('2026-10-13T12:00:00Z', now).open).toBe(true)
    expect(capsuleCountdown('2026-10-01T00:00:00Z', now).open).toBe(true)
  })
})

describe('unsealed capsules', () => {
  it('remembers which capsules were opened', () => {
    expect(isUnsealed('a')).toBe(false)
    markUnsealed('a')
    expect(isUnsealed('a')).toBe(true)
    expect(isUnsealed('b')).toBe(false)
  })
})
