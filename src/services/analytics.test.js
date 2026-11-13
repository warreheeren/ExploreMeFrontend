import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import {
  ANALYTICS_SCRIPT_ID,
  analyticsConfig,
  disableAnalytics,
  enableAnalytics,
  isAnalyticsActive,
  setupAnalytics,
  trackPageview,
} from './analytics'

const PLAUSIBLE = { VITE_ANALYTICS_PROVIDER: 'plausible', VITE_ANALYTICS_DOMAIN: 'exploreme.app' }
const UMAMI = { VITE_ANALYTICS_PROVIDER: 'Umami', VITE_ANALYTICS_WEBSITE_ID: 'site-1', VITE_ANALYTICS_SRC: 'https://stats.example.com/script.js' }

const script = () => document.getElementById(ANALYTICS_SCRIPT_ID)

/** Minimale router: currentRoute + afterEach-hooks die de test zelf afvuurt. */
function fakeRouter(path = '/') {
  const hooks = []
  return {
    currentRoute: { value: { fullPath: path, matched: [{}] } },
    afterEach: vi.fn((hook) => {
      hooks.push(hook)
      return () => hooks.splice(hooks.indexOf(hook), 1)
    }),
    navigate(to) {
      this.currentRoute.value = { fullPath: to, matched: [{}] }
      hooks.forEach((h) => h({ fullPath: to }, {}, undefined))
    },
  }
}

function fakeConsent(analytics = false) {
  const state = reactive({ analytics })
  return { state, has: (cat) => cat === 'analytics' && state.analytics }
}

describe('analyticsConfig', () => {
  it('is off without (a known) provider or without required ids', () => {
    expect(analyticsConfig({})).toBeNull()
    expect(analyticsConfig({ VITE_ANALYTICS_PROVIDER: 'matomo' })).toBeNull()
    expect(analyticsConfig({ VITE_ANALYTICS_PROVIDER: 'umami' })).toBeNull()
    expect(analyticsConfig({ ...UMAMI, VITE_ANALYTICS_SRC: 'javascript:alert(1)' })).toBeNull()
  })

  it('uses the default script per provider and normalises the provider name', () => {
    expect(analyticsConfig(PLAUSIBLE)).toEqual({ provider: 'plausible', src: 'https://plausible.io/js/script.manual.js', domain: 'exploreme.app' })
    expect(analyticsConfig(UMAMI)).toEqual({ provider: 'umami', src: 'https://stats.example.com/script.js', websiteId: 'site-1' })
  })
})

describe('analytics loader', () => {
  beforeEach(() => disableAnalytics())
  afterEach(() => disableAnalytics())

  it('injects the Plausible script once and queues manual pageviews', () => {
    expect(enableAnalytics(analyticsConfig(PLAUSIBLE))).toBe(true)
    expect(enableAnalytics(analyticsConfig(PLAUSIBLE))).toBe(true)
    expect(document.querySelectorAll(`#${ANALYTICS_SCRIPT_ID}`)).toHaveLength(1)
    expect(script().src).toBe('https://plausible.io/js/script.manual.js')
    expect(script().dataset.domain).toBe('exploreme.app')

    trackPageview('https://exploreme.app/trips')
    expect([...window.plausible.q[0]]).toEqual(['pageview', { u: 'https://exploreme.app/trips' }])
  })

  it('configures Umami without auto-tracking and sends pending pageviews after load', () => {
    enableAnalytics(analyticsConfig(UMAMI))
    expect(script().dataset.websiteId).toBe('site-1')
    expect(script().dataset.autoTrack).toBe('false')

    trackPageview('http://localhost:3000/discover?q=1')
    const track = vi.fn()
    window.umami = { track }
    script().dispatchEvent(new Event('load'))
    expect(track).toHaveBeenCalledTimes(1)
    expect(track.mock.calls[0][0]({ title: 'x' })).toEqual({ title: 'x', url: '/discover?q=1' })
  })

  it('revoking removes the script and stops tracking', () => {
    enableAnalytics(analyticsConfig(PLAUSIBLE))
    disableAnalytics()
    expect(script()).toBeNull()
    expect(window.plausible).toBeUndefined()
    expect(isAnalyticsActive()).toBe(false)

    trackPageview('https://exploreme.app/after')
    expect(window.plausible).toBeUndefined()
  })

  it('does nothing without configuration', () => {
    expect(enableAnalytics(null)).toBe(false)
    const router = fakeRouter()
    setupAnalytics({ router, consent: fakeConsent(true), env: {} })
    expect(router.afterEach).not.toHaveBeenCalled()
    expect(script()).toBeNull()
  })
})

describe('setupAnalytics', () => {
  afterEach(() => disableAnalytics())

  it('follows consent: loads on grant, tracks route changes, unloads on revoke', async () => {
    const router = fakeRouter('/trips')
    const consent = fakeConsent(false)
    const stop = setupAnalytics({ router, consent, env: PLAUSIBLE })

    router.navigate('/discover')
    expect(script()).toBeNull()

    consent.state.analytics = true
    await nextTick()
    expect(script()).not.toBeNull()
    // De pagina waarop toestemming gegeven werd, telt meteen mee.
    expect(window.plausible.q.map((args) => args[1].u)).toEqual([`${location.origin}/discover`])

    router.navigate('/lists')
    expect(window.plausible.q.map((args) => args[1].u)).toEqual([`${location.origin}/discover`, `${location.origin}/lists`])

    consent.state.analytics = false
    await nextTick()
    expect(script()).toBeNull()
    router.navigate('/settings')
    expect(window.plausible).toBeUndefined()

    stop()
    expect(router.afterEach).toHaveBeenCalledTimes(1)
  })
})
