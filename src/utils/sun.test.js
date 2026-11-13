import { describe, expect, it } from 'vitest'
import { formatClock, getSunTimes, todayIn } from './sun'

const clock = (d, zone) => formatClock(d, zone, 'nl-NL')
const minutesBetween = (a, b) => Math.abs(a - b) / 60000

describe('getSunTimes', () => {
  it('geeft op- en ondergang in Amsterdam rond de zomerzonnewende', () => {
    // Referentie (timeanddate): 21 juni 2026, Amsterdam 05:18 / 22:06 CEST.
    const s = getSunTimes('2026-06-21', 52.37, 4.89)
    expect(s.polar).toBeNull()
    expect(minutesBetween(s.sunrise, new Date('2026-06-21T03:18:00Z'))).toBeLessThan(3)
    expect(minutesBetween(s.sunset, new Date('2026-06-21T20:06:00Z'))).toBeLessThan(3)
    expect(clock(s.sunrise, 'Europe/Amsterdam')).toMatch(/^05:1\d$/)
  })

  it('rekent in lokale tijd van de plek, ook ver van de browser', () => {
    // Bangkok 1 januari: zon op ±06:42, onder ±18:00 (ICT, UTC+7).
    const s = getSunTimes('2026-01-01T00:00:00Z', 13.75, 100.5)
    expect(clock(s.sunrise, 'Asia/Bangkok')).toMatch(/^06:(3\d|4\d)$/)
    expect(clock(s.sunset, 'Asia/Bangkok')).toMatch(/^1[78]:\d\d$/)
  })

  it('legt het gouden uur tussen zonsopgang en middag', () => {
    const s = getSunTimes('2026-09-01', 48.85, 2.35)
    expect(s.goldenMorningEnd > s.sunrise).toBe(true)
    expect(s.goldenEveningStart < s.sunset).toBe(true)
    expect(minutesBetween(s.goldenEveningStart, s.sunset)).toBeGreaterThan(30)
    expect(minutesBetween(s.goldenEveningStart, s.sunset)).toBeLessThan(90)
  })

  it('herkent middernachtzon en poolnacht', () => {
    expect(getSunTimes('2026-06-21', 78.22, 15.65).polar).toBe('day') // Longyearbyen
    const night = getSunTimes('2026-12-21', 78.22, 15.65)
    expect(night.polar).toBe('night')
    expect(night.sunrise).toBeNull()
  })

  it('geeft lege tijden bij ongeldige invoer', () => {
    expect(getSunTimes(null, 1, 1).sunrise).toBeNull()
    expect(getSunTimes('2026-01-01', NaN, 1).sunrise).toBeNull()
  })
})

describe('todayIn', () => {
  it('geeft de datum in de tijdzone van de plek', () => {
    const now = new Date('2026-03-10T20:30:00Z')
    expect(todayIn('Pacific/Auckland', now)).toBe('2026-03-11')
    expect(todayIn('America/Los_Angeles', now)).toBe('2026-03-10')
    expect(todayIn('Nergens/Zone', now)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatClock', () => {
  it('valt terug op de browsertijd bij een onbekende zone', () => {
    expect(clock(new Date('2026-01-01T12:00:00Z'), 'Nergens/Zone')).toMatch(/^\d\d:\d\d$/)
  })
})
