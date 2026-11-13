// Pushmeldingen voor dit toestel.
// - Browser/PWA: Web Push-abonnement; de API stuurt meldingen via VAPID.
// - Native app (Capacitor): FCM-token via @capacitor/push-notifications; de API stuurt via FCM HTTP v1.
// De publieke functies zijn voor beide gelijk, zodat de instellingen niet hoeven te weten welke het is.
import * as notificationsApi from '@/api/notificationsApi'
import { isNative, platform } from '@/services/native'
import { useIntegrations } from '@/composables/useIntegrations'

export function pushSupported() {
  if (isNative) return true
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && window.isSecureContext
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function pushPermission() {
  if (isNative) return nativePermission
  return pushSupported() ? Notification.permission : 'unsupported'
}

async function getRegistration() {
  // Productie: de Workbox-service-worker (die app-sw.js importeert). Development: app-sw.js zelf.
  if (import.meta.env.PROD) return navigator.serviceWorker.ready
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  await navigator.serviceWorker.register('/app-sw.js', { scope: '/' })
  return navigator.serviceWorker.ready
}

function base64UrlToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/** Web: het PushSubscription-object; native: `{ token }`; null als dit toestel geen meldingen krijgt. */
export async function currentSubscription() {
  if (isNative) return currentNativeRegistration()
  if (!pushSupported()) return null
  try {
    const reg = await getRegistration()
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

/** Vraagt toestemming, abonneert dit toestel en meldt het abonnement bij de API. Gooit bij weigering. */
export async function enablePush() {
  if (isNative) return enableNativePush()
  if (!pushSupported()) throw new Error('unsupported')
  const config = await notificationsApi.getPushConfig()
  if (!config?.enabled || !config.publicKey) throw new Error('disabled')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')

  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(config.publicKey) })
  }
  await notificationsApi.subscribePush(sub.toJSON())
  return sub
}

export async function disablePush() {
  if (isNative) return disableNativePush()
  const sub = await currentSubscription()
  if (!sub) return
  try {
    await notificationsApi.unsubscribePush(sub.endpoint)
  } finally {
    await sub.unsubscribe()
  }
}

/** Na inloggen: een bestaand abonnement van dit toestel opnieuw aan de (nieuwe) gebruiker koppelen. */
export async function resyncPush() {
  if (isNative) return resyncNativePush()
  if (pushPermission() !== 'granted') return
  const sub = await currentSubscription()
  if (sub) await notificationsApi.subscribePush(sub.toJSON()).catch(() => {})
}

// ---------- native app (FCM) ----------

/** Het laatst geregistreerde FCM-token van dit toestel (om later af te melden). */
const NATIVE_TOKEN_KEY = 'nativePushToken'
const REGISTRATION_TIMEOUT_MS = 20000

let nativePermission = 'default'

const loadPlugin = async () => (await import('@capacitor/push-notifications')).PushNotifications

function readStoredToken() {
  try {
    return localStorage.getItem(NATIVE_TOKEN_KEY)
  } catch {
    return null
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(NATIVE_TOKEN_KEY, token)
    else localStorage.removeItem(NATIVE_TOKEN_KEY)
  } catch {
    // geen storage: afmelden kan dan alleen via uitloggen/opnieuw registreren
  }
}

/** Capacitor geeft 'prompt' / 'prompt-with-rationale' voor "nog niet gevraagd". */
export function mapNativePermission(receive) {
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'default'
}

async function refreshNativePermission(plugin) {
  try {
    nativePermission = mapNativePermission((await plugin.checkPermissions()).receive)
  } catch {
    nativePermission = 'default'
  }
  return nativePermission
}

/** Registreert bij FCM/APNs en wacht op het token (het komt via een event, niet als returnwaarde). */
async function obtainNativeToken(plugin) {
  const handles = []
  const cleanup = () => handles.forEach((h) => h?.remove?.())
  try {
    const token = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('registration')), REGISTRATION_TIMEOUT_MS)
      Promise.all([
        plugin.addListener('registration', ({ value }) => { clearTimeout(timer); resolve(value) }),
        plugin.addListener('registrationError', () => { clearTimeout(timer); reject(new Error('registration')) }),
      ])
        .then((added) => {
          handles.push(...added)
          return plugin.register()
        })
        .catch((err) => { clearTimeout(timer); reject(err) })
    })
    return token
  } finally {
    cleanup()
  }
}

async function currentNativeRegistration() {
  const plugin = await loadPlugin().catch(() => null)
  if (!plugin) return null
  await refreshNativePermission(plugin)
  const token = readStoredToken()
  return token && nativePermission === 'granted' ? { token } : null
}

async function enableNativePush() {
  const status = await useIntegrations().load(true)
  if (!status?.nativePush) throw new Error('disabled')

  const plugin = await loadPlugin()
  let permission = await refreshNativePermission(plugin)
  if (permission !== 'granted') {
    permission = mapNativePermission((await plugin.requestPermissions()).receive)
    nativePermission = permission
  }
  if (permission !== 'granted') throw new Error('denied')

  const token = await obtainNativeToken(plugin)
  await notificationsApi.registerNativePush(platform, token)
  storeToken(token)
  return { token }
}

async function disableNativePush() {
  const token = readStoredToken()
  const plugin = await loadPlugin().catch(() => null)
  try {
    if (token) await notificationsApi.unregisterNativePush(token)
  } finally {
    storeToken(null)
    await plugin?.unregister?.().catch(() => {})
  }
}

/** Na inloggen: het (mogelijk vernieuwde) token van dit toestel aan de huidige gebruiker koppelen. */
async function resyncNativePush() {
  if (!readStoredToken()) return
  const plugin = await loadPlugin().catch(() => null)
  if (!plugin || (await refreshNativePermission(plugin)) !== 'granted') return
  try {
    const token = await obtainNativeToken(plugin)
    await notificationsApi.registerNativePush(platform, token)
    storeToken(token)
  } catch {
    // volgende keer opnieuw
  }
}
