/* ExploreMe – eigen service-workercode: pushmeldingen en "Delen naar ExploreMe" (Web Share Target).
 * In productie geladen via importScripts() in de Workbox-service-worker; in development
 * rechtstreeks als service worker geregistreerd. Bevat bewust geen offline-caching (dat doet Workbox). */

/* ---------- Pushmeldingen ---------- */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'ExploreMe', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'ExploreMe'
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/pwa-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.focus()
        if ('navigate' in client) return client.navigate(target)
        return undefined
      }
    }
    return self.clients.openWindow(target)
  })())
})

/* ---------- Delen naar ExploreMe (share_target in het manifest) ----------
 * Het OS-deelmenu POST't multipart naar /share-target. Die request bestaat niet op de server: we bewaren tekst en
 * bestanden in Cache Storage en sturen door naar /share?id=…, waar de app (services/shareInbox.js) ze oppikt.
 * Sleutels en limieten moeten gelijk blijven aan services/shareInbox.js. */

const SHARE_CACHE = 'share-target-v1'
const SHARE_PREFIX = '/share-inbox/'
const SHARE_PATH = '/share-target'
const SHARE_MAX_FILES = 10
const SHARE_MAX_TEXT = 5000

/** Formuliervelden zijn strings; alles anders (of te lang) wordt genegeerd. */
function shareField(form, name) {
  const value = form.get(name)
  return typeof value === 'string' ? value.slice(0, SHARE_MAX_TEXT) : ''
}

async function storeShare(request) {
  const origin = self.location.origin
  try {
    const form = await request.formData()
    const id = self.crypto.randomUUID()
    const cache = await caches.open(SHARE_CACHE)
    const meta = {
      title: shareField(form, 'title'),
      text: shareField(form, 'text'),
      url: shareField(form, 'url'),
      createdAt: Date.now(),
      files: [],
    }
    const files = form.getAll('files')
      .filter((f) => f && typeof f === 'object' && typeof f.size === 'number' && f.size > 0)
      .slice(0, SHARE_MAX_FILES)
    for (const [i, file] of files.entries()) {
      const key = `${SHARE_PREFIX}${id}/${i}`
      const type = file.type || 'application/octet-stream'
      await cache.put(key, new Response(file, { headers: { 'content-type': type, 'x-name': encodeURIComponent(file.name || '') } }))
      meta.files.push({ key, name: file.name || '', type: file.type || '', size: file.size })
    }
    // Meta als laatste: zonder meta bestaat de share niet (een halve share wordt later opgeruimd).
    await cache.put(`${SHARE_PREFIX}${id}/meta`, new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }))
    return Response.redirect(`${origin}/share?id=${id}`, 303)
  } catch {
    // Bv. opslag vol of een onleesbaar formulier: de app toont dan een foutmelding.
    return Response.redirect(`${origin}/share?error=1`, 303)
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'POST') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || url.pathname !== SHARE_PATH) return
  event.respondWith(storeShare(event.request))
})

// Als dit bestand zelf de service worker is (development): meteen actief worden.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
