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

  it('behoudt de handtekening van een ondertekende upload', () => {
    expect(thumbUrl('/uploads/abc.jpg?exp=1800000000&sig=AbC-_123')).toBe('/uploads/thumb/abc.jpg?exp=1800000000&sig=AbC-_123')
    expect(thumbUrl('https://api.example.com/uploads/abc.jpg?exp=1&sig=x')).toBe('https://api.example.com/uploads/thumb/abc.jpg?exp=1&sig=x')
    // audio en video hebben geen thumbnail
    expect(thumbUrl('/uploads/video/abc.mp4?exp=1&sig=x')).toBe('/uploads/video/abc.mp4?exp=1&sig=x')
  })
})
