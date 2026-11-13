import { describe, expect, it } from 'vitest'
import { delayMinutes, flightStatusMeta, flightTrackerUrl, formatFlightTime, isFlightToday, normalizeFlightNumber } from './flights'

describe('flights', () => {
  it('normaliseert vluchtnummers zoals de backend', () => {
    expect(normalizeFlightNumber('KL1234')).toBe('KL1234')
    expect(normalizeFlightNumber('kl 0123')).toBe('KL123')
    expect(normalizeFlightNumber('U2-1234')).toBe('U21234')
    expect(normalizeFlightNumber('klm 645')).toBe('KLM645')
    expect(normalizeFlightNumber('BA9A')).toBe('BA9A')
    for (const bad of [null, '', '  ', 'KL', 'KL12345', 'KL0000', 'K', 'KL12AB', 42]) {
      expect(normalizeFlightNumber(bad)).toBeNull()
    }
  })

  it('bouwt de Flightradar24-link', () => {
    expect(flightTrackerUrl('kl 1234')).toBe('https://www.flightradar24.com/data/flights/kl1234')
    expect(flightTrackerUrl('nope')).toBeNull()
  })

  it('berekent de vertraging in minuten', () => {
    expect(delayMinutes('2026-11-05T11:00:00Z', '2026-11-05T11:25:00Z')).toBe(25)
    expect(delayMinutes('2026-11-05T11:00:00Z', '2026-11-05T10:55:00Z')).toBe(0)
    expect(delayMinutes(null, '2026-11-05T11:25:00Z')).toBe(0)
  })

  it('toont tijden in de tijdzone van de luchthaven, anders als toesteltijd', () => {
    expect(formatFlightTime('2026-11-05T11:25:00Z', 'Europe/Amsterdam')).toEqual({ text: '12:25', local: true })
    expect(formatFlightTime('2026-11-05T11:25:00Z', 'Not/AZone').local).toBe(false)
    expect(formatFlightTime('2026-11-05T11:25:00Z', null).local).toBe(false)
    expect(formatFlightTime(null, 'Europe/Amsterdam')).toBeNull()
  })

  it('weet of een vlucht vandaag vertrekt en kent alle statussen', () => {
    const now = new Date(2026, 10, 5, 9, 30)
    expect(isFlightToday('2026-11-05T00:00:00Z', now)).toBe(true)
    expect(isFlightToday('2026-11-06T00:00:00Z', now)).toBe(false)
    expect(isFlightToday(null, now)).toBe(false)
    expect(flightStatusMeta('cancelled').tone).toBe('danger')
    expect(flightStatusMeta('delayed').tone).toBe('warn')
    expect(flightStatusMeta('whatever')).toEqual(flightStatusMeta('unknown'))
  })
})
