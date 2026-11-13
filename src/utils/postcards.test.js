import { describe, expect, it } from 'vitest'
import { isValidEmail, photoChoicesFor, recipientName } from './postcards'

describe('postcards utils', () => {
  it('validates email addresses like the API', () => {
    expect(isValidEmail('oma@example.com')).toBe(true)
    expect(isValidEmail('  oma@example.com ')).toBe(true)
    expect(isValidEmail('oma@example')).toBe(false)
    expect(isValidEmail('geen adres@example.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('lists uploads, album, stop photos and cover once each', () => {
    const trip = {
      title: 'Slovenië',
      coverImageUrl: '/uploads/cover.jpg',
      stops: [
        { id: 's1', name: 'Bled', imageUrl: '/uploads/bled.jpg' },
        { id: 's2', name: 'Piran', imageUrl: null },
      ],
    }
    const album = [
      { imageUrl: '/uploads/a.jpg', caption: 'Meer', tripStopId: 's1' },
      { imageUrl: '/uploads/bled.jpg', caption: null, stopName: 'Bled', tripStopId: 's1' },
    ]
    const choices = photoChoicesFor(trip, album, ['/uploads/mine.jpg'])
    expect(choices.map((c) => c.url)).toEqual(['/uploads/mine.jpg', '/uploads/a.jpg', '/uploads/bled.jpg', '/uploads/cover.jpg'])
    expect(choices[1].stopId).toBe('s1')
    expect(photoChoicesFor(null)).toEqual([])
  })

  it('names the recipient by account or email', () => {
    expect(recipientName({ recipientDisplayName: 'Emma', recipientEmail: null })).toBe('Emma')
    expect(recipientName({ recipientDisplayName: null, recipientEmail: 'oma@example.com' })).toBe('oma@example.com')
  })
})
