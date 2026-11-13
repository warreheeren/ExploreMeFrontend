import { describe, expect, it } from 'vitest'
import { formatCo2, roundCo2, savingPercent } from './footprint'

describe('footprint', () => {
  it('rounds to 1 kg below 100 and to 10 kg above', () => {
    expect(roundCo2(12.4)).toBe(12)
    expect(roundCo2(99.4)).toBe(99)
    expect(roundCo2(246.7)).toBe(250)
    expect(roundCo2(-3)).toBe(0)
  })

  it('formats as an estimate', () => {
    expect(formatCo2(0.2)).toBe('< 1 kg')
    expect(formatCo2(0)).toBe('± 0 kg')
    expect(formatCo2(42.6)).toBe('± 43 kg')
  })

  it('compares with an alternative', () => {
    expect(savingPercent(25, 100)).toBe(75)
    expect(savingPercent(150, 100)).toBe(-50)
    expect(savingPercent(10, 0)).toBeNull()
  })
})
