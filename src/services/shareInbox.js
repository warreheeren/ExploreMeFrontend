// "Delen naar ExploreMe": wat het OS-deelmenu naar de PWA stuurde.
// public/app-sw.js vangt POST /share-target af en bewaart tekst + bestanden in Cache Storage onder
// /share-inbox/{id}/meta en /share-inbox/{id}/{n}; deze module leest ze uit en ruimt ze op.
// Zonder bestanden kan een share ook als GET binnenkomen: /share?title=…&text=…&url=…

export const SHARE_CACHE = 'share-target-v1'
const PREFIX = '/share-inbox/'
/** Gelijk aan SHARE_MAX_FILES in app-sw.js. */
export const MAX_SHARE_FILES = 10
/** Niet-afgeronde shares blijven hoogstens een dag staan. */
export const SHARE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const MAX_TEXT = 5000
const ID_PATTERN = /^[0-9a-f-]{36}$/i

const hasCaches = () => typeof caches !== 'undefined'

/**
 * Shares uit de native app (services/nativeApp.js, @capgo/capacitor-share-target). Daar is geen service worker:
 * de bestanden staan al als File in het geheugen en blijven er tot de share afgerond of verlopen is.
 */
const memoryShares = new Map()

function newShareId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback (oude WebView): willekeurige UUID v4-vorm, zodat ID_PATTERN hem aanvaardt.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/**
 * Bewaart een share die niet via de service worker binnenkwam (native app) en geeft het id voor `/share?id=…`.
 * `files` zijn File-objecten; tekst wordt net als in de SW ingekort.
 */
export function stashShare({ title = '', text = '', url = '', files = [] } = {}, now = Date.now()) {
  const id = newShareId()
  memoryShares.set(id, {
    title: String(title || '').slice(0, MAX_TEXT),
    text: String(text || '').slice(0, MAX_TEXT),
    url: String(url || '').slice(0, MAX_TEXT),
    files: (Array.isArray(files) ? files : []).slice(0, MAX_SHARE_FILES),
    createdAt: now,
  })
  return id
}

/** Eerste waarde van een queryparameter als string (vue-router kan arrays geven). */
function queryString(value) {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first.slice(0, MAX_TEXT) : ''
}

/** id uit een cachesleutel (`/share-inbox/{id}/…`), ongeacht of de sleutel een volledige URL is. */
function idFromKey(url) {
  const path = new URL(url, 'http://localhost').pathname
  if (!path.startsWith(PREFIX)) return null
  return path.slice(PREFIX.length).split('/')[0] || null
}

async function readFile(cache, entry) {
  const response = await cache.match(entry.key)
  if (!response) return null
  const blob = await response.blob()
  const headerName = response.headers?.get?.('x-name')
  let name = entry.name
  if (!name && headerName) {
    try {
      name = decodeURIComponent(headerName)
    } catch {
      name = headerName
    }
  }
  const type = entry.type || blob.type || ''
  return new File([blob], name || 'file', { type, lastModified: Date.now() })
}

/**
 * Leest de share uit de route-query: `?id=` (uit de cache) of `?title&text&url` (GET-share).
 * Geeft `{ id, title, text, url, files: File[] }`, of null als er niets (meer) te vinden is.
 */
export async function loadShare(query = {}) {
  const id = queryString(query.id)
  if (id) {
    if (!ID_PATTERN.test(id)) return null
    const stashed = memoryShares.get(id)
    if (stashed) {
      if (isExpired(stashed)) {
        memoryShares.delete(id)
        return null
      }
      return { id, title: stashed.title, text: stashed.text, url: stashed.url, files: [...stashed.files] }
    }
    if (!hasCaches()) return null
    const cache = await caches.open(SHARE_CACHE)
    const metaResponse = await cache.match(`${PREFIX}${id}/meta`)
    if (!metaResponse) return null
    let meta
    try {
      meta = await metaResponse.json()
    } catch {
      return null
    }
    if (isExpired(meta)) {
      await clearShare(id)
      return null
    }
    const entries = Array.isArray(meta.files) ? meta.files.slice(0, MAX_SHARE_FILES) : []
    const files = (await Promise.all(entries.map((entry) => readFile(cache, entry)))).filter(Boolean)
    return { id, title: String(meta.title || ''), text: String(meta.text || ''), url: String(meta.url || ''), files }
  }

  const title = queryString(query.title)
  const text = queryString(query.text)
  const url = queryString(query.url)
  if (!title && !text && !url) return null
  return { id: null, title, text, url, files: [] }
}

function isExpired(meta, now = Date.now()) {
  const createdAt = Number(meta?.createdAt)
  return !Number.isFinite(createdAt) || now - createdAt > SHARE_MAX_AGE_MS
}

/** Verwijdert één share (meta + bestanden). Stil als er geen cache is. */
export async function clearShare(id) {
  if (id) memoryShares.delete(id)
  if (!id || !hasCaches()) return
  const cache = await caches.open(SHARE_CACHE)
  const keys = await cache.keys()
  await Promise.all(keys.filter((request) => idFromKey(request.url ?? request) === id).map((request) => cache.delete(request)))
}

/**
 * Ruimt shares op die ouder zijn dan een dag, plus losse bestanden zonder meta (een afgebroken opslag in de SW).
 * `keepId` (de share die nu open staat) blijft altijd staan.
 */
export async function purgeExpiredShares({ now = Date.now(), keepId = null } = {}) {
  for (const [id, share] of memoryShares) {
    if (id !== keepId && isExpired(share, now)) memoryShares.delete(id)
  }
  if (!hasCaches()) return
  const cache = await caches.open(SHARE_CACHE)
  const keys = await cache.keys()
  const byId = new Map()
  for (const request of keys) {
    const id = idFromKey(request.url ?? request)
    if (!id) continue
    if (!byId.has(id)) byId.set(id, [])
    byId.get(id).push(request)
  }

  for (const [id, requests] of byId) {
    if (id === keepId) continue
    const metaRequest = requests.find((r) => new URL(r.url ?? r, 'http://localhost').pathname.endsWith('/meta'))
    let expired = true
    if (metaRequest) {
      try {
        expired = isExpired(await (await cache.match(metaRequest)).json(), now)
      } catch {
        expired = true
      }
    }
    if (expired) await Promise.all(requests.map((r) => cache.delete(r)))
  }
}

/**
 * Titel, tekst en URL samen als één tekst (Android zet de URL vaak al in `text`): zonder dubbels, één per regel.
 */
export function shareText(share) {
  if (!share) return ''
  const text = share.text.trim()
  const parts = []
  const title = share.title.trim()
  if (title && !text.includes(title)) parts.push(title)
  if (text) parts.push(text)
  const url = share.url.trim()
  if (url && !text.includes(url)) parts.push(url)
  return parts.join('\n')
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** Soort bestand voor de deelacties: 'image' (uploadbaar), 'video', 'pdf', 'text' of 'other'. */
export function fileKind(file) {
  const type = (file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (IMAGE_TYPES.includes(type)) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (type === 'text/plain' || name.endsWith('.txt')) return 'text'
  return 'other'
}
