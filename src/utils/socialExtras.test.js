import { describe, expect, it } from 'vitest'
import {
  challengeProgressPercent,
  dismissMemory,
  firstUnseenIndex,
  isMemoryDismissed,
  memoryHeadline,
  memoryPhotos,
  monthRange,
  sortChallenges,
  stepStory,
  upcomingMonths,
} from './socialExtras'
import { isSystemNotification, notificationLink, notificationText } from './notifications'

describe('reisgenoten', () => {
  it('zet een maand om naar een periode', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(monthRange('2026-13')).toBeNull()
    expect(monthRange('')).toBeNull()
  })

  it('geeft de komende maanden', () => {
    expect(upcomingMonths(3, new Date(2026, 10, 15))).toEqual(['2026-11', '2026-12', '2027-01'])
  })
})

describe('stories', () => {
  const groups = [
    { stories: [{ seen: true }, { seen: false }] },
    { stories: [{ seen: true }, { seen: true }, { seen: false }] },
  ]

  it('begint bij de eerste ongeziene story', () => {
    expect(firstUnseenIndex(groups[0].stories)).toBe(1)
    expect(firstUnseenIndex([{ seen: true }])).toBe(0)
  })

  it('stapt over groepen heen en stopt aan de randen', () => {
    expect(stepStory(groups, 0, 0, 1)).toEqual({ group: 0, story: 1 })
    expect(stepStory(groups, 0, 1, 1)).toEqual({ group: 1, story: 2 })
    expect(stepStory(groups, 1, 0, -1)).toEqual({ group: 0, story: 1 })
    expect(stepStory(groups, 1, 2, 1)).toBeNull()
    expect(stepStory(groups, 0, 0, -1)).toBeNull()
  })
})

describe('challenges', () => {
  it('berekent het percentage', () => {
    expect(challengeProgressPercent({ progress: 2, target: 5 })).toBe(40)
    expect(challengeProgressPercent({ progress: 12, target: 10 })).toBe(100)
    expect(challengeProgressPercent({ progress: 1, target: 5, completed: true })).toBe(100)
  })

  it('zet lopende challenges eerst', () => {
    const sorted = sortChallenges([
      { key: 'oud', isActive: false, completed: false },
      { key: 'klaar', isActive: true, completed: true },
      { key: 'bezig', isActive: true, completed: false, joined: true },
    ])
    expect(sorted.map((c) => c.key)).toEqual(['bezig', 'klaar', 'oud'])
  })
})

describe('meldingen van de sociale extra\'s', () => {
  it('linken naar de juiste pagina en tonen geen actor bij systeemmeldingen', () => {
    expect(notificationLink({ type: 'buddy_response' })).toBe('/buddies?tab=mine')
    expect(notificationLink({ type: 'buddy_match' })).toBe('/buddies?matches=1')
    expect(notificationLink({ type: 'place_question', tripId: 't1' })).toBe('/places/qa/t1')
    expect(notificationLink({ type: 'challenge_completed' })).toBe('/challenges')
    expect(isSystemNotification({ type: 'memory' })).toBe(true)
    expect(isSystemNotification({ type: 'place_answer' })).toBe(false)
    expect(notificationText({ type: 'place_answer' })).toBe('beantwoordde je vraag over een plek')
  })
})

describe('herinneringen', () => {
  it('onthoudt het wegklikken per dag en overleeft een kapotte storage', () => {
    const store = {}
    const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }
    const day = new Date(2026, 9, 13, 9)
    expect(isMemoryDismissed(storage, day)).toBe(false)
    dismissMemory(storage, day)
    expect(isMemoryDismissed(storage, day)).toBe(true)
    expect(isMemoryDismissed(storage, new Date(2026, 9, 14, 9))).toBe(false)

    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(isMemoryDismissed(broken, day)).toBe(false)
    expect(() => dismissMemory(broken, day)).not.toThrow()
  })

  it('kiest de hoofdzin en verzamelt foto\'s', () => {
    const years = [
      { yearsAgo: 1, trips: [], posts: [{ postId: 'p1', imageUrl: '/uploads/a.jpg' }] },
      { yearsAgo: 2, trips: [{ tripId: 't1', placeName: 'Reykjavík', photoUrls: ['/uploads/b.jpg', '/uploads/a.jpg'] }], posts: [] },
    ]
    expect(memoryHeadline(years)).toEqual({ yearsAgo: 2, place: 'Reykjavík', tripId: 't1' })
    expect(memoryHeadline([{ yearsAgo: 3, trips: [], posts: [{ postId: 'p9' }] }])).toEqual({ yearsAgo: 3, place: null, postId: 'p9' })
    expect(memoryHeadline([])).toBeNull()
    expect(memoryPhotos(years)).toEqual(['/uploads/a.jpg', '/uploads/b.jpg'])
  })
})
