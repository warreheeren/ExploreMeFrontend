// Playwright-fixtures voor alle e2e-tests: de cookiebanner zou anders knoppen onderaan bedekken en de focus
// verplaatsen. Elke pagina start daarom met een opgeslagen keuze in localStorage (`consent.v1`).
// Een test die de banner zelf wil zien, zet `test.use({ seedConsent: false })`.
import { test as base, expect } from '@playwright/test'
import { CONSENT_STORAGE_KEY, createConsent } from '../src/utils/consent.js'

/** Keuze zoals na "Alleen noodzakelijk" + functioneel (Google-knop e.d. tekenen zoals vóór de banner). */
export const SEEDED_CONSENT = createConsent({ functional: true, analytics: false }, new Date('2026-01-01T00:00:00Z'))

export const test = base.extend({
  seedConsent: [true, { option: true }],

  context: async ({ context, seedConsent }, use) => {
    if (seedConsent) {
      // Alleen zetten als er nog niets staat, zodat een test die de keuze wijzigt dat na een reload behoudt.
      await context.addInitScript(([key, value]) => {
        try {
          if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value)
        } catch {
          // geen storage (bv. about:blank): niets te doen
        }
      }, [CONSENT_STORAGE_KEY, JSON.stringify(SEEDED_CONSENT)])
    }
    await use(context)
  },
})

export { expect }
