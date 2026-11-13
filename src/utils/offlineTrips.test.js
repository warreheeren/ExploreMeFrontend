import { beforeEach, describe, expect, it } from 'vitest'
import { forgetOfflineTrip, getOfflineTrips, lonLatToTile, rememberOfflineTrip, tilesForBounds, tileUrl, tripApiUrls, tripBounds } from './offlineTrips'

describe('lijst van offline reizen', () => {
  beforeEach(() => localStorage.clear())

  it('onthoudt en vergeet reizen, nieuwste eerst', () => {
    rememberOfflineTrip({ id: 'a', title: 'A' }, new Date('2026-10-01T10:00:00Z'))
    rememberOfflineTrip({ id: 'b', title: 'B' })
    rememberOfflineTrip({ id: 'a', title: 'A2' })
    expect(getOfflineTrips().map((t) => t.title)).toEqual(['A2', 'B'])
    forgetOfflineTrip('a')
    expect(getOfflineTrips().map((t) => t.id)).toEqual(['b'])
  })

  it('overleeft kapotte opslag', () => {
    localStorage.setItem('offlineTrips', '{kapot')
    expect(getOfflineTrips()).toEqual([])
  })
})

describe('tripApiUrls', () => {
  it('voegt deelnemer-endpoints alleen toe voor reisgenoten', () => {
    expect(tripApiUrls({ id: 'x', canEdit: false })).not.toContain('/api/trips/x/budget')
    expect(tripApiUrls({ id: 'x', canEdit: true }, 'https://api.test')).toContain('https://api.test/api/trips/x/budget')
    expect(tripApiUrls({ id: 'x' })).toContain('/api/trips/x/posts?take=30')
    expect(tripApiUrls({ id: 'x' })).toContain('/api/trips/x/country-info')
  })
})

describe('kaarttegels', () => {
  it('rekent tegelcoördinaten uit', () => {
    expect(lonLatToTile(0, 0, 1)).toEqual({ x: 1, y: 1 })
    expect(lonLatToTile(-180, 85, 2)).toEqual({ x: 0, y: 0 })
  })

  it('respecteert de limiet en begint bij de laagste zoom', () => {
    const bounds = tripBounds([{ latitude: 46.0, longitude: 14.0 }, { latitude: 46.5, longitude: 14.6 }])
    const tiles = tilesForBounds(bounds, [14, 8, 10, 12], 300)
    expect(tiles.length).toBeLessThanOrEqual(300)
    expect(tiles[0].z).toBe(8)
    expect(tiles.some((t) => t.z === 14)).toBe(false)
    expect(tilesForBounds(null, [8])).toEqual([])
  })

  it('vult een tegel-URL in', () => {
    expect(tileUrl('https://{s}.tiles.test/{z}/{x}/{y}.png', { z: 3, x: 4, y: 5 })).toBe('https://a.tiles.test/3/4/5.png')
  })
})
