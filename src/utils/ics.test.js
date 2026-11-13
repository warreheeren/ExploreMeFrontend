import { describe, expect, it } from 'vitest'
import { buildTripIcs, escapeIcsText, foldLine, safeFileName } from './ics'

const trip = {
  id: 'abc',
  title: 'Roadtrip; Slovenië, deel 1',
  description: 'Meren\nen bergen',
  country: 'Slovenië',
  startDate: '2026-11-04T00:00:00Z',
  endDate: '2026-11-12T00:00:00Z',
  stops: [
    { id: 'h1', type: 'Accommodation', name: 'Hotel Cubo', address: 'Ljubljana', checkInDate: '2026-11-04', checkOutDate: '2026-11-06', latitude: 46.05, longitude: 14.5 },
    { id: 'w1', type: 'Waypoint', name: 'Bled', latitude: 46.36, longitude: 14.11 },
  ],
}

describe('buildTripIcs', () => {
  const ics = buildTripIcs(trip, { url: 'https://app.test/trips/abc', now: new Date('2026-10-12T10:00:00Z') })

  it('maakt een geldige kalender met CRLF-regels', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('gebruikt hele-dag-events met een exclusieve einddatum', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261104')
    expect(ics).toContain('DTEND;VALUE=DATE:20261113')
  })

  it('voegt overnachtingen toe als aparte events', () => {
    expect(ics).toContain('SUMMARY:Overnachting: Hotel Cubo')
    expect(ics).toContain('DTEND;VALUE=DATE:20261106')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  })

  it('escapet speciale tekens', () => {
    expect(ics).toContain('SUMMARY:Roadtrip\\; Slovenië\\, deel 1')
    expect(escapeIcsText('a\nb')).toBe('a\\nb')
  })
})

describe('helpers', () => {
  it('vouwt lange regels', () => {
    const folded = foldLine('X'.repeat(160))
    expect(folded.split('\r\n').every((l) => l.length <= 75)).toBe(true)
  })

  it('maakt veilige bestandsnamen', () => {
    expect(safeFileName('Roadtrip door Slovenië!')).toBe('roadtrip-door-slovenie')
    expect(safeFileName('***')).toBe('reis')
  })
})
