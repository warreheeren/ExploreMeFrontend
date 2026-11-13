import { describe, expect, it } from 'vitest'
import { guessLanguage, languageName, shouldOfferTranslation, stopwordCounts } from './language'

describe('language heuristics', () => {
  it('counts stopwords and ignores mentions, hashtags and urls', () => {
    expect(stopwordCounts('De zon en het meer @the_and #the https://the.and/of')).toEqual({ nl: 3, en: 0 })
  })

  it('guesses only when one language clearly wins', () => {
    expect(guessLanguage('Ik heb de hele dag van het uitzicht genoten')).toBe('nl')
    expect(guessLanguage('The view of the lake and the mountains')).toBe('en')
    expect(guessLanguage('het is')).toBeNull()
  })

  it('offers a translation for the other language or unrecognised long text', () => {
    expect(shouldOfferTranslation('The view of the lake and the mountains', 'nl')).toBe(true)
    expect(shouldOfferTranslation('The view of the lake and the mountains', 'en')).toBe(false)
    expect(shouldOfferTranslation('Ik heb de hele dag van het uitzicht genoten', 'en')).toBe(true)
    expect(shouldOfferTranslation('Quelle belle journée au bord du lac', 'nl')).toBe(true)
    expect(shouldOfferTranslation('Prachtig!', 'en')).toBe(false)
    expect(shouldOfferTranslation('   ', 'en')).toBe(false)
  })

  it('names languages in the ui locale', () => {
    expect(languageName('fr', 'en')).toBe('French')
    expect(languageName('und', 'en')).toBe('')
  })
})
