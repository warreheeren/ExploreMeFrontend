import { describe, expect, it, beforeEach } from 'vitest'
import { getDoneStops, isTripRunning, navigationUrl, nextStop, setDoneStops, stopsForToday, tripDayStatus } from './today'

const trip = {
  id: 't1',
  startDate: '2026-07-10T00:00:00Z',
  endDate: '2026-07-14T00:00:00Z',
  stops: [
    { id: 'a', name: 'A', orderIndex: 0, dayNumber: 2, startTime: '14:00', latitude: 1, longitude: 2 },
    { id: 'b', name: 'B', orderIndex: 1, dayNumber: 2, startTime: '09:00', latitude: 3, longitude: 4 },
    { id: 'c', name: 'C', orderIndex: 2, dayNumber: 2, latitude: 5, longitude: 6 },
    { id: 'd', name: 'D', orderIndex: 3, dayNumber: 4, latitude: 7, longitude: 8 },
  ],
}
const at = (date, time = '12:00') => new Date(`${date}T${time}:00`)

describe('tripDayStatus', () => {
  it('weet of de reis nog moet beginnen, loopt of voorbij is', () => {
    expect(tripDayStatus(trip, at('2026-07-07'))).toMatchObject({ state: 'before', daysUntilStart: 3 })
    expect(tripDayStatus(trip, at('2026-07-11'))).toMatchObject({ state: 'during', dayNumber: 2 })
    expect(tripDayStatus(trip, at('2026-07-14', '23:59'))).toMatchObject({ state: 'during', dayNumber: 5 })
    expect(tripDayStatus(trip, at('2026-07-15'))).toMatchObject({ state: 'after' })
    expect(isTripRunning(trip, at('2026-07-10'))).toBe(true)
    expect(isTripRunning(trip, at('2026-07-09'))).toBe(false)
  })
})

describe('stopsForToday & nextStop', () => {
  it('geeft de stops van vandaag op tijd gesorteerd', () => {
    expect(stopsForToday(trip, at('2026-07-11')).map((s) => s.id)).toEqual(['b', 'a', 'c'])
    expect(stopsForToday(trip, at('2026-07-12'))).toEqual([])
  })

  it('kiest de eerste stop met een tijd na nu, anders de eerste open stop', () => {
    const stops = stopsForToday(trip, at('2026-07-11'))
    expect(nextStop(stops, [], at('2026-07-11', '08:00')).id).toBe('b')
    expect(nextStop(stops, [], at('2026-07-11', '10:00')).id).toBe('a')
    expect(nextStop(stops, [], at('2026-07-11', '15:00')).id).toBe('b')
    expect(nextStop(stops, ['b'], at('2026-07-11', '15:00')).id).toBe('a')
    expect(nextStop(stops, ['a', 'b', 'c'], at('2026-07-11'))).toBeNull()
  })
})

describe('navigationUrl', () => {
  it('gebruikt geo: op Android en Google Maps elders', () => {
    expect(navigationUrl(trip.stops[0], 'Mozilla/5.0 (Linux; Android 14)')).toBe('geo:1,2?q=1,2(A)')
    expect(navigationUrl(trip.stops[0], 'Mozilla/5.0 (iPhone)')).toBe('https://www.google.com/maps/dir/?api=1&destination=1,2')
  })
})

describe('afgevinkte stops', () => {
  beforeEach(() => localStorage.clear())

  it('bewaart per reis en dag en overleeft kapotte opslag', () => {
    setDoneStops('t1', '2026-07-11', ['a'])
    expect(getDoneStops('t1', '2026-07-11')).toEqual(['a'])
    expect(getDoneStops('t1', '2026-07-12')).toEqual([])
    localStorage.setItem('today-done:t1:2026-07-11', '{kapot')
    expect(getDoneStops('t1', '2026-07-11')).toEqual([])
  })
})
