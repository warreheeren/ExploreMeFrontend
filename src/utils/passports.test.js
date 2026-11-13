import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PASSPORT_COUNTRY_CODES, passportOptions, regionName, visaTone } from './passports'

describe('passports', () => {
  it('volgt de landen die de backend accepteert (CountryFacts.json)', () => {
    const file = resolve(__dirname, '../../../ExploreMe/ExploreMe.Applications/Common/CountryFacts.json')
    let codes
    try {
      codes = Object.keys(JSON.parse(readFileSync(file, 'utf8'))).map((c) => c.toUpperCase()).sort()
    } catch {
      return // Frontend los uitgecheckt (eigen CI-repo): niets om mee te vergelijken.
    }
    expect([...PASSPORT_COUNTRY_CODES].sort()).toEqual(codes)
  })

  it('kleurt inreisregels groen, geel of rood via de reisadviesniveaus', () => {
    expect(visaTone('visa_free')).toBe('normal')
    expect(visaTone('own_country')).toBe('normal')
    expect(visaTone('eta')).toBe('caution')
    expect(visaTone('e_visa')).toBe('caution')
    expect(visaTone('visa_required')).toBe('avoidAll')
    expect(visaTone('no_admission')).toBe('avoidAll')
    expect(visaTone('something_new')).toBeNull()
  })

  it('geeft gelokaliseerde namen en sorteert op naam', () => {
    expect(regionName('nl', 'nl-NL')).toBe('Nederland')
    expect(regionName('NL', 'en-GB')).toBe('Netherlands')
    expect(regionName('', 'en')).toBe('')

    const names = passportOptions('en-GB').map((o) => o.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en-GB')))
    expect(passportOptions('en-GB')).toHaveLength(PASSPORT_COUNTRY_CODES.length)
  })
})
