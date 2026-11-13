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

const SESSION_KEYS = ['token', 'userName', 'displayName', 'profilePhotoUrl', 'coverPhotoUrl', 'email', 'onboardingCompleted', 'role', 'emailVerified']

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
