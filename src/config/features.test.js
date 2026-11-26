import { afterEach, describe, expect, it, vi } from 'vitest'
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
    expect(isNotificationFeatureEnabled('trip_invite')).toBe(true)
    expect(isNotificationFeatureEnabled('like')).toBe(true)
    expect(isNotificationFeatureEnabled('buddy_match')).toBe(true)
  })
})

// Standaardinstelling (geen VITE_FEATURES): sociale meldingen linken nergens heen, kernmeldingen wel.
describe('meldingen zonder optionele functies', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function loadWithoutFeatures() {
    vi.stubEnv('VITE_FEATURES', '')
    vi.resetModules()
    return import('./features')
  }

  it.each([
    ['like'], ['comment'], ['comment_reply'], ['mention'], ['memory'],
    ['follow'], ['follow_request'], ['follow_request_accepted'],
    ['trip_like'], ['trip_comment'],
  ])('%s staat uit', async (type) => {
    const mod = await loadWithoutFeatures()
    expect(mod.isNotificationFeatureEnabled(type)).toBe(false)
  })

  it.each([
    ['trip_invite'], ['trip_invite_accepted'], ['trip_poll'], ['trip_journal'], ['trip_settlement'],
    ['date_poll_opened'], ['date_poll_decided'], ['trip_departure'], ['flight_delayed'], ['report_resolved'],
  ])('%s blijft aan', async (type) => {
    const mod = await loadWithoutFeatures()
    expect(mod.isNotificationFeatureEnabled(type)).toBe(true)
  })
})
