import { describe, expect, it } from 'vitest'
import { MAX_SHARE_FILES, SHARE_MAX_AGE_MS, clearShare, loadShare, purgeExpiredShares, stashShare } from './shareInbox'

// Shares uit de native app (geen service worker): in het geheugen, opgehaald via dezelfde /share?id=…-route.
describe('shareInbox (native app)', () => {
  const photo = () => new File(['x'], 'photo.jpg', { type: 'image/jpeg' })

  it('stashes a share and loads it by id', async () => {
    const id = stashShare({ title: 'T', text: 'Tekst', url: 'https://example.com', files: [photo()] })
    expect(id).toMatch(/^[0-9a-f-]{36}$/i)

    const share = await loadShare({ id })
    expect(share).toMatchObject({ id, title: 'T', text: 'Tekst', url: 'https://example.com' })
    expect(share.files).toHaveLength(1)
    expect(share.files[0].name).toBe('photo.jpg')

    await clearShare(id)
    expect(await loadShare({ id })).toBeNull()
  })

  it('limits files and text like the service worker', async () => {
    const files = Array.from({ length: MAX_SHARE_FILES + 3 }, photo)
    const id = stashShare({ text: 'a'.repeat(6000), files })
    const share = await loadShare({ id })
    expect(share.files).toHaveLength(MAX_SHARE_FILES)
    expect(share.text).toHaveLength(5000)
    await clearShare(id)
  })

  it('expires stashed shares after a day', async () => {
    const old = stashShare({ text: 'oud' }, Date.now() - SHARE_MAX_AGE_MS - 1)
    const kept = stashShare({ text: 'oud maar open' }, Date.now() - SHARE_MAX_AGE_MS - 1)
    const fresh = stashShare({ text: 'nieuw' })

    await purgeExpiredShares({ keepId: kept })
    expect(await loadShare({ id: fresh })).not.toBeNull()
    // Blijft bij het opruimen staan (open pagina), maar laden geeft een verlopen share niet meer terug.
    expect(await loadShare({ id: kept })).toBeNull()
    expect(await loadShare({ id: old })).toBeNull()
    await clearShare(fresh)
  })
})
