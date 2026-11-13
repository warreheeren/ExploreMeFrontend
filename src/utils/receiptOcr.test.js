import { describe, expect, it } from 'vitest'
import { findCurrency, findDate, parseAmount, parseReceiptLines, parseReceiptText } from './receiptOcr'

describe('parseAmount', () => {
  it('herkent Europese en Engelse notaties', () => {
    expect(parseAmount('12,50')).toBe(12.5)
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('1,234.56')).toBe(1234.56)
    expect(parseAmount('1 234,56')).toBe(1234.56)
    expect(parseAmount('1,200')).toBe(1200)
    expect(parseAmount('abc')).toBeNull()
  })
})

describe('parseReceiptText', () => {
  it('neemt het totaal en niet het subtotaal', () => {
    const text = `Café De Zon\n12-08-2026 14:32\nKoffie 3,20\nAppeltaart 4,50\nSubtotaal 7,70\nBTW 9% 0,64\nTOTAAL EUR 7,70\nPin 7,70`
    expect(parseReceiptText(text)).toEqual({ amount: 7.7, date: '2026-08-12', currency: 'EUR' })
  })

  it('leest "te betalen" met het bedrag op de volgende regel', () => {
    const text = `Bakkerij\nTe betalen\n€ 12,35\n01/09/26`
    expect(parseReceiptText(text)).toEqual({ amount: 12.35, date: '2026-09-01', currency: 'EUR' })
  })

  it('herkent Engelse tickets met dollars en maand-eerst datums', () => {
    const text = `DINER\n09/23/2026\nBurger $14.00\nSubtotal $14.00\nTax $1.12\nTotal $15.12`
    expect(parseReceiptText(text)).toEqual({ amount: 15.12, date: '2026-09-23', currency: 'USD' })
  })

  it('valt terug op het grootste bedrag en herkent yen en CHF', () => {
    expect(parseReceiptText('Ramen ¥1,200\n¥300').currency).toBe('JPY')
    expect(parseReceiptText('Fondue 32.50\nCHF 45.00').amount).toBe(45)
    expect(findCurrency('Summe 45.00 CHF')).toBe('CHF')
  })

  it('geeft null terug wanneer niets gevonden wordt', () => {
    expect(parseReceiptText('')).toEqual({ amount: null, date: null, currency: null })
    expect(findDate('31-02-2026')).toBeNull()
  })
})

describe('parseReceiptLines', () => {
  it('haalt artikelregels op en slaat totalen, btw en betaling over', () => {
    const text = `Café De Zon\n12-08-2026 14:32\nKoffie 3,20\nAppeltaart 4,50\nSubtotaal 7,70\nBTW 9% 0,64\nTOTAAL EUR 7,70\nPin 7,70`
    expect(parseReceiptLines(text)).toEqual([
      { description: 'Koffie', amount: 3.2 },
      { description: 'Appeltaart', amount: 4.5 },
    ])
  })

  it('herkent Engelse, Franse en Duitse tickets met munt of btw-letter achteraan', () => {
    const text = `Burger $14.00\n2 x Fries 7.00 A\nTax $1.12\nTotal $15.12\nCroque monsieur 9,50 €\nTVA 10% 0,95\nApfelschorle 3,80 B\nMwSt 19% 0,61\nRückgeld 1,20\nVisa 20,00`
    expect(parseReceiptLines(text)).toEqual([
      { description: 'Burger', amount: 14 },
      { description: '2 x Fries', amount: 7 },
      { description: 'Croque monsieur', amount: 9.5 },
      { description: 'Apfelschorle', amount: 3.8 },
    ])
  })

  it('negeert regels zonder omschrijving of zonder bedrag met decimalen', () => {
    expect(parseReceiptLines('12,50\nTafel 4\n14:32\nKorting -2,00\n')).toEqual([])
    expect(parseReceiptLines('')).toEqual([])
  })
})
