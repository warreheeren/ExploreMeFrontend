// Native app (Capacitor, Android/iOS) of gewone browser/PWA?
//
// De Capacitor-bridge zet `window.Capacitor` klaar vóór de app-scripts laden, dus deze module heeft geen
// imports nodig: zo blijft `@capacitor/core` buiten de web-bundle-startup. Plugins worden overal dynamisch
// geïmporteerd (`await import('@capacitor/…')`) en alleen als `isNative` waar is.

const trimSlashes = (value) => (value || '').replace(/\/+$/, '')

/** True in de native app (Android/iOS); false in de browser en de PWA. */
export function isNativePlatform(win = typeof window !== 'undefined' ? window : undefined) {
  try {
    return win?.Capacitor?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/** 'android' | 'ios' | 'web' */
export function nativePlatform(win = typeof window !== 'undefined' ? window : undefined) {
  if (!isNativePlatform(win)) return 'web'
  const name = win.Capacitor.getPlatform?.()
  return name === 'android' || name === 'ios' ? name : 'web'
}

export const isNative = isNativePlatform()
export const platform = nativePlatform()

/**
 * Basis-URL van de API zonder trailing slash; leeg = zelfde origin (Vite dev-proxy / nginx).
 * - Web: `VITE_API_URL` (ongewijzigd gedrag).
 * - Native: de app draait op `https://localhost` (Android) of `capacitor://localhost` (iOS) zonder proxy, dus is
 *   een absolute URL nodig: `VITE_NATIVE_API_URL`, anders `VITE_API_URL`.
 */
export function resolveApiRoot(env = import.meta.env, native = isNative) {
  if (!native) return trimSlashes(env?.VITE_API_URL)
  return trimSlashes(env?.VITE_NATIVE_API_URL || env?.VITE_API_URL)
}

/**
 * Origin voor links die buiten de app gedeeld worden (posts, reizen, QR-codes, agenda).
 * - Web: `window.location.origin` (ongewijzigd gedrag).
 * - Native: de app draait op `https://localhost`, wat voor anderen niets betekent: `VITE_PUBLIC_WEB_URL`
 *   (de gehoste webapp), met `window.location.origin` als laatste redmiddel.
 */
export function publicWebOrigin(env = import.meta.env, native = isNative, win = typeof window !== 'undefined' ? window : undefined) {
  const current = win?.location?.origin || ''
  if (!native) return current
  return trimSlashes(env?.VITE_PUBLIC_WEB_URL) || current
}

/** True als de native build geen absolute API-URL heeft (dan kan de app niets laden). */
export function missingNativeApiUrl(env = import.meta.env, native = isNative) {
  return native && !/^https?:\/\//i.test(resolveApiRoot(env, native))
}
