import { describe, expect, it } from 'vitest'
import { countdownState, formatCountdown, fromLocalInput, msUntil, toLocalInput, validateDeadline } from './safety'

const MIN = 60 * 1000

describe('formatCountdown', () => {
  it('shows hours:minutes above an hour and minutes below', () => {
    expect(formatCountdown(125 * MIN)).toBe('2:05')
    expect(formatCountdown(45 * MIN + 30000)).toBe('45 min')
  })

  it('counts down in seconds during the last five minutes', () => {
    expect(formatCountdown(3 * MIN + 20000)).toBe('3:20')
    expect(formatCountdown(9000)).toBe('0:09')
  })

  it('shows overdue time with a minus sign', () => {
    expect(formatCountdown(-4 * MIN)).toBe('-4 min')
    expect(formatCountdown(-10000)).toBe('-1 min')
    expect(formatCountdown(-90 * MIN)).toBe('-1:30')
  })
})

describe('countdownState', () => {
  it('warns in the last quarter and flags overdue deadlines', () => {
    expect(countdownState(60 * MIN)).toBe('ok')
    expect(countdownState(15 * MIN)).toBe('warning')
    expect(countdownState(-1)).toBe('overdue')
  })
})

describe('deadline helpers', () => {
  const now = new Date(2026, 10, 5, 10, 0)

  it('round-trips datetime-local values in local time', () => {
    expect(toLocalInput(now)).toBe('2026-11-05T10:00')
    expect(fromLocalInput('2026-11-05T12:30').getTime()).toBe(new Date(2026, 10, 5, 12, 30).getTime())
    expect(fromLocalInput('')).toBeNull()
  })

  it('accepts deadlines between 15 minutes and 48 hours ahead', () => {
    expect(validateDeadline(new Date(2026, 10, 5, 10, 10), now)).toBe('tooSoon')
    expect(validateDeadline(new Date(2026, 10, 5, 10, 15), now)).toBeNull()
    expect(validateDeadline(new Date(2026, 10, 7, 10, 0), now)).toBeNull()
    expect(validateDeadline(new Date(2026, 10, 7, 10, 1), now)).toBe('tooLate')
    expect(validateDeadline(null, now)).toBe('tooSoon')
  })

  it('measures time until an API timestamp', () => {
    expect(msUntil('2026-11-05T10:30:00Z', new Date('2026-11-05T10:00:00Z'))).toBe(30 * MIN)
  })
})
