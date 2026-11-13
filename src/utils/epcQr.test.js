import { describe, expect, it } from 'vitest'
import { buildEpcPayload, epcRemittance, isEpcAmount } from './epcQr'

describe('buildEpcPayload', () => {
  it('volgt EPC069-12 v002 regel voor regel', () => {
    const payload = buildEpcPayload({ name: 'Emma Reist', iban: 'nl91 abna 0417 1643 00', amount: 42.5, remittance: 'ExploreMe – Lissabon' })
    expect(payload.split('\n')).toEqual([
      'BCD', '002', '1', 'SCT', '', 'Emma Reist', 'NL91ABNA0417164300', 'EUR42.50', '', '', 'ExploreMe – Lissabon',
    ])
  })

  it('kapt naam en omschrijving af en blijft binnen 331 bytes', () => {
    const payload = buildEpcPayload({ name: 'n'.repeat(100), iban: 'MT84MALT011000012345MTLCAST001S', amount: '999999999.99', remittance: 'r'.repeat(200) })
    const lines = payload.split('\n')
    expect(lines[5]).toHaveLength(70)
    expect(lines[7]).toBe('EUR999999999.99')
    expect(lines[10]).toHaveLength(140)
    expect(new TextEncoder().encode(payload).length).toBeLessThanOrEqual(331)
  })

  it('rondt het bedrag af op 2 decimalen', () => {
    expect(buildEpcPayload({ name: 'A', iban: 'NL91ABNA0417164300', amount: 10.005 }).split('\n')[7]).toMatch(/^EUR10\.0[01]$/)
    expect(buildEpcPayload({ name: 'A', iban: 'NL91ABNA0417164300', amount: 3 }).split('\n')[10]).toBe('')
  })
})

describe('epcRemittance', () => {
  it('begint met ExploreMe en blijft binnen 140 tekens', () => {
    expect(epcRemittance('Roadtrip Noorwegen')).toBe('ExploreMe – Roadtrip Noorwegen')
    expect(epcRemittance('x'.repeat(300))).toHaveLength(140)
  })
})

describe('isEpcAmount', () => {
  it('kent de grenzen', () => {
    expect(isEpcAmount(0.01)).toBe(true)
    expect(isEpcAmount(999999999.99)).toBe(true)
    expect(isEpcAmount(0)).toBe(false)
    expect(isEpcAmount(1e10)).toBe(false)
    expect(isEpcAmount('abc')).toBe(false)
  })
})
