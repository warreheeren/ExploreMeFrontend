import { afterEach, describe, expect, it, vi } from 'vitest'
import { dragTransform, loadSkipped, saveSkipped, swipeDirection, swipeProgress, SWIPE_THRESHOLD } from './swipe'

describe('swipeDirection', () => {
  it('detects horizontal swipes past the threshold', () => {
    expect(swipeDirection(SWIPE_THRESHOLD + 1, 10)).toBe('right')
    expect(swipeDirection(-(SWIPE_THRESHOLD + 1), 10)).toBe('left')
  })

  it('ignores short or mostly vertical movements', () => {
    expect(swipeDirection(SWIPE_THRESHOLD - 1, 0)).toBeNull()
    expect(swipeDirection(120, 200)).toBeNull()
    expect(swipeDirection(NaN, 0)).toBeNull()
  })

  it('accepts a custom threshold (lightbox)', () => {
    expect(swipeDirection(-50, 5, 40)).toBe('left')
  })
})

describe('drag helpers', () => {
  it('tilts the card but caps the rotation', () => {
    expect(dragTransform(40, 10)).toBe('translate(40px, 3px) rotate(2.0deg)')
    expect(dragTransform(-1000, 0)).toContain('rotate(-15.0deg)')
    expect(swipeProgress(SWIPE_THRESHOLD * 2)).toBe(1)
    expect(swipeProgress(SWIPE_THRESHOLD / 2)).toBe(0.5)
  })
})

describe('skipped places storage', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('round-trips unique ids', () => {
    saveSkipped('k', ['a', 'b', 'a'])
    expect(loadSkipped('k')).toEqual(['a', 'b'])
  })

  it('survives corrupt data and unavailable storage', () => {
    localStorage.setItem('k', '{not json')
    expect(loadSkipped('k')).toEqual([])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => saveSkipped('k', ['x'])).not.toThrow()
  })
})
