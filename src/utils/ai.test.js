import { describe, expect, it } from 'vitest'
import { draftMapStops, MAX_HISTORY, stopsByDay, toHistory } from './ai'
import { googleCalendarUrl, toWebcalUrl } from './calendarFeed'

describe('toHistory', () => {
  it('keeps only successful user/assistant turns, newest last', () => {
    const messages = [
      { role: 'user', text: 'Hoi' },
      { role: 'assistant', text: 'Fout', error: true },
      { role: 'assistant', text: 'Hallo!' },
      { role: 'system', text: 'x' },
    ]
    expect(toHistory(messages)).toEqual([{ role: 'user', text: 'Hoi' }, { role: 'assistant', text: 'Hallo!' }])
  })

  it('caps the history length', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `m${i}` }))
    const history = toHistory(many)
    expect(history).toHaveLength(MAX_HISTORY)
    expect(history.at(-1).text).toBe('m24')
  })
})

describe('draft helpers', () => {
  const stops = [
    { name: 'B', day: 2, type: 'Activity', latitude: 1, longitude: 1 },
    { name: 'A', day: 1, type: 'Waypoint', latitude: 2, longitude: 2 },
    { name: 'C', day: 9, type: 'FoodSpot', latitude: 3, longitude: 3 },
  ]

  it('groups stops per day and clamps out-of-range days', () => {
    const days = stopsByDay(stops, 3)
    expect(days.map((d) => d.stops.map((s) => s.name))).toEqual([['A'], ['B'], ['C']])
    expect(days[0].stops[0].index).toBe(1)
  })

  it('orders map stops by day with stable ids', () => {
    expect(draftMapStops(stops).map((s) => [s.name, s.orderIndex, s.id])).toEqual([
      ['A', 0, 'draft-1'], ['B', 1, 'draft-0'], ['C', 2, 'draft-2'],
    ])
  })
})

describe('calendar feed links', () => {
  it('builds webcal and Google Calendar links', () => {
    const url = 'https://api.example.com/api/calendar/abc_123.ics'
    expect(toWebcalUrl(url)).toBe('webcal://api.example.com/api/calendar/abc_123.ics')
    expect(googleCalendarUrl(url)).toBe('https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fapi.example.com%2Fapi%2Fcalendar%2Fabc_123.ics')
    expect(toWebcalUrl('')).toBe('')
  })
})
