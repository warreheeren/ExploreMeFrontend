import { describe, expect, it } from 'vitest'
import { formatIban, isValidIban, normalizeIban } from './iban'

describe('normalizeIban', () => {
  it('haalt spaties en streepjes weg en zet hoofdletters', () => {
    expect(normalizeIban(' nl91 abna-0417 1643 00 ')).toBe('NL91ABNA0417164300')
    expect(normalizeIban(null)).toBe('')
  })
})

describe('isValidIban', () => {
  it.each([
    'NL91ABNA0417164300',
    'nl91 abna 0417 1643 00',
    'BE68 5390 0754 7034',
    'DE89370400440532013000',
    'FR1420041010050500013M02606',
    'GB82WEST12345698765432',
  ])('aanvaardt %s', (iban) => expect(isValidIban(iban)).toBe(true))

  it.each([
    '',
    'NL91ABNA0417164301', // checksum
    'NL91ABNA041716430', // te kort
    'BE68539007547034000', // te lang
    'US12345678901234567890', // geen SEPA-land
    'NLXXABNA0417164300',
    'NL91ABNA04171643!0',
  ])('weigert %s', (iban) => expect(isValidIban(iban)).toBe(false))
})

describe('formatIban', () => {
  it('zet groepjes van 4', () => {
    expect(formatIban('nl91abna0417164300')).toBe('NL91 ABNA 0417 1643 00')
    expect(formatIban('BE68539007547034')).toBe('BE68 5390 0754 7034')
  })
})
