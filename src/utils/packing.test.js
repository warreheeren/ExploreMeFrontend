import { describe, expect, it } from 'vitest'
import { groupByReason, PACKING_KEYS, PACKING_REASONS } from './packing'
import nl from '@/i18n/locales/nl/tripExtras'
import en from '@/i18n/locales/en/tripExtras'

describe('groupByReason', () => {
  it('bundelt suggesties met dezelfde reden en parameters', () => {
    const groups = groupByReason([
      { key: 'sunscreen', reason: 'hot', params: { temp: '29' } },
      { key: 'sun_hat', reason: 'hot', params: { temp: '29' } },
      { key: 'swimwear', reason: 'keywordBeach', params: { place: 'Piran' } },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].items.map((i) => i.key)).toEqual(['sunscreen', 'sun_hat'])
  })
})

describe('vertalingen paklijst', () => {
  it('heeft een nl- en en-label voor elke sleutel en reden', () => {
    for (const key of PACKING_KEYS) {
      expect(nl.packing.items[key], key).toBeTruthy()
      expect(en.packing.items[key], key).toBeTruthy()
    }
    for (const reason of PACKING_REASONS) {
      expect(nl.packing.reasons[reason], reason).toBeTruthy()
      expect(en.packing.reasons[reason], reason).toBeTruthy()
    }
  })
})

/** Vergelijkt de sleutelstructuur van twee objecten (diep). */
function keyPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort()
}

describe('tripExtras-vertalingen', () => {
  it('nl en en hebben dezelfde sleutels', () => {
    expect(keyPaths(en)).toEqual(keyPaths(nl))
  })
})
