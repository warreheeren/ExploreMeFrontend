import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConsentStore } from './consent'
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, createConsent, isConsentExemptLayout, readConsent, writeConsent } from '@/utils/consent'

const stored = () => JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY))

describe('consent utils', () => {
  beforeEach(() => localStorage.removeItem(CONSENT_STORAGE_KEY))

  it('creates a versioned record with an ISO date and strict booleans', () => {
    const record = createConsent({ functional: 'yes', analytics: true }, new Date('2026-10-14T08:00:00Z'))
    expect(record).toEqual({ version: CONSENT_VERSION, decidedAt: '2026-10-14T08:00:00.000Z', functional: false, analytics: true })
  })

  it('round-trips through storage and rejects broken, outdated or incomplete records', () => {
    writeConsent(createConsent({ functional: true }))
    expect(readConsent()).toMatchObject({ functional: true, analytics: false })

    localStorage.setItem(CONSENT_STORAGE_KEY, '{kapot')
    expect(readConsent()).toBeNull()
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...createConsent(), version: CONSENT_VERSION - 1 }))
    expect(readConsent()).toBeNull()
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ version: CONSENT_VERSION, decidedAt: 'gisteren' }))
    expect(readConsent()).toBeNull()
  })

  it('survives a storage that throws', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(readConsent(broken)).toBeNull()
    expect(writeConsent(createConsent(), broken)).toBe(false)
  })

  it('exempts only embed and print layouts', () => {
    expect(isConsentExemptLayout('embed')).toBe(true)
    expect(isConsentExemptLayout('print')).toBe(true)
    expect(isConsentExemptLayout('app')).toBe(false)
    expect(isConsentExemptLayout('auth')).toBe(false)
  })
})

describe('consent store', () => {
  beforeEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY)
    setActivePinia(createPinia())
  })

  it('starts undecided with only necessary allowed', () => {
    const consent = useConsentStore()
    expect(consent.decided).toBe(false)
    expect(consent.has('necessary')).toBe(true)
    expect(consent.has('functional')).toBe(false)
    expect(consent.has('analytics')).toBe(false)
    expect(consent.has('marketing')).toBe(false)
  })

  it('acceptAll and rejectAll persist a dated decision', () => {
    const consent = useConsentStore()
    consent.acceptAll()
    expect(consent.decided).toBe(true)
    expect(consent.has('functional')).toBe(true)
    expect(consent.has('analytics')).toBe(true)
    expect(stored()).toMatchObject({ version: CONSENT_VERSION, functional: true, analytics: true })
    expect(Date.parse(stored().decidedAt)).not.toBeNaN()

    consent.rejectAll()
    expect(consent.decided).toBe(true)
    expect(consent.has('functional')).toBe(false)
    expect(stored()).toMatchObject({ functional: false, analytics: false })
  })

  it('save keeps unspecified categories and grant only switches one on', () => {
    const consent = useConsentStore()
    consent.save({ analytics: true })
    expect(consent.has('functional')).toBe(false)
    expect(consent.has('analytics')).toBe(true)

    consent.grant('functional')
    expect(consent.has('functional')).toBe(true)
    expect(consent.has('analytics')).toBe(true)

    consent.grant('necessary')
    expect(stored()).toMatchObject({ functional: true, analytics: true })
  })

  it('grant without an earlier decision leaves the other categories off', () => {
    const consent = useConsentStore()
    consent.grant('functional')
    expect(consent.decided).toBe(true)
    expect(stored()).toMatchObject({ functional: true, analytics: false })
  })

  it('reads an existing decision and asks again after a version bump', () => {
    writeConsent(createConsent({ functional: true }))
    expect(useConsentStore().has('functional')).toBe(true)

    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...stored(), version: CONSENT_VERSION + 1 }))
    setActivePinia(createPinia())
    const fresh = useConsentStore()
    expect(fresh.decided).toBe(false)
    expect(fresh.has('functional')).toBe(false)
  })

  it('opens and closes the settings dialog', () => {
    const consent = useConsentStore()
    consent.openSettings()
    expect(consent.settingsOpen).toBe(true)
    consent.closeSettings()
    expect(consent.settingsOpen).toBe(false)
  })

  it('follows changes from another tab', () => {
    const consent = useConsentStore()
    const stop = consent.syncAcrossTabs()
    writeConsent(createConsent({ functional: true, analytics: true }))
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_STORAGE_KEY }))
    expect(consent.has('analytics')).toBe(true)

    stop()
    const spy = vi.spyOn(consent, 'reload')
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_STORAGE_KEY }))
    expect(spy).not.toHaveBeenCalled()
  })
})
