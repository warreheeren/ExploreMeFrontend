import { describe, expect, it } from 'vitest'
import { changeKind, dayNumberFor, missingFor, toEditable, toExpensePayload, toStopPayload } from './bookingImport'
import { itemsToText } from './pdfText'

const trip = { startDate: '2026-09-01T00:00:00Z', endDate: '2026-09-09T00:00:00Z', baseCurrency: 'EUR' }

const stayDraft = {
  kind: 'accommodation', stopType: 'Accommodation', name: 'Vila Bled', address: 'Cesta svobode 26, Bled',
  latitude: 46.36, longitude: 14.11, placeId: 'node/1', startDate: '2026-09-03T00:00:00Z', startTime: '15:00',
  endDate: '2026-09-06T00:00:00Z', endTime: '11:00', price: 450, currency: 'EUR', description: 'Reservering: ABC123',
}

const flightDraft = {
  kind: 'flight', name: 'Vlucht JP123', address: 'Ljubljana Airport', latitude: 46.22, longitude: 14.46,
  startDate: '2026-08-31T00:00:00Z', startTime: '22:10', endDate: '2026-09-02T00:00:00Z', endTime: '01:25',
  price: 189, currency: 'USD', description: null,
}

describe('bookingImport', () => {
  it('maakt een bewerkbaar item met verstandige standaarden', () => {
    const item = toEditable(stayDraft, 0)
    expect(item).toMatchObject({ include: true, startDate: '2026-09-03', endDate: '2026-09-06', createExpense: true, attachPdf: true })
    expect(toEditable({ kind: 'weird', name: 'x' }, 1)).toMatchObject({ kind: 'other', createExpense: false, attachPdf: false, price: '' })
  })

  it('zet een overnachting om naar check-in/out en prijs per nacht', () => {
    const stop = toStopPayload(toEditable(stayDraft), trip)
    expect(stop).toMatchObject({
      type: 'Accommodation', checkInDate: '2026-09-03T00:00:00.000Z', checkOutDate: '2026-09-06T00:00:00.000Z',
      pricePerNight: 150, dayNumber: null, startTime: null, orderIndex: -1, placeId: 'node/1',
    })
  })

  it('zet vervoer om naar een stop op de aankomstdag, zonder bedrag in een andere munt', () => {
    const stop = toStopPayload(toEditable(flightDraft), trip)
    expect(stop).toMatchObject({ type: 'Waypoint', arrivalMode: 'Plane', dayNumber: 2, startTime: '01:25', cost: null })
  })

  it('neemt het vluchtnummer en de vertrekdatum mee, alleen bij een geldige vlucht', () => {
    const flight = toEditable({ ...flightDraft, flightNumber: 'JP123' })
    expect(toStopPayload(flight, trip)).toMatchObject({ flightNumber: 'JP123', flightDate: '2026-08-31T00:00:00.000Z' })
    expect(toStopPayload({ ...flight, flightNumber: 'jp 0123' }, trip)).toMatchObject({ flightNumber: 'JP123' })
    expect(toStopPayload({ ...flight, flightNumber: 'nonsense!' }, trip)).toMatchObject({ flightNumber: null, flightDate: null })
    expect(toStopPayload(changeKind(flight, 'train'), trip)).toMatchObject({ flightNumber: null, flightDate: null })
    expect(toStopPayload(toEditable(stayDraft), trip)).toMatchObject({ flightNumber: null })
  })

  it('geeft geen reisdag buiten de reis', () => {
    expect(dayNumberFor({ ...toEditable(flightDraft), kind: 'activity', startDate: '2026-10-01' }, trip)).toBeNull()
    expect(dayNumberFor({ ...toEditable(flightDraft), kind: 'activity', startDate: '2026-09-09' }, trip)).toBe(9)
  })

  it('maakt een uitgave in de munt van de boeking', () => {
    expect(toExpensePayload(toEditable(flightDraft))).toMatchObject({ title: 'Vlucht JP123', amount: 189, category: 'Transport', currency: 'USD', date: '2026-08-31T00:00:00.000Z' })
    expect(toExpensePayload({ ...toEditable(flightDraft), price: '' })).toBeNull()
  })

  it('meldt wat er nog ontbreekt', () => {
    expect(missingFor(toEditable(stayDraft))).toBeNull()
    expect(missingFor({ ...toEditable(stayDraft), latitude: null })).toBe('location')
    expect(missingFor({ ...toEditable(stayDraft), name: ' ' })).toBe('name')
    const car = changeKind(toEditable({ ...stayDraft, latitude: null }), 'car_rental')
    expect(missingFor(car)).toBeNull()
    expect(missingFor({ ...car, createExpense: false })).toBe('nothing')
    expect(missingFor({ ...car, include: false, createExpense: false })).toBeNull()
  })
})

describe('itemsToText', () => {
  it('voegt pdf.js-items samen tot regels', () => {
    const items = [{ str: 'Booking', hasEOL: false }, { str: 'confirmation', hasEOL: true }, { str: '  Hotel   Bled ', hasEOL: true }, { str: '', hasEOL: true }, {}]
    expect(itemsToText(items)).toBe('Booking confirmation\nHotel Bled')
  })
})
