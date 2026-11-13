import { describe, expect, it } from 'vitest'
import { isGpxFile, trackLatLngs, trackPopupHtml, trackStatParts } from './tracks'

const track = {
  id: 't1',
  name: 'Vintgar <kloof>',
  kind: 'Track',
  distanceMeters: 12400,
  elevationGainMeters: 639.6,
  durationSeconds: 3 * 3600 + 25 * 60,
  points: [[46.39, 14.08, 600], [46.4, 14.09], [null, 1], 'x'],
}

describe('tracks', () => {
  it('recognises gpx files by extension', () => {
    expect(isGpxFile({ name: 'Ochtendrit.GPX' })).toBe(true)
    expect(isGpxFile({ name: 'route.kml' })).toBe(false)
    expect(isGpxFile(null)).toBe(false)
  })

  it('builds stats and drops unknown values', () => {
    const parts = trackStatParts(track)
    expect(parts).toHaveLength(3)
    // formatDistance: vanaf 10 km zonder decimalen.
    expect(parts[0]).toBe('12 km')
    expect(parts[1]).toBe('↗ 640 m')
    expect(trackStatParts({ distanceMeters: 800, elevationGainMeters: null, durationSeconds: null })).toEqual(['800 m'])
  })

  it('keeps only valid lat/lon pairs', () => {
    expect(trackLatLngs(track)).toEqual([[46.39, 14.08], [46.4, 14.09]])
    expect(trackLatLngs({})).toEqual([])
  })

  it('escapes the track name in the popup', () => {
    const html = trackPopupHtml(track)
    expect(html).toContain('Vintgar &lt;kloof&gt;')
    expect(html).not.toContain('<kloof>')
  })
})
