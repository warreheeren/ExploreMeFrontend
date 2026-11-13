import { describe, expect, it } from 'vitest'
import { buildItinerary } from './itinerary'

describe('buildItinerary', () => {
  it('zet overnachtingen op hun check-in-dag en verdeelt de rest in volgorde', () => {
    const trip = {
      startDate: '2026-11-04',
      endDate: '2026-11-06',
      stops: [
        { id: 'a', type: 'Waypoint', orderIndex: 0 },
        { id: 'h', type: 'Accommodation', orderIndex: 1, checkInDate: '2026-11-06' },
        { id: 'b', type: 'FoodSpot', orderIndex: 2 },
        { id: 'c', type: 'Activity', orderIndex: 3 },
      ],
    }
    const days = buildItinerary(trip)
    expect(days.map((d) => [d.dayNumber, d.stops.map((s) => s.id)])).toEqual([
      [1, ['a']],
      [2, ['b']],
      [3, ['h', 'c']],
    ])
  })

  it('zet vastgezette dagen eerst en sorteert binnen een dag op tijd', () => {
    const trip = {
      startDate: '2026-11-04',
      endDate: '2026-11-06',
      stops: [
        { id: 'a', type: 'Waypoint', orderIndex: 0, dayNumber: 3, startTime: '14:00' },
        { id: 'h', type: 'Accommodation', orderIndex: 1, checkInDate: '2026-11-06' },
        { id: 'b', type: 'FoodSpot', orderIndex: 2, dayNumber: 3, startTime: '09:30' },
        { id: 'c', type: 'Activity', orderIndex: 3 },
        { id: 'x', type: 'Waypoint', orderIndex: 4, dayNumber: 99 },
      ],
    }
    const days = buildItinerary(trip)
    expect(days.map((d) => [d.dayNumber, d.stops.map((s) => s.id)])).toEqual([
      [1, ['c']],
      [2, ['x']],
      [3, ['b', 'a', 'h']],
    ])
  })

  it('laat lege dagen weg en werkt zonder stops', () => {
    expect(buildItinerary({ startDate: '2026-11-04', endDate: '2026-11-10', stops: [] })).toEqual([])
  })
})
