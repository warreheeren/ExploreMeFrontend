import { describe, expect, it } from 'vitest'
import { OPTIONAL_FEATURES, isFeatureEnabled, isNotificationFeatureEnabled, parseFeatures } from './features'

describe('parseFeatures', () => {
  it('zet zonder VITE_FEATURES alle optionele functies uit', () => {
    const flags = parseFeatures(undefined)
    expect(Object.keys(flags)).toEqual([...OPTIONAL_FEATURES])
    expect(Object.values(flags).every((on) => on === false)).toBe(true)
  })

  it('zet alleen de genoemde functies aan en negeert spaties en onbekende namen', () => {
    const flags = parseFeatures(' stories, buddies ,bestaat-niet')
    expect(flags.stories).toBe(true)
    expect(flags.buddies).toBe(true)
    expect(flags.challenges).toBe(false)
    expect(flags).not.toHaveProperty('bestaat-niet')
  })

  it('zet met "all" alles aan', () => {
    expect(Object.values(parseFeatures('all')).every(Boolean)).toBe(true)
  })
})

// De testomgeving draait met VITE_FEATURES=all (vite.config.js), zodat de uitgeschakelde functies gedekt blijven.
describe('vlaggen in de testomgeving', () => {
  it('kernfuncties zonder vlag staan altijd aan', () => {
    expect(isFeatureEnabled(undefined)).toBe(true)
    expect(isFeatureEnabled('trips')).toBe(true)
  })

  it('meldingen zonder gekoppelde functie zijn altijd ingeschakeld', () => {
    expect(isNotificationFeatureEnabled('like')).toBe(true)
    expect(isNotificationFeatureEnabled('buddy_match')).toBe(true)
  })
})
