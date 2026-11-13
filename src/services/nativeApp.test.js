import { describe, expect, it } from 'vitest'
import { safeInternalLink, shareFromNativeEvent } from './nativeApp'
import { mapNativePermission } from './push'
import { canShare, shareContent } from './share'

describe('nativeApp', () => {
  it('only follows internal links from push notifications', () => {
    expect(safeInternalLink('/trips/1?tab=chat')).toBe('/trips/1?tab=chat')
    expect(safeInternalLink(' /notifications ')).toBe('/notifications')
    expect(safeInternalLink('https://evil.example')).toBeNull()
    expect(safeInternalLink('//evil.example/x')).toBeNull()
    expect(safeInternalLink('/\\evil.example')).toBeNull()
    expect(safeInternalLink('javascript:alert(1)')).toBeNull()
    expect(safeInternalLink(undefined)).toBeNull()
  })

  it('maps a native share event to the share inbox shape', async () => {
    const share = await shareFromNativeEvent({ title: 'Kijk', texts: ['Mooie plek!', ' https://example.com/x ', ''], files: [] })
    expect(share).toEqual({ title: 'Kijk', text: 'Mooie plek!', url: 'https://example.com/x', files: [] })

    expect(await shareFromNativeEvent(null)).toEqual({ title: '', text: '', url: '', files: [] })
  })

  it('maps Capacitor permission states to the Web Notification states', () => {
    expect(mapNativePermission('granted')).toBe('granted')
    expect(mapNativePermission('denied')).toBe('denied')
    expect(mapNativePermission('prompt')).toBe('default')
    expect(mapNativePermission('prompt-with-rationale')).toBe('default')
  })

  it('falls back to the Web Share API in the browser', async () => {
    const original = navigator.share
    try {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true })
      expect(canShare()).toBe(false)
      expect(await shareContent({ url: 'https://example.com' })).toBe('unavailable')

      const calls = []
      navigator.share = async (data) => { calls.push(data) }
      expect(canShare()).toBe(true)
      expect(await shareContent({ title: 'T', url: 'https://example.com' })).toBe('shared')
      expect(calls).toEqual([{ title: 'T', text: '', url: 'https://example.com' }])

      navigator.share = async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) }
      expect(await shareContent({ url: 'https://example.com' })).toBe('cancelled')
    } finally {
      Object.defineProperty(navigator, 'share', { value: original, configurable: true, writable: true })
    }
  })
})
