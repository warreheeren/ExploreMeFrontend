import { describe, expect, it } from 'vitest'
import { googleTransitUrl, isInNetherlands, nsUrl, slugify, trainlineUrl, transitLinks } from './transitLinks'

const amsterdam = { name: 'Amsterdam Centraal', address: 'Stationsplein 1, 1012 AB Amsterdam, Nederland', latitude: 52.3791234567, longitude: 4.9003 }
const utrecht = { name: 'Utrecht Centraal', address: 'Stationshal 12, 3511 CE Utrecht, Nederland', latitude: 52.0894, longitude: 5.1101 }
const antwerp = { name: 'Antwerpen-Centraal', address: 'Koningin Astridplein 27, 2018 Antwerpen, België', latitude: 51.2172, longitude: 4.4211 }
const bled = { name: 'Hotel Bled', address: 'Cesta svobode 1, 4260 Bled, Slovenia', latitude: 46.37, longitude: 14.11 }

describe('slugify', () => {
  it('maakt kebab-case zonder accenten', () => {
    expect(slugify('Den Haag Centraal')).toBe('den-haag-centraal')
    expect(slugify('  Zürich  HB ')).toBe('zurich-hb')
    expect(slugify('Saint-Étienne')).toBe('saint-etienne')
    expect(slugify('')).toBe('')
  })
})

describe('googleTransitUrl', () => {
  it('plant met OV tussen de coördinaten', () => {
    expect(googleTransitUrl(amsterdam, utrecht)).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=52.37912%2C4.9003&destination=52.0894%2C5.1101&travelmode=transit',
    )
  })

  it('geeft null zonder coördinaten', () => {
    expect(googleTransitUrl({ name: 'X' }, utrecht)).toBeNull()
  })
})

describe('trainlineUrl', () => {
  it('gebruikt de plaats uit het adres', () => {
    expect(trainlineUrl(amsterdam, bled)).toBe('https://www.thetrainline.com/en/train-times/amsterdam-to-bled')
  })

  it('valt terug op de naam en laat gelijke plaatsen weg', () => {
    expect(trainlineUrl({ name: 'Brugge' }, { name: 'Gent' })).toBe('https://www.thetrainline.com/en/train-times/brugge-to-gent')
    expect(trainlineUrl(amsterdam, { ...amsterdam, name: 'Rijksmuseum' })).toBeNull()
    expect(trainlineUrl({ name: '' }, utrecht)).toBeNull()
  })
})

describe('isInNetherlands / nsUrl', () => {
  it('herkent het land in het adres', () => {
    expect(isInNetherlands(amsterdam)).toBe(true)
    expect(isInNetherlands({ ...amsterdam, address: 'Damrak 1, Amsterdam, Netherlands' })).toBe(true)
    expect(isInNetherlands(antwerp)).toBe(false)
  })

  it('valt zonder land terug op de coördinaten (zonder Vlaanderen)', () => {
    expect(isInNetherlands({ name: 'Zwolle', latitude: 52.51, longitude: 6.09 })).toBe(true)
    expect(isInNetherlands({ name: 'Antwerpen', latitude: 51.2172, longitude: 4.4211 })).toBe(false)
    expect(isInNetherlands({ name: 'Leeg' })).toBe(false)
  })

  it('geeft alleen een NS-link als beide stops in Nederland liggen', () => {
    expect(nsUrl(amsterdam, utrecht)).toBe('https://www.ns.nl/reisplanner/#/?vertrek=Amsterdam&aankomst=Utrecht')
    expect(nsUrl(amsterdam, antwerp)).toBeNull()
  })
})

describe('transitLinks', () => {
  it('geeft de beschikbare links in vaste volgorde', () => {
    expect(transitLinks(amsterdam, utrecht).map((l) => l.key)).toEqual(['google', 'trainline', 'ns'])
    expect(transitLinks(amsterdam, bled).map((l) => l.key)).toEqual(['google', 'trainline'])
  })
})
