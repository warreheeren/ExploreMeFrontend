import { describe, expect, it } from 'vitest'
import { isSafeHttpUrl, linkHost, normalizeUrl } from './polls'
import nl from '@/i18n/locales/nl/planning'
import en from '@/i18n/locales/en/planning'

describe('isSafeHttpUrl', () => {
  it('laat alleen http- en https-links door', () => {
    expect(isSafeHttpUrl('https://www.booking.com/hotel/x')).toBe(true)
    expect(isSafeHttpUrl('http://example.org')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false)
    expect(isSafeHttpUrl('www.example.org')).toBe(false)
    expect(isSafeHttpUrl('https://')).toBe(false)
    expect(isSafeHttpUrl(null)).toBe(false)
  })
})

describe('normalizeUrl', () => {
  it('vult https:// aan voor een kale domeinnaam', () => {
    expect(normalizeUrl('  booking.com/hotel/x ')).toBe('https://booking.com/hotel/x')
    expect(normalizeUrl('http://example.org')).toBe('http://example.org')
    expect(normalizeUrl('')).toBe('')
  })

  it('laat andere schema’s staan zodat de validatie ze afkeurt', () => {
    expect(isSafeHttpUrl(normalizeUrl('javascript:alert(1)'))).toBe(false)
    expect(isSafeHttpUrl(normalizeUrl('geen link'))).toBe(false)
  })
})

describe('linkHost', () => {
  it('geeft de hostnaam zonder www', () => {
    expect(linkHost('https://www.booking.com/hotel/x?a=1')).toBe('booking.com')
    expect(linkHost('javascript:alert(1)')).toBe('')
  })
})

describe('stemming-vertalingen', () => {
  it('nl en en hebben dezelfde sleutels voor stemmingen', () => {
    expect(Object.keys(en.polls).sort()).toEqual(Object.keys(nl.polls).sort())
  })
})
