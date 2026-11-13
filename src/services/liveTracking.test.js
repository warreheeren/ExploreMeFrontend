import { describe, expect, it } from 'vitest'
import { MIN_INTERVAL_MS, distanceMeters, isTripActive, liveTracking, shouldSend, startLiveTracking, trackingUntil } from './liveTracking'

const DAY = 24 * 60 * 60 * 1000
const bled = { latitude: 46.3683, longitude: 14.1146 }
// ± 150 m ten noorden van Bled
const nearBled = { latitude: 46.3697, longitude: 14.1146 }
// ± 40 m
const closeToBled = { latitude: 46.36866, longitude: 14.1146 }

describe('liveTracking', () => {
  it('measures distances in metres', () => {
    expect(distanceMeters(bled, bled)).toBe(0)
    expect(distanceMeters(bled, nearBled)).toBeGreaterThan(140)
    expect(distanceMeters(bled, nearBled)).toBeLessThan(170)
    // Ljubljana – Bled ≈ 45 km
    expect(distanceMeters({ latitude: 46.0569, longitude: 14.5058 }, bled) / 1000).toBeCloseTo(45, -1)
  })

  it('throttles to 2 minutes and 100 m', () => {
    const now = 1_000_000_000
    expect(shouldSend(null, bled, now)).toBe(true)
    expect(shouldSend(null, null, now)).toBe(false)

    const last = { ...bled, at: now }
    expect(shouldSend(last, nearBled, now + MIN_INTERVAL_MS - 1)).toBe(false) // te vroeg
    expect(shouldSend(last, closeToBled, now + MIN_INTERVAL_MS)).toBe(false) // te dichtbij
    expect(shouldSend(last, nearBled, now + MIN_INTERVAL_MS)).toBe(true)
  })

  it('tracks until the story expires or the trip ends, whichever comes first', () => {
    const now = Date.parse('2026-11-05T10:00:00Z')
    // Story verloopt morgen 10:00, de reis loopt tot en met 12 november.
    expect(trackingUntil('2026-11-06T10:00:00Z', '2026-11-12T00:00:00Z', now)).toBe(Date.parse('2026-11-06T10:00:00Z'))
    // Laatste reisdag vandaag: tot middernacht (UTC).
    expect(trackingUntil('2026-11-06T10:00:00Z', '2026-11-05T00:00:00Z', now)).toBe(Date.parse('2026-11-06T00:00:00Z'))
    // Al voorbij of onbekend.
    expect(trackingUntil('2026-11-05T09:00:00Z', null, now)).toBeNull()
    expect(trackingUntil(null, null, now)).toBeNull()
  })

  it('knows whether a trip is under way (end date inclusive)', () => {
    const trip = { startDate: '2026-11-04T00:00:00Z', endDate: '2026-11-12T00:00:00Z' }
    expect(isTripActive(trip, Date.parse('2026-11-03T23:59:00Z'))).toBe(false)
    expect(isTripActive(trip, Date.parse('2026-11-04T00:00:00Z'))).toBe(true)
    expect(isTripActive(trip, Date.parse('2026-11-12T23:00:00Z'))).toBe(true)
    expect(isTripActive(trip, Date.parse('2026-11-13T00:00:00Z'))).toBe(false)
    expect(isTripActive({}, Date.now())).toBe(false)
  })

  it('never starts outside the native app', async () => {
    expect(await startLiveTracking({ tripId: 'trip-1', until: Date.now() + DAY })).toBe(false)
    expect(liveTracking.active).toBe(false)
  })
})
