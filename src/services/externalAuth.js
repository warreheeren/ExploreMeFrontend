// Inloggen met Google (Identity Services) en Apple (Sign in with Apple JS).
// De SDK's worden pas geladen wanneer de API zegt dat de provider geconfigureerd is.
import { getExternalAuthConfig } from '@/api/externalAuthApi'

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client'
const APPLE_SCRIPT = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

let configPromise = null
const scripts = new Map()

/** Configuratie één keer per sessie ophalen; bij een fout (API onbereikbaar) gewoon geen knoppen. */
export function loadExternalAuthConfig() {
  configPromise ??= getExternalAuthConfig().catch(() => {
    configPromise = null
    return { google: null, apple: null }
  })
  return configPromise
}

function loadScript(src) {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = src
      el.async = true
      el.defer = true
      el.onload = () => resolve()
      el.onerror = () => {
        scripts.delete(src)
        el.remove()
        reject(new Error('script'))
      }
      document.head.appendChild(el)
    }))
  }
  return scripts.get(src)
}

// ---------- Google ----------

let googleInitializedFor = null
let googleHandler = null

/**
 * Tekent de officiële Google-knop in `el` (huisstijl van Google, verplicht voor de ID-token-flow).
 * `onCredential({ idToken })` krijgt het ID-token zodra de gebruiker kiest.
 */
export async function renderGoogleButton(el, { clientId, locale, dark, width, onCredential }) {
  await loadScript(GOOGLE_SCRIPT)
  const gis = window.google?.accounts?.id
  if (!gis || !el) throw new Error('google')

  // initialize() hoort één keer per pagina; de actieve knop bepaalt via googleHandler wat er gebeurt.
  googleHandler = onCredential
  if (googleInitializedFor !== clientId) {
    gis.initialize({
      client_id: clientId,
      callback: (response) => googleHandler?.({ idToken: response.credential }),
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    googleInitializedFor = clientId
  }

  el.replaceChildren()
  gis.renderButton(el, {
    type: 'standard',
    theme: dark ? 'filled_black' : 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'center',
    locale,
    // Google accepteert 200–400 px.
    width: Math.max(200, Math.min(400, Math.round(width || 320))),
  })
}

// ---------- Apple ----------

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Combineert Apples voor- en achternaam (alleen bij de eerste autorisatie meegegeven). */
export function appleDisplayName(user) {
  const name = user?.name
  if (!name) return null
  return [name.firstName, name.lastName].map((s) => (s || '').trim()).filter(Boolean).join(' ') || null
}

/**
 * Opent de Apple-popup. Apple zet de SHA-256 van onze nonce in het token; de API krijgt de ruwe nonce en controleert.
 * Geeft null wanneer de gebruiker de popup sluit.
 */
export async function signInWithApple({ clientId, redirectUri }) {
  await loadScript(APPLE_SCRIPT)
  const appleId = window.AppleID?.auth
  if (!appleId) throw new Error('apple')

  const nonce = randomNonce()
  appleId.init({
    clientId,
    scope: 'name email',
    redirectURI: redirectUri,
    state: randomNonce().slice(0, 16),
    nonce: await sha256Hex(nonce),
    usePopup: true,
  })

  try {
    const res = await appleId.signIn()
    const idToken = res?.authorization?.id_token
    if (!idToken) throw new Error('apple')
    return { idToken, nonce, displayName: appleDisplayName(res.user) }
  } catch (e) {
    if (e?.error === 'popup_closed_by_user' || e?.error === 'user_cancelled_authorize') return null
    throw e
  }
}
