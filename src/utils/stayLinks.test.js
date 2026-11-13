import { describe, expect, it } from 'vitest'
import { bookingUrl, clampAdults, googleHotelsUrl, placeFromAddress } from './stayLinks'

const stop = {
  name: 'Hotel Triglav',
  address: 'Kolodvorska cesta 33, 4260 Bled, Slovenië',
  checkInDate: '2026-11-09T00:00:00Z',
  checkOutDate: '2026-11-12T00:00:00Z',
}

const params = (url) => Object.fromEntries(new URL(url).searchParams)

describe('placeFromAddress', () => {
  it('neemt de plaats uit het adresformaat van de plaatszoeker', () => {
    expect(placeFromAddress('Kolodvorska cesta 33, 4260 Bled, Slovenië')).toBe('Bled')
    expect(placeFromAddress('4260 Bled, Slovenië')).toBe('Bled')
  })

  it('werkt met vrije invoer zonder postcode', () => {
    expect(placeFromAddress('Bled, Slovenië')).toBe('Bled')
    expect(placeFromAddress('Straat 1, Gent')).toBe('Gent')
    expect(placeFromAddress('Rue de Rivoli, Paris, France')).toBe('Paris')
    expect(placeFromAddress('Ljubljana')).toBe('Ljubljana')
  })

  it('geeft niets terug zonder bruikbaar adres of als de plaats de naam is', () => {
    expect(placeFromAddress('')).toBe('')
    expect(placeFromAddress(null)).toBe('')
    expect(placeFromAddress(' , 1234 ')).toBe('')
    expect(placeFromAddress('Bled', 'bled')).toBe('')
  })
})

describe('clampAdults', () => {
  it('begrenst op 1–8 en valt terug op 2', () => {
    expect(clampAdults(3)).toBe(3)
    expect(clampAdults('4')).toBe(4)
    expect(clampAdults(0)).toBe(1)
    expect(clampAdults(12)).toBe(8)
    expect(clampAdults(undefined)).toBe(2)
    expect(clampAdults(null)).toBe(2)
  })
})

describe('bookingUrl', () => {
  it('vult naam + plaats, datums en volwassenen in', () => {
    const url = bookingUrl(stop, { adults: 3 })
    expect(url.startsWith('https://www.booking.com/searchresults.html?')).toBe(true)
    expect(params(url)).toEqual({
      ss: 'Hotel Triglav, Bled',
      checkin: '2026-11-09',
      checkout: '2026-11-12',
      group_adults: '3',
      no_rooms: '1',
      group_children: '0',
    })
  })

  it('codeert alle waarden met encodeURIComponent', () => {
    const url = bookingUrl({ ...stop, name: 'B&B "Zon" #1' }, { adults: 2 })
    expect(url).toContain('ss=B%26B%20%22Zon%22%20%231%2C%20Bled')
    expect(params(url).ss).toBe('B&B "Zon" #1, Bled')
  })

  it('voegt aid toe als er een affiliate-id is', () => {
    expect(params(bookingUrl(stop, { affiliateId: ' 12345 ' })).aid).toBe('12345')
    expect(params(bookingUrl(stop, { affiliateId: null }))).not.toHaveProperty('aid')
  })

  it('gebruikt een opgegeven plaats en laat ontbrekende datums weg', () => {
    const url = bookingUrl({ name: 'Camping Zlatorog' }, { city: 'Bohinj' })
    const p = params(url)
    expect(p.ss).toBe('Camping Zlatorog, Bohinj')
    expect(p).not.toHaveProperty('checkin')
    expect(p).not.toHaveProperty('checkout')
    expect(p.group_adults).toBe('2')
  })

  it('zoekt alleen op naam zonder adres', () => {
    expect(params(bookingUrl({ name: 'Hotel Park', checkInDate: '2026-11-09' })).ss).toBe('Hotel Park')
  })

  it('verschuift kalenderdatums niet door tijdzones', () => {
    const p = params(bookingUrl({ ...stop, checkInDate: '2026-03-29T00:00:00.000Z', checkOutDate: '2026-03-30' }))
    expect(p.checkin).toBe('2026-03-29')
    expect(p.checkout).toBe('2026-03-30')
  })
})

describe('googleHotelsUrl', () => {
  it('bouwt een zoekopdracht met datums en volwassenen', () => {
    const url = googleHotelsUrl(stop, { adults: 9 })
    expect(url.startsWith('https://www.google.com/travel/hotels?')).toBe(true)
    expect(url).toContain('q=Hotel%20Triglav%20Bled')
    expect(params(url)).toEqual({ q: 'Hotel Triglav Bled', checkin: '2026-11-09', checkout: '2026-11-12', adults: '8' })
  })

  it('laat datums weg wanneer ze ontbreken', () => {
    const p = params(googleHotelsUrl({ name: 'Hotel Park' }))
    expect(p).toEqual({ q: 'Hotel Park', adults: '2' })
  })
})
