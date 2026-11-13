// Opstart van de native app (Capacitor). Wordt alleen in de native app geladen (dynamisch vanuit main.js), dus
// de Capacitor-plugins komen niet in de web-bundle-startup.
//
// - Tik op een pushmelding → router naar `data.link` (zelfde links als Web Push).
// - "Delen naar ExploreMe" (Android-intent / iOS Share Extension) → dezelfde ShareView als de web share target.
// - Android-terugknop → vorige pagina, of de app sluiten op de startpagina.
// - Live locatie op de achtergrond hervatten als die nog liep (services/liveTracking.js).

import { stashShare } from '@/services/shareInbox'
import { missingNativeApiUrl } from '@/services/native'

/**
 * Alleen interne paden (`/trips/…`), geen externe of protocol-relatieve URL's: een melding mag de app niet naar een
 * andere site sturen. Geeft het pad terug, of null.
 */
export function safeInternalLink(link) {
  if (typeof link !== 'string') return null
  const value = link.trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}

/** Leest een gedeeld bestand (pad of file://-URI uit de plugin) als File via de lokale Capacitor-server. */
async function readSharedFile(file) {
  const uri = String(file?.uri || '')
  if (!uri) return null
  const src = window.Capacitor?.convertFileSrc?.(uri.startsWith('/') ? `file://${uri}` : uri) || uri
  try {
    const response = await fetch(src)
    if (!response.ok) return null
    const blob = await response.blob()
    const type = file.mimeType && file.mimeType !== 'application/octet-stream' ? file.mimeType : blob.type
    return new File([blob], file.name || 'file', { type: type || '', lastModified: Date.now() })
  } catch {
    return null
  }
}

/** Zet een share-event van @capgo/capacitor-share-target om naar de vorm van shareInbox (`{ title, text, url, files }`). */
export async function shareFromNativeEvent(event) {
  const texts = (Array.isArray(event?.texts) ? event.texts : []).map((t) => String(t ?? '').trim()).filter(Boolean)
  // Een losse link in de tekst wordt de url (zoals Android dat bij de web share target ook vaak doet).
  const url = texts.find((t) => /^https?:\/\/\S+$/i.test(t)) || ''
  const text = texts.filter((t) => t !== url).join('\n')
  const files = (await Promise.all((Array.isArray(event?.files) ? event.files : []).map(readSharedFile))).filter(Boolean)
  return { title: String(event?.title || ''), text, url, files }
}

async function setupPushTaps(router) {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const target = safeInternalLink(notification?.data?.link)
    if (target) router.push(target).catch(() => {})
  })
}

async function setupShareTarget(router) {
  const { CapacitorShareTarget } = await import('@capgo/capacitor-share-target')
  await CapacitorShareTarget.addListener('shareReceived', async (event) => {
    const share = await shareFromNativeEvent(event)
    if (!share.title && !share.text && !share.url && share.files.length === 0) return
    const id = stashShare(share)
    router.push({ name: 'share-target', query: { id } }).catch(() => {})
  })
}

async function setupBackButton(router) {
  const { App } = await import('@capacitor/app')
  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) router.back()
    else App.exitApp()
  })
}

async function resumeLiveTracking() {
  const { resumeLiveTracking: resume } = await import('@/services/liveTracking')
  await resume()
}

/** Elke onderdeel apart: een ontbrekende of falende plugin mag de rest niet tegenhouden. */
export async function setupNativeApp({ router }) {
  if (missingNativeApiUrl()) {
    // Zonder absolute API-URL praat de app met https://localhost/api: niets laadt. Zie docs/native-app.md.
    console.error('Native build zonder VITE_NATIVE_API_URL/VITE_API_URL: de API is onbereikbaar.')
  }
  const results = await Promise.allSettled([
    setupPushTaps(router),
    setupShareTarget(router),
    setupBackButton(router),
    resumeLiveTracking(),
  ])
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.warn('Native app-onderdeel niet beschikbaar', r.reason))
}
