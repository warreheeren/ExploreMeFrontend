import { describe, expect, it } from 'vitest'
import { settleBalances, summarizeItemSplit } from './budget'

describe('summarizeItemSplit', () => {
  it('telt de items per persoon op en geeft de rest', () => {
    const s = summarizeItemSplit([
      { amount: 30, userNames: ['lucas'] },
      { amount: 20, userNames: ['emma', 'lucas'] },
      { amount: 10, userNames: ['emma', 'lucas', 'sofie'] },
    ], 64)
    expect(s.perUser).toEqual({ lucas: 43.33, emma: 13.33, sofie: 3.33 })
    expect(s.itemsTotal).toBe(60)
    expect(s.rest).toBe(4)
    expect(s.over).toBe(false)
  })

  it('meldt wanneer de items meer zijn dan het bedrag', () => {
    const s = summarizeItemSplit([{ amount: 12.5, userNames: ['emma'] }], 10)
    expect(s.over).toBe(true)
    expect(s.rest).toBe(0)
  })
})

describe('settleBalances', () => {
  it('stelt minimale overschrijvingen voor', () => {
    const transfers = settleBalances([
      { userName: 'emma', displayName: 'Emma', balance: 60 },
      { userName: 'daan', displayName: 'Daan', balance: -40 },
      { userName: 'sofie', displayName: 'Sofie', balance: -20 },
    ])
    expect(transfers.map((t) => [t.from.userName, t.to.userName, t.amount])).toEqual([
      ['daan', 'emma', 40],
      ['sofie', 'emma', 20],
    ])
  })

  it('geeft niets terug als iedereen quitte staat', () => {
    expect(settleBalances([{ userName: 'a', balance: 0 }, { userName: 'b', balance: 0.001 }])).toEqual([])
  })
})
