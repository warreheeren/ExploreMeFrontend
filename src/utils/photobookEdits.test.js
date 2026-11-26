import { describe, expect, it } from 'vitest'
import { addPhoto, arrangeDayPhotos, emptyOverrides, excludePhoto, hasOverrides, movePhoto, normalizeOverrides, setCaption, setPage, setPinned, swapPhoto } from './photobookEdits'

const DAY = '2026-07-03'
const photo = (id, extra = {}) => ({ id, caption: `album ${id}`, stopName: 'Alfama', ...extra })

describe('normalizeOverrides', () => {
  it('vult ontbrekende velden aan en houdt de bedragenpagina standaard uit', () => {
    expect(normalizeOverrides(null)).toEqual(emptyOverrides())
    expect(normalizeOverrides({ pinned: ['a'], pages: { facts: true } })).toEqual({ ...emptyOverrides(), pinned: ['a'], pages: { crew: true, decisions: true, facts: true } })
  })
})

describe('arrangeDayPhotos', () => {
  it('volgt de bewaarde volgorde en zet nieuwe foto\'s erachter', () => {
    const chosen = [photo('a'), photo('b'), photo('c'), photo('d')]
    expect(arrangeDayPhotos(chosen, ['c', 'a']).map((p) => p.id)).toEqual(['c', 'a', 'b', 'd'])
    // Een id dat niet meer gekozen is wordt genegeerd.
    expect(arrangeDayPhotos(chosen, ['x', 'd']).map((p) => p.id)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('vervangt het bijschrift door dat van het boek, ook als dat leeg is', () => {
    const [a, b, c] = arrangeDayPhotos([photo('a'), photo('b'), photo('c')], [], { a: 'Uitzicht', b: '' })
    expect([a.caption, a.stopName]).toEqual(['Uitzicht', 'Alfama'])
    expect([b.caption, b.stopName]).toEqual(['', null])          // bewust leeg: ook geen stopnaam als terugval
    expect([c.caption, c.stopName]).toEqual(['album c', 'Alfama'])
  })
})

describe('aanpassen', () => {
  it('uit het boek halen maakt een vastgezette foto los', () => {
    const result = excludePhoto({ ...emptyOverrides(), pinned: ['a', 'b'] }, 'a')
    expect(result.excluded).toEqual(['a'])
    expect(result.pinned).toEqual(['b'])
  })

  it('vastzetten haalt een uitsluiting weg en is idempotent', () => {
    const pinned = setPinned({ ...emptyOverrides(), excluded: ['a'] }, 'a', true)
    expect(pinned).toMatchObject({ pinned: ['a'], excluded: [] })
    expect(setPinned(pinned, 'a', true).pinned).toEqual(['a'])
    expect(setPinned(pinned, 'a', false).pinned).toEqual([])
  })

  it('wisselen zet de nieuwe foto vast op de plek van de oude', () => {
    const result = swapPhoto(emptyOverrides(), DAY, ['a', 'b', 'c'], 'b', 'x')
    expect(result.excluded).toEqual(['b'])
    expect(result.pinned).toEqual(['x'])
    expect(result.order[DAY]).toEqual(['a', 'x', 'c'])
  })

  it('toevoegen zet de foto vast achteraan de dag, ook als hij eerder uitgesloten was', () => {
    const result = addPhoto({ ...emptyOverrides(), excluded: ['x'] }, DAY, ['a', 'b'], 'x')
    expect(result).toMatchObject({ excluded: [], pinned: ['x'] })
    expect(result.order[DAY]).toEqual(['a', 'b', 'x'])
  })

  it('verplaatst een foto één plek en doet niets aan de rand', () => {
    expect(movePhoto(emptyOverrides(), DAY, ['a', 'b', 'c'], 'c', -1).order[DAY]).toEqual(['a', 'c', 'b'])
    expect(movePhoto(emptyOverrides(), DAY, ['a', 'b', 'c'], 'a', 1).order[DAY]).toEqual(['b', 'a', 'c'])
    const base = emptyOverrides()
    expect(movePhoto(base, DAY, ['a', 'b'], 'a', -1)).toBe(base)
    expect(movePhoto(base, DAY, ['a', 'b'], 'b', 1)).toBe(base)
    expect(movePhoto(base, DAY, ['a', 'b'], 'x', 1)).toBe(base)
  })

  it('bewaart een bijschrift, ook een leeg, en kan terug naar het album', () => {
    const withText = setCaption(emptyOverrides(), 'a', '  Tram 28  ')
    expect(withText.captions).toEqual({ a: 'Tram 28' })
    expect(setCaption(withText, 'a', '').captions).toEqual({ a: '' })
    expect(setCaption(withText, 'a', null).captions).toEqual({})
  })

  it('wijzigt het oorspronkelijke object niet', () => {
    const base = emptyOverrides()
    swapPhoto(base, DAY, ['a'], 'a', 'b')
    setCaption(base, 'a', 'x')
    expect(base).toEqual(emptyOverrides())
  })

  it('zet een groepspagina aan of uit zonder de rest te raken', () => {
    const before = setPinned(emptyOverrides(), 'a', true)
    const after = setPage(before, 'facts', true)
    expect(after.pages).toEqual({ crew: true, decisions: true, facts: true })
    expect(after.pinned).toEqual(['a'])
    expect(before.pages.facts).toBe(false)
  })

  it('weet of er iets aangepast is (de pagina-schakelaars tellen niet mee)', () => {
    expect(hasOverrides(emptyOverrides())).toBe(false)
    expect(hasOverrides({ ...emptyOverrides(), pages: { crew: false, decisions: true, facts: true } })).toBe(false)
    expect(hasOverrides(setCaption(emptyOverrides(), 'a', ''))).toBe(true)
  })
})
