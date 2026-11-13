import { describe, expect, it } from 'vitest'
import { partialLeg, photosByStop, splitRouteIntoLegs } from './routeReplay'

const stops = [
  { id: 'a', latitude: 0, longitude: 0 },
  { id: 'b', latitude: 0, longitude: 2 },
  { id: 'c', latitude: 2, longitude: 2 },
]

describe('splitRouteIntoLegs', () => {
  it('knipt de geometrie bij de dichtstbijzijnde punten', () => {
    const geometry = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]
    const legs = splitRouteIntoLegs(geometry, stops)
    expect(legs).toEqual([
      [[0, 0], [0, 1], [0, 2]],
      [[0, 2], [1, 2], [2, 2]],
    ])
  })

  it('valt terug op rechte lijnen zonder geometrie', () => {
    expect(splitRouteIntoLegs(null, stops)).toEqual([[[0, 0], [0, 2]], [[0, 2], [2, 2]]])
    expect(splitRouteIntoLegs([], stops.slice(0, 1))).toEqual([])
  })
})

describe('partialLeg', () => {
  it('interpoleert halverwege de etappe', () => {
    expect(partialLeg([[0, 0], [0, 2]], 0.5)).toEqual([[0, 0], [0, 1]])
    expect(partialLeg([[0, 0], [0, 1], [0, 2]], 1)).toHaveLength(3)
    expect(partialLeg([[0, 0], [0, 2]], 0)).toEqual([[0, 0]])
  })
})

describe('photosByStop', () => {
  it('groepeert per stop', () => {
    const map = photosByStop([{ tripStopId: 'a', imageUrl: '1' }, { tripStopId: 'a', imageUrl: '2' }, { tripStopId: 'b', imageUrl: '3' }])
    expect(map.a).toHaveLength(2)
    expect(map.b[0].imageUrl).toBe('3')
  })
})
