import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SHARE_CACHE, SHARE_MAX_AGE_MS, clearShare, fileKind, loadShare, purgeExpiredShares, shareText } from './shareInbox'

const ORIGIN = 'https://app.example'
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'
const OTHER = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

/** Minimale Cache API zoals app-sw.js hem vult: sleutels zijn volledige URL's, waarden { body, headers }. */
function fakeCaches() {
  const stores = new Map()
  const abs = (key) => new URL(typeof key === 'string' ? key : key.url, ORIGIN).href
  const response = ({ body, headers = {} }) => ({
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => JSON.parse(body),
    blob: async () => new Blob([body], { type: headers['content-type'] || '' }),
  })
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)
    return {
      match: async (key) => (store.has(abs(key)) ? response(store.get(abs(key))) : undefined),
      keys: async () => [...store.keys()].map((url) => ({ url })),
      delete: async (key) => store.delete(abs(key)),
      put: async (key, value) => { store.set(abs(key), value) },
    }
  }
  return { open, stores }
}

let cachesMock

async function putShare(id, { createdAt = Date.now(), files = [], title = '', text = '', url = '' } = {}) {
  const cache = await cachesMock.open(SHARE_CACHE)
  const meta = { title, text, url, createdAt, files: [] }
  files.forEach((f, i) => {
    const key = `/share-inbox/${id}/${i}`
    cache.put(key, { body: f.body, headers: { 'content-type': f.type, 'x-name': encodeURIComponent(f.name) } })
    meta.files.push({ key, name: f.name, type: f.type, size: f.body.length })
  })
  await cache.put(`/share-inbox/${id}/meta`, { body: JSON.stringify(meta), headers: { 'content-type': 'application/json' } })
}

async function keys() {
  const cache = await cachesMock.open(SHARE_CACHE)
  return (await cache.keys()).map((k) => new URL(k.url).pathname)
}

beforeEach(() => {
  cachesMock = fakeCaches()
  vi.stubGlobal('caches', cachesMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadShare', () => {
  it('reads text and files of a share from the cache', async () => {
    await putShare(ID, {
      title: 'Boarding pass',
      text: 'Zie bijlage',
      files: [
        { name: 'ticket.pdf', type: 'application/pdf', body: '%PDF-1.4' },
        { name: 'strand foto.jpg', type: 'image/jpeg', body: 'jpegdata' },
      ],
    })

    const share = await loadShare({ id: ID })

    expect(share).toMatchObject({ id: ID, title: 'Boarding pass', text: 'Zie bijlage', url: '' })
    expect(share.files).toHaveLength(2)
    expect(share.files[0]).toBeInstanceOf(File)
    expect(share.files[0].name).toBe('ticket.pdf')
    expect(share.files[0].type).toBe('application/pdf')
    expect(share.files[1].name).toBe('strand foto.jpg')
    // jsdom's File heeft geen text(); de grootte bewijst dat de inhoud meekwam.
    expect(share.files[1].size).toBe('jpegdata'.length)
  })

  it('returns null for an unknown or malformed id', async () => {
    expect(await loadShare({ id: ID })).toBeNull()
    expect(await loadShare({ id: '../meta' })).toBeNull()
  })

  it('drops and clears a share older than a day', async () => {
    await putShare(ID, { createdAt: Date.now() - SHARE_MAX_AGE_MS - 1000, text: 'oud' })

    expect(await loadShare({ id: ID })).toBeNull()
    expect(await keys()).toEqual([])
  })

  it('falls back to a GET share from the query string', async () => {
    const share = await loadShare({ title: 'Mooi hotel', text: 'Kijk eens', url: 'https://example.com/hotel' })

    expect(share).toEqual({ id: null, title: 'Mooi hotel', text: 'Kijk eens', url: 'https://example.com/hotel', files: [] })
  })

  it('returns null when the query holds nothing to share', async () => {
    expect(await loadShare({})).toBeNull()
  })

  it('handles a missing Cache API', async () => {
    vi.stubGlobal('caches', undefined)
    expect(await loadShare({ id: ID })).toBeNull()
    await expect(clearShare(ID)).resolves.toBeUndefined()
  })
})

describe('clearShare / purgeExpiredShares', () => {
  it('removes only the given share', async () => {
    await putShare(ID, { files: [{ name: 'a.jpg', type: 'image/jpeg', body: 'a' }] })
    await putShare(OTHER, { text: 'blijft' })

    await clearShare(ID)

    expect(await keys()).toEqual([`/share-inbox/${OTHER}/meta`])
  })

  it('purges expired shares and orphaned files, but keeps fresh ones and the open share', async () => {
    const now = Date.now()
    const fresh = '11111111-1111-4111-8111-111111111111'
    await putShare(ID, { createdAt: now - SHARE_MAX_AGE_MS - 1, files: [{ name: 'a.jpg', type: 'image/jpeg', body: 'a' }] })
    await putShare(OTHER, { createdAt: now - SHARE_MAX_AGE_MS - 1 })
    await putShare(fresh, { createdAt: now - 1000 })
    // Bestand zonder meta: een afgebroken opslag in de service worker.
    const cache = await cachesMock.open(SHARE_CACHE)
    await cache.put('/share-inbox/22222222-2222-4222-8222-222222222222/0', { body: 'x' })

    await purgeExpiredShares({ now, keepId: OTHER })

    expect((await keys()).sort()).toEqual([`/share-inbox/${fresh}/meta`, `/share-inbox/${OTHER}/meta`].sort())
  })
})

describe('shareText', () => {
  it('joins title, text and url without duplicates', () => {
    expect(shareText({ title: 'Hotel', text: 'Kijk https://x.nl', url: 'https://x.nl' })).toBe('Hotel\nKijk https://x.nl')
    expect(shareText({ title: '', text: '', url: 'https://x.nl' })).toBe('https://x.nl')
    expect(shareText(null)).toBe('')
  })
})

describe('fileKind', () => {
  it('classifies shared files', () => {
    expect(fileKind({ type: 'image/png', name: 'a.png' })).toBe('image')
    expect(fileKind({ type: 'image/heic', name: 'a.heic' })).toBe('other')
    expect(fileKind({ type: 'video/mp4', name: 'a.mp4' })).toBe('video')
    expect(fileKind({ type: '', name: 'Ticket.PDF' })).toBe('pdf')
    expect(fileKind({ type: 'text/plain', name: 'mail.txt' })).toBe('text')
  })
})
