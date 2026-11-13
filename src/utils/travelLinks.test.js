import { describe, expect, it } from 'vitest'
import { PARTNER_LINK_ATTRS, airaloUrl, carRentalRuns, discoverCarsUrl, slugify } from './travelLinks'

const params = (url) => Object.fromEntries(new URL(url).searchParams)

describe('slugify', () => {
  it('maakt kebab-case zonder accenten en apostroffen', () => {
    expect(slugify('United States')).toBe('united-states')
    expect(slugify("Côte d'Ivoire")).toBe('cote-divoire')
    expect(slugify('Bosnia & Herzegovina')).toBe('bosnia-herzegovina')
    expect(slugify('  ')).toBe('')
  })
})

describe('airaloUrl', () => {
  it('linkt naar de landpagina zonder partner-id', () => {
    expect(airaloUrl('United States')).toBe('https://www.airalo.com/united-states-esim')
    expect(airaloUrl('Thailand', '  ')).toBe('https://www.airalo.com/thailand-esim')
  })

  it('zet de partner-id in de geconfigureerde parameter (standaard ref)', () => {
    expect(airaloUrl('Japan', 'abc')).toBe('https://www.airalo.com/japan-esim?ref=abc')
    expect(airaloUrl('Japan', 'a b', 'aff')).toBe('https://www.airalo.com/japan-esim?aff=a%20b')
  })

  it('geeft null zonder landnaam', () => {
    expect(airaloUrl('')).toBeNull()
    expect(airaloUrl(null, 'abc')).toBeNull()
  })
})

describe('discoverCarsUrl', () => {
  it('vult plaats en kalenderdatums in', () => {
    const url = discoverCarsUrl({ place: 'Málaga Airport', pickup: '2026-11-09T00:00:00Z', dropoff: '2026-11-12' })
    expect(url.startsWith('https://www.discovercars.com/?')).toBe(true)
    expect(params(url)).toEqual({ location: 'Málaga Airport', pick_date: '2026-11-09', drop_date: '2026-11-12' })
  })

  it('zet de affiliate-id alleen mee als die er is', () => {
    expect(params(discoverCarsUrl({ place: 'Bled', affiliateId: ' 42 ' }))).toEqual({ a_aid: '42', location: 'Bled' })
    expect(discoverCarsUrl({ place: 'Bled' })).not.toContain('a_aid')
  })

  it('laat een inleverdatum vóór de ophaaldatum weg', () => {
    expect(params(discoverCarsUrl({ place: 'Bled', pickup: '2026-11-12', dropoff: '2026-11-09' }))).toEqual({ location: 'Bled', pick_date: '2026-11-12' })
  })

  it('geeft null zonder plaats', () => {
    expect(discoverCarsUrl({ place: ' ' })).toBeNull()
    expect(discoverCarsUrl()).toBeNull()
  })
})

describe('carRentalRuns', () => {
  it('groepeert opeenvolgende autolegs tot één reeks', () => {
    const legs = [
      { fromIndex: 0, toIndex: 1, mode: 'Plane' },
      { fromIndex: 1, toIndex: 2, mode: 'Car' },
      { fromIndex: 2, toIndex: 3 },
      { fromIndex: 3, toIndex: 4, mode: 'Train' },
      { fromIndex: 4, toIndex: 5, mode: 'Car' },
    ]
    expect(carRentalRuns(legs)).toEqual({ 1: 3, 4: 5 })
  })

  it('geeft niets zonder autolegs', () => {
    expect(carRentalRuns([{ fromIndex: 0, toIndex: 1, mode: 'Walk' }])).toEqual({})
    expect(carRentalRuns()).toEqual({})
  })
})

describe('PARTNER_LINK_ATTRS', () => {
  it('markeert partnerlinks als gesponsord en opent ze in een nieuw tabblad', () => {
    expect(PARTNER_LINK_ATTRS).toEqual({ target: '_blank', rel: 'sponsored noopener noreferrer' })
  })
})
