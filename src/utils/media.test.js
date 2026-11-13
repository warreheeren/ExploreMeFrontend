import { describe, expect, it } from 'vitest'
import { resolveMediaUrl, thumbUrl } from './media'

// De API-basis komt uit VITE_API_URL (kan leeg zijn of een origin bevatten).
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

describe('resolveMediaUrl', () => {
  it('laat absolute https-URL\'s ongemoeid en zet uploads achter de API-basis', () => {
    expect(resolveMediaUrl('https://images.example.com/a.jpg')).toBe('https://images.example.com/a.jpg')
    expect(resolveMediaUrl('/uploads/a.jpg')).toBe(`${apiBase}/uploads/a.jpg`)
  })

  it('maakt van een javascript:-URL een onschadelijk pad onder de API-basis', () => {
    const resolved = resolveMediaUrl("javascript:alert('x')")
    expect(resolved.startsWith(`${apiBase}/`)).toBe(true)
    expect(resolved.toLowerCase().startsWith('javascript:')).toBe(false)
  })
})

describe('thumbUrl', () => {
  it('verwijst eigen uploads naar de thumbnail-route', () => {
    expect(thumbUrl('/uploads/abc.jpg')).toBe('/uploads/thumb/abc.jpg')
    expect(thumbUrl('/uploads/thumb/abc.jpg')).toBe('/uploads/thumb/abc.jpg')
  })
})
