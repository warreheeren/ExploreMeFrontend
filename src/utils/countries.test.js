import { describe, expect, it } from 'vitest'
import { countryNames, dutchNameFor, englishNameFor, nextCountryStatus } from './countries'

describe('landen', () => {
  it('vertaalt Engelse kaartnamen terug naar het Nederlands', () => {
    expect(dutchNameFor('Belgium')).toBe('België')
    expect(dutchNameFor('United States of America')).toBe('Verenigde Staten')
    expect(dutchNameFor('United Kingdom')).toBe('Verenigd Koninkrijk')
    // Onbekend land: Engelse naam blijft staan.
    expect(dutchNameFor('Bhutan')).toBe('Bhutan')
    expect(englishNameFor(dutchNameFor('Japan'))).toBe('Japan')
  })

  it('wisselt markeringen in een vaste volgorde', () => {
    expect(nextCountryStatus(null)).toBe('visited')
    expect(nextCountryStatus('visited')).toBe('wishlist')
    expect(nextCountryStatus('wishlist')).toBe(null)
  })

  it('geeft een keuzelijst zonder dubbele Britse landen', () => {
    const names = countryNames()
    expect(names).toContain('Slovenië')
    expect(names).not.toContain('Wales')
  })
})
