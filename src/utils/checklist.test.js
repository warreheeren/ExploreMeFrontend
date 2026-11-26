import { describe, expect, it } from 'vitest'
import { deadlineState, isTask, sortPackingItems, sortTasks } from './checklist'
import nl from '@/i18n/locales/nl/checklist'
import en from '@/i18n/locales/en/checklist'

const NOW = new Date(2026, 5, 10, 15, 30) // 10 juni 2026, middag (lokale tijd)

describe('isTask', () => {
  it('herkent taken; items zonder kind horen bij de paklijst', () => {
    expect(isTask({ kind: 'Task' })).toBe(true)
    expect(isTask({ kind: 'Packing' })).toBe(false)
    expect(isTask({})).toBe(false)
  })
})

describe('sortTasks', () => {
  it('zet open taken met deadline eerst, dan zonder, en afgevinkte onderaan', () => {
    const sorted = sortTasks([
      { id: 'done-early', isDone: true, dueDate: '2026-06-01T00:00:00Z', orderIndex: 0 },
      { id: 'no-date-b', isDone: false, dueDate: null, orderIndex: 5 },
      { id: 'late', isDone: false, dueDate: '2026-06-20T00:00:00Z', orderIndex: 1 },
      { id: 'no-date-a', isDone: false, dueDate: null, orderIndex: 2 },
      { id: 'early', isDone: false, dueDate: '2026-06-12T00:00:00Z', orderIndex: 3 },
      { id: 'done-plain', isDone: true, dueDate: null, orderIndex: -1 },
    ])
    expect(sorted.map((i) => i.id)).toEqual(['early', 'late', 'no-date-a', 'no-date-b', 'done-plain', 'done-early'])
  })

  it('gebruikt de toevoegvolgorde bij gelijke deadline en wijzigt de invoer niet', () => {
    const input = [
      { id: 'b', isDone: false, dueDate: '2026-06-12T00:00:00Z', orderIndex: 2 },
      { id: 'a', isDone: false, dueDate: '2026-06-12T00:00:00Z', orderIndex: 1 },
    ]
    expect(sortTasks(input).map((i) => i.id)).toEqual(['a', 'b'])
    expect(input[0].id).toBe('b')
  })
})

describe('sortPackingItems', () => {
  it('houdt open items boven afgevinkte, in toevoegvolgorde', () => {
    const sorted = sortPackingItems([
      { id: 'x', isDone: true, orderIndex: 0 },
      { id: 'y', isDone: false, orderIndex: 2 },
      { id: 'z', isDone: false, orderIndex: 1 },
    ])
    expect(sorted.map((i) => i.id)).toEqual(['z', 'y', 'x'])
  })
})

describe('deadlineState', () => {
  it.each([
    [null, false, 'none'],
    ['2026-06-09T00:00:00Z', false, 'overdue'],
    ['2026-06-10T00:00:00Z', false, 'today'],
    ['2026-06-11T00:00:00Z', false, 'tomorrow'],
    ['2026-06-14T00:00:00Z', false, 'later'],
    ['2026-06-01T00:00:00Z', true, 'done'],
  ])('%s (klaar: %s) → %s', (dueDate, isDone, expected) => {
    expect(deadlineState({ dueDate, isDone }, NOW)).toBe(expected)
  })
})

/** Vergelijkt de sleutelstructuur van twee objecten (diep). */
function keyPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort()
}

describe('checklist-vertalingen', () => {
  it('nl en en hebben dezelfde sleutels', () => {
    expect(keyPaths(en)).toEqual(keyPaths(nl))
  })
})
