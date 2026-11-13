import { describe, expect, it } from 'vitest'
import { audioExtension, formatClock, moodEmoji, pickAudioMimeType } from './journal'

describe('pickAudioMimeType', () => {
  it('kiest de eerste ondersteunde container', () => {
    expect(pickAudioMimeType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus')
    expect(pickAudioMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4')
    expect(pickAudioMimeType((t) => t === 'audio/ogg')).toBe('audio/ogg')
  })

  it('valt terug op de browserkeuze', () => {
    expect(pickAudioMimeType(() => false)).toBe('')
    expect(pickAudioMimeType(undefined)).toBe('')
    expect(pickAudioMimeType(() => { throw new Error('x') })).toBe('')
  })
})

describe('audio helpers', () => {
  it('geeft extensies, tijden en emoji', () => {
    expect(audioExtension('audio/webm;codecs=opus')).toBe('webm')
    expect(audioExtension('audio/mp4')).toBe('m4a')
    expect(audioExtension('audio/ogg;codecs=opus')).toBe('ogg')
    expect(formatClock(75)).toBe('1:15')
    expect(formatClock(-3)).toBe('0:00')
    expect(moodEmoji('great')).toBe('😍')
    expect(moodEmoji('onbekend')).toBe('')
  })
})
