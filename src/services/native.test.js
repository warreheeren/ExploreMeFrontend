import { describe, expect, it } from 'vitest'
import { isNative, isNativePlatform, missingNativeApiUrl, nativePlatform, platform, publicWebOrigin, resolveApiRoot } from './native'

const capacitor = (name, native = true) => ({ Capacitor: { isNativePlatform: () => native, getPlatform: () => name } })

describe('native', () => {
  it('is web by default (browser, PWA, tests)', () => {
    expect(isNative).toBe(false)
    expect(platform).toBe('web')
    expect(isNativePlatform()).toBe(false)
    expect(nativePlatform()).toBe('web')
  })

  it('detects the Capacitor bridge', () => {
    expect(isNativePlatform(capacitor('android'))).toBe(true)
    expect(nativePlatform(capacitor('android'))).toBe('android')
    expect(nativePlatform(capacitor('ios'))).toBe('ios')
    // Capacitor in de browser (web-platform) telt niet als native.
    expect(isNativePlatform(capacitor('web', false))).toBe(false)
    expect(nativePlatform(capacitor('web', false))).toBe('web')
    expect(isNativePlatform({ Capacitor: { isNativePlatform: () => { throw new Error('x') } } })).toBe(false)
    expect(isNativePlatform(undefined)).toBe(false)
  })

  describe('resolveApiRoot', () => {
    it('keeps the web behaviour: VITE_API_URL without trailing slash, empty = same origin', () => {
      expect(resolveApiRoot({ VITE_API_URL: 'https://api.example.com/' }, false)).toBe('https://api.example.com')
      expect(resolveApiRoot({}, false)).toBe('')
      // De native URL heeft op het web geen invloed.
      expect(resolveApiRoot({ VITE_API_URL: '', VITE_NATIVE_API_URL: 'https://native.example.com' }, false)).toBe('')
    })

    it('prefers VITE_NATIVE_API_URL in the native app', () => {
      expect(resolveApiRoot({ VITE_API_URL: 'https://localhost:7284/', VITE_NATIVE_API_URL: 'https://api.example.com//' }, true)).toBe('https://api.example.com')
      expect(resolveApiRoot({ VITE_API_URL: 'https://api.example.com' }, true)).toBe('https://api.example.com')
    })

    it('flags a native build without an absolute API URL', () => {
      expect(missingNativeApiUrl({}, true)).toBe(true)
      expect(missingNativeApiUrl({ VITE_API_URL: '/relative' }, true)).toBe(true)
      expect(missingNativeApiUrl({ VITE_API_URL: 'https://api.example.com' }, true)).toBe(false)
      expect(missingNativeApiUrl({}, false)).toBe(false)
    })
  })

  describe('publicWebOrigin', () => {
    const win = { location: { origin: 'https://localhost' } }

    it('is the current origin on the web', () => {
      expect(publicWebOrigin({ VITE_PUBLIC_WEB_URL: 'https://exploreme.app' }, false, win)).toBe('https://localhost')
      expect(publicWebOrigin({}, false)).toBe(window.location.origin)
    })

    it('uses the hosted web app in the native app', () => {
      expect(publicWebOrigin({ VITE_PUBLIC_WEB_URL: 'https://exploreme.app/' }, true, win)).toBe('https://exploreme.app')
      expect(publicWebOrigin({}, true, win)).toBe('https://localhost')
    })
  })
})
