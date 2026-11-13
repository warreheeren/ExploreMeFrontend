import { describe, expect, it } from 'vitest'
import { eventToStopPayload, getYourGuideUrl, holidaysByDay, tourPlaceFor, viatorUrl } from './tourLinks'

const params = (url) => Object.fromEntries(new URL(url).searchParams)

describe('getYourGuideUrl', () => {
  it('zoekt op plaats en datum', () => {
    const url = getYourGuideUrl({ place: 'Bled', date: '2026-11-09T00:00:00Z' })
    expect(url).toBe('https://www.getyourguide.com/s/?q=Bled&date_from=2026-11-09')
  })

  it('codeert de plaats en voegt de partner-id toe als die er is', () => {
    const url = getYourGuideUrl({ place: 'São Paulo & co', date: '2026-11-09', partnerId: 'ABC 123' })
    expect(url.startsWith('https://www.getyourguide.com/s/?')).toBe(true)
    expect(params(url)).toEqual({ q: 'São Paulo & co', date_from: '2026-11-09', partner_id: 'ABC 123' })
  })

  it('laat datum en partner-id weg als ze leeg of ongeldig zijn', () => {
    expect(getYourGuideUrl({ place: 'Bled' })).toBe('https://www.getyourguide.com/s/?q=Bled')
    expect(getYourGuideUrl({ place: 'Bled', date: 'geen datum', partnerId: '  ' })).toBe('https://www.getyourguide.com/s/?q=Bled')
  })
})

describe('viatorUrl', () => {
  it('zoekt op plaats, met pid als die er is', () => {
    expect(viatorUrl({ place: 'Bled' })).toBe('https://www.viator.com/searchResults/all?text=Bled')
    expect(params(viatorUrl({ place: 'Lake Bled', partnerId: 'P00012' }))).toEqual({ text: 'Lake Bled', pid: 'P00012' })
  })
})

describe('tourPlaceFor', () => {
  it('neemt bij hotels en restaurants de plaats uit het adres', () => {
    expect(tourPlaceFor({ type: 'Accommodation', name: 'Hotel Triglav', address: 'Kolodvorska cesta 33, 4260 Bled, Slovenië' })).toBe('Bled')
    expect(tourPlaceFor({ type: 'FoodSpot', name: 'Gostilna', address: 'Ljubljana, Slovenië' })).toBe('Ljubljana')
  })

  it('valt terug op de naam van de stop', () => {
    expect(tourPlaceFor({ type: 'Accommodation', name: 'Hotel Triglav', address: '' })).toBe('Hotel Triglav')
    expect(tourPlaceFor({ type: 'Waypoint', name: 'Piran', address: 'Tartinijev trg, 6330 Piran, Slovenië' })).toBe('Piran')
    expect(tourPlaceFor(null)).toBe('')
  })
})

describe('eventToStopPayload', () => {
  const trip = { baseCurrency: 'EUR' }
  const stop = { latitude: 46.36, longitude: 14.11 }
  const event = {
    name: 'Jazz Night',
    url: 'https://www.ticketmaster.si/event/1',
    venueName: 'Cvetličarna',
    latitude: 46.06,
    longitude: 14.51,
    minPrice: 25.5,
    currency: 'EUR',
    localTime: '20:30:00',
    dayNumber: 4,
  }

  it('maakt een Activity-stop op de reisdag met tijd, kosten en de link in de beschrijving', () => {
    expect(eventToStopPayload(event, { trip, stop })).toMatchObject({
      type: 'Activity',
      name: 'Jazz Night',
      description: 'https://www.ticketmaster.si/event/1',
      address: 'Cvetličarna',
      latitude: 46.06,
      longitude: 14.51,
      dayNumber: 4,
      startTime: '20:30',
      cost: 25.5,
      orderIndex: -1,
    })
  })

  it('zet geen kosten in een andere munt en gebruikt de stop als het event geen locatie heeft', () => {
    const payload = eventToStopPayload({ ...event, currency: 'USD', latitude: null, longitude: null, localTime: null, venueName: null }, { trip, stop })
    expect(payload.cost).toBeNull()
    expect(payload.latitude).toBe(46.36)
    expect(payload.longitude).toBe(14.11)
    expect(payload.startTime).toBeNull()
    expect(payload.address).toBeNull()
  })
})

describe('holidaysByDay', () => {
  it('groepeert feestdagen per kalenderdag', () => {
    const map = holidaysByDay([
      { date: '2026-12-25T00:00:00Z', countryCode: 'NL', name: 'Eerste Kerstdag' },
      { date: '2026-12-25T00:00:00Z', countryCode: 'BE', name: 'Kerstmis' },
      { date: '2027-01-01T00:00:00Z', countryCode: 'NL', name: 'Nieuwjaarsdag' },
    ])
    expect(Object.keys(map)).toEqual(['2026-12-25', '2027-01-01'])
    expect(map['2026-12-25'].map((h) => h.countryCode)).toEqual(['NL', 'BE'])
    expect(holidaysByDay(null)).toEqual({})
  })
})
