import { describe, expect, it } from 'vitest'
import { STORY_PHOTO_MS, VIDEO_ACCEPT, formatVideoDuration, storyDurationMs, videoFileProblem } from './video'

const file = (type, mb = 1) => ({ type, size: mb * 1024 * 1024 })

describe('videoFileProblem', () => {
  it('accepts mp4, mov and webm within the limits', () => {
    for (const type of VIDEO_ACCEPT.split(',')) expect(videoFileProblem(file(type), 30)).toBeNull()
  })

  it('lets an unknown MIME type through (the server sniffs the content)', () => {
    expect(videoFileProblem(file(''), 10)).toBeNull()
  })

  it('rejects other types, too large and too long files', () => {
    expect(videoFileProblem(file('image/jpeg'))).toBe('type')
    expect(videoFileProblem(null)).toBe('type')
    expect(videoFileProblem(file('video/mp4', 101))).toBe('size')
    expect(videoFileProblem(file('video/mp4'), 61.5)).toBe('duration')
    // Eén seconde marge, zoals de server.
    expect(videoFileProblem(file('video/mp4'), 60.9)).toBeNull()
  })

  it('leaves an unreadable duration to the server', () => {
    expect(videoFileProblem(file('video/quicktime'), null)).toBeNull()
  })
})

describe('storyDurationMs', () => {
  it('uses 5 s for photos', () => {
    expect(storyDurationMs({ imageUrl: '/uploads/a.jpg' })).toBe(STORY_PHOTO_MS)
    expect(storyDurationMs(null)).toBe(STORY_PHOTO_MS)
  })

  it('uses the video length, preferring the element over the stored value, capped at 60 s', () => {
    const story = { videoUrl: '/uploads/video/x.mp4', videoDurationSeconds: 12 }
    expect(storyDurationMs(story)).toBe(12000)
    expect(storyDurationMs(story, 8.5)).toBe(8500)
    expect(storyDurationMs(story, Infinity)).toBe(12000)
    expect(storyDurationMs({ ...story, videoDurationSeconds: 300 })).toBe(60000)
    expect(storyDurationMs({ videoUrl: '/uploads/video/x.mp4' })).toBe(STORY_PHOTO_MS)
  })
})

describe('formatVideoDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatVideoDuration(7)).toBe('0:07')
    expect(formatVideoDuration(60)).toBe('1:00')
    expect(formatVideoDuration(null)).toBe('0:00')
  })
})
