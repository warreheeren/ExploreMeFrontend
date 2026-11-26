import axios from 'axios'
import { resolveMediaUrl } from '@/utils/media'
import { currentLocale } from '@/i18n'
import { resolveApiRoot } from '@/services/native'

/**
 * Basis-URL van de API zonder trailing slash; leeg = zelfde origin (Vite dev-proxy).
 * Web: `VITE_API_URL`; native app (Capacitor): `VITE_NATIVE_API_URL` of `VITE_API_URL` (zie services/native.js).
 */
export const API_ROOT = resolveApiRoot()

const http = axios.create({
  baseURL: `${API_ROOT}/api`,
})

// Relatieve `/uploads/...`-URL's in elke respons absoluut maken: elke sleutel die op
// PhotoUrl/ImageUrl/ImgUrl/VideoUrl/PosterUrl eindigt (profilePhotoUrl, tripCoverImageUrl, videoPosterUrl …) plus
// url/thumbUrl/videoUrl/posterUrl.
const MEDIA_KEY = /(PhotoUrl|ImageUrl|ImgUrl|VideoUrl|PosterUrl)$|^(imageUrl|coverImageUrl|photoUrl|url|thumbUrl|videoUrl|posterUrl)$/
const MEDIA_LIST_KEY = /^(imageUrls|photoUrls|previewImageUrls)$/

function fixMediaUrls(node) {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) fixMediaUrls(node[i])
    return node
  }
  for (const key of Object.keys(node)) {
    const value = node[key]
    if (typeof value === 'string' && MEDIA_KEY.test(key)) {
      node[key] = resolveMediaUrl(value)
    } else if (MEDIA_LIST_KEY.test(key) && Array.isArray(value)) {
      node[key] = value.map((v) => (typeof v === 'string' ? resolveMediaUrl(v) : v))
    } else if (value && typeof value === 'object') {
      fixMediaUrls(value)
    }
  }
  return node
}

/**
 * Omgekeerde van fixMediaUrls voor verzoeken: `${API_ROOT}/uploads/...` terug naar `/uploads/...`,
 * zodat de API (die alleen /uploads/... of https:// aanvaardt) eigen uploads herkent, ook bij een http-API in dev.
 */
export function relativizeMediaUrls(node) {
  if (!API_ROOT || !node || typeof node !== 'object') return node
  if (typeof FormData !== 'undefined' && node instanceof FormData) return node
  const prefix = `${API_ROOT}/uploads/`
  const fix = (v) => (typeof v === 'string' && v.startsWith(prefix) ? v.slice(API_ROOT.length) : v)
  if (Array.isArray(node)) return node.map((v) => (typeof v === 'string' ? fix(v) : relativizeMediaUrls(v)))
  const out = {}
  for (const [key, value] of Object.entries(node)) {
    out[key] = typeof value === 'string' ? fix(value) : relativizeMediaUrls(value)
  }
  return out
}

const SESSION_KEYS = ['token', 'userName', 'displayName', 'profilePhotoUrl', 'coverPhotoUrl', 'email', 'onboardingCompleted', 'role', 'emailVerified', 'isGuest', 'guestKey']

// Caches van de service worker met (mogelijk privé) gebruikersinhoud; zie workbox.runtimeCaching in vite.config.js.
const PRIVATE_CACHES = ['trip-data', 'images']

/** Wist de sessie én de gecachete privé-inhoud (uitloggen, verlopen sessie, account verwijderd). */
export function clearStoredSession() {
  SESSION_KEYS.forEach((k) => localStorage.removeItem(k))
  try {
    localStorage.removeItem('offlineTrips')
  } catch {
    // geen storage
  }
  if (typeof caches !== 'undefined') {
    for (const name of PRIVATE_CACHES) caches.delete(name).catch(() => {})
  }
}

// ---------- gastaccounts ----------
// Een gast heeft geen wachtwoord: zijn toestel bewaart een geheime sleutel en haalt daarmee een nieuw token op
// zodra het oude (8 uur) verlopen is. Zonder dit zou een gast na een dag zijn reis kwijt zijn.

let tokenRefreshedHandler = null
/** De auth-store hangt hier in, zodat ook de realtime-verbinding het nieuwe token krijgt. */
export function setTokenRefreshedHandler(handler) {
  tokenRefreshedHandler = handler
}

let guestResume = null
/** 'ok' (nieuw token opgeslagen), 'invalid' (sleutel geweigerd), 'failed' (tijdelijk, bv. geen netwerk) of 'none' (geen gast). */
function resumeGuestSession() {
  const userName = localStorage.getItem('userName')
  const guestKey = localStorage.getItem('guestKey')
  if (!userName || !guestKey) return Promise.resolve('none')
  // Eén poging tegelijk: bij het openen van een pagina falen meerdere verzoeken tegelijk met 401.
  guestResume ??= axios
    .post(`${API_ROOT}/api/auth/guest/resume`, { userName, guestKey }, { headers: { 'Accept-Language': currentLocale() } })
    .then(({ data }) => {
      localStorage.setItem('token', data.token)
      tokenRefreshedHandler?.(data.token)
      return 'ok'
    })
    .catch((err) => ([401, 403].includes(err.response?.status) ? 'invalid' : 'failed'))
    .finally(() => {
      guestResume = null
    })
  return guestResume
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Foutmeldingen van de API in de taal van de app.
  config.headers['Accept-Language'] = currentLocale()
  if (config.data && typeof config.data === 'object' && !(config.data instanceof Blob)) {
    config.data = relativizeMediaUrls(config.data)
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    fixMediaUrls(response.data)
    return response
  },
  async (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''

    // Rate limit (429): één keer opnieuw proberen na Retry-After (max. 15 s), bv. bij veel foto's tegelijk uploaden.
    const retryAfter = Number(error.response?.headers?.['retry-after'])
    if (status === 429 && error.config && !error.config.__retried429 && retryAfter > 0 && retryAfter <= 15) {
      error.config.__retried429 = true
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      return http.request(error.config)
    }
    const sentToken = !!error.config?.headers?.Authorization
    // Een fout wachtwoord bij login is ook een 401: dat is geen verlopen sessie.
    const isAuthCall = /\/auth\//.test(url) || /\/public\//.test(url)

    if (status === 401 && sentToken && !isAuthCall) {
      if (!error.config.__guestResumed) {
        const resumed = await resumeGuestSession()
        if (resumed === 'ok') {
          error.config.__guestResumed = true
          return http.request(error.config)
        }
        // Tijdelijke storing: de sleutel niet weggooien, anders is de gast zijn toegang voorgoed kwijt.
        if (resumed === 'failed') return Promise.reject(error)
      }
      clearStoredSession()
      if (!window.location.pathname.startsWith('/login')) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(`/login?expired=1&redirect=${redirect}`)
      }
    }
    return Promise.reject(error)
  }
)

export default http
