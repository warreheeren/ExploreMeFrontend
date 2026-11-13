// Optionele, privacyvriendelijke statistieken (Plausible of Umami).
// Alleen actief als VITE_ANALYTICS_PROVIDER gezet is én de gebruiker toestemming gaf voor "statistieken".
// Pageviews gaan handmatig via router.afterEach (SPA); intrekken haalt het script weg en stopt het tracken.
import { watch } from 'vue'

export const ANALYTICS_SCRIPT_ID = 'exploreme-analytics'

const DEFAULT_SRC = {
  plausible: 'https://plausible.io/js/script.manual.js',
  umami: 'https://cloud.umami.is/script.js',
}

/**
 * Leest de configuratie uit de build-omgeving. Null wanneer statistieken uit staan of onvolledig zijn
 * (Plausible vraagt een domein, Umami een website-id).
 */
export function analyticsConfig(env = import.meta.env) {
  const provider = String(env?.VITE_ANALYTICS_PROVIDER || '').trim().toLowerCase()
  if (!(provider in DEFAULT_SRC)) return null
  const src = String(env.VITE_ANALYTICS_SRC || '').trim() || DEFAULT_SRC[provider]
  if (!/^https:\/\//i.test(src) && !src.startsWith('/')) return null
  if (provider === 'plausible') {
    const domain = String(env.VITE_ANALYTICS_DOMAIN || '').trim() || (typeof location !== 'undefined' ? location.hostname : '')
    return domain ? { provider, src, domain } : null
  }
  const websiteId = String(env.VITE_ANALYTICS_WEBSITE_ID || '').trim()
  return websiteId ? { provider, src, websiteId } : null
}

let active = null
/** Pageview die binnenkwam voordat het Umami-script geladen was. */
let pendingUrl = null

function plausibleQueue() {
  // Officiële wachtrij-stub: oproepen vóór het laden komen in plausible.q en worden daarna verwerkt.
  window.plausible = window.plausible || function plausible() { (window.plausible.q = window.plausible.q || []).push(arguments) }
}

function sendPageview(url) {
  if (!active) return
  if (active.provider === 'plausible') {
    window.plausible?.('pageview', { u: url })
  } else if (typeof window.umami?.track === 'function') {
    window.umami.track((props) => ({ ...props, url: toPath(url) }))
  } else {
    pendingUrl = url
  }
}

function toPath(url) {
  try {
    const u = new URL(url, location.origin)
    return u.pathname + u.search
  } catch {
    return url
  }
}

/** Laadt het script (één keer). Geeft false wanneer er niets te laden valt. */
export function enableAnalytics(config) {
  if (!config || typeof document === 'undefined') return false
  if (active) return true
  active = config
  const el = document.createElement('script')
  el.id = ANALYTICS_SCRIPT_ID
  el.defer = true
  el.src = config.src
  if (config.provider === 'plausible') {
    el.dataset.domain = config.domain
    plausibleQueue()
  } else {
    el.dataset.websiteId = config.websiteId
    // Geen automatische pageviews: de router meldt ze, zodat het intrekken meteen werkt.
    el.dataset.autoTrack = 'false'
    el.addEventListener('load', () => {
      if (pendingUrl && active === config) {
        const url = pendingUrl
        pendingUrl = null
        sendPageview(url)
      }
    })
  }
  document.head.appendChild(el)
  return true
}

/** Toestemming ingetrokken: script weg, globale functies weg, niets meer versturen. */
export function disableAnalytics() {
  active = null
  pendingUrl = null
  if (typeof document !== 'undefined') document.getElementById(ANALYTICS_SCRIPT_ID)?.remove()
  if (typeof window !== 'undefined') {
    delete window.plausible
    delete window.umami
  }
}

export function isAnalyticsActive() {
  return !!active
}

/** Meldt een pageview als statistieken actief zijn; anders doet dit niets. */
export function trackPageview(url = typeof location !== 'undefined' ? location.href : '') {
  if (active && url) sendPageview(url)
}

/**
 * Koppelt statistieken aan de toestemming en de router. Doet niets zonder configuratie.
 * `consent` is de Pinia-consentstore; `router` de Vue Router-instantie.
 */
export function setupAnalytics({ router, consent, env = import.meta.env }) {
  const config = analyticsConfig(env)
  if (!config) return () => {}

  const stopWatch = watch(
    () => consent.has('analytics'),
    (allowed) => {
      if (allowed && !active) {
        enableAnalytics(config)
        // Toestemming gegeven op een al geladen pagina: die pagina telt ook.
        if (router.currentRoute.value.matched.length) trackPageview(location.origin + router.currentRoute.value.fullPath)
      } else if (!allowed && active) {
        disableAnalytics()
      }
    },
    { immediate: true },
  )
  const stopRouter = router.afterEach((to, from, failure) => {
    if (failure) return
    trackPageview(location.origin + to.fullPath)
  })
  return () => {
    stopWatch()
    stopRouter()
  }
}
