// Fotoboek bijschaven: pure functies die de aanpassingen van de groep (overrides) toepassen en wijzigen.
// De vorm volgt de API (PhotobookOverridesDto): { excluded: [id], pinned: [id], order: { 'yyyy-mm-dd': [id] },
// captions: { id: tekst }, pages: { crew, decisions, facts } }. Elke functie geeft een nieuw object terug.

export function emptyOverrides() {
  return { excluded: [], pinned: [], order: {}, captions: {}, pages: { crew: true, decisions: true, facts: false } }
}

/** Vult ontbrekende velden aan, zodat de rest van de code niet op null hoeft te letten. */
export function normalizeOverrides(raw) {
  const base = emptyOverrides()
  return {
    excluded: [...(raw?.excluded || [])],
    pinned: [...(raw?.pinned || [])],
    order: { ...(raw?.order || {}) },
    captions: { ...(raw?.captions || {}) },
    pages: { ...base.pages, ...(raw?.pages || {}) },
  }
}

/**
 * Zet de gekozen foto's van een dag in de bewaarde volgorde en past de bijschriften van het boek toe.
 * Foto's die niet in de volgorde staan (later gekozen) komen erachter, in hun bestaande volgorde.
 * Een bijschrift uit het boek, ook een leeg, vervangt dat van het album; `stopName` vervalt dan als terugval.
 */
export function arrangeDayPhotos(chosen, dayOrder = [], captions = {}) {
  const position = new Map(dayOrder.map((id, i) => [id, i]))
  const sorted = [...chosen].sort((a, b) => (position.has(a.id) ? position.get(a.id) : Infinity) - (position.has(b.id) ? position.get(b.id) : Infinity))
  return sorted.map((p) => (Object.prototype.hasOwnProperty.call(captions, p.id) ? { ...p, caption: captions[p.id], stopName: captions[p.id] ? p.stopName : null, bookCaption: true } : p))
}

const without = (list, id) => list.filter((x) => x !== id)
const withId = (list, id) => (list.includes(id) ? list : [...list, id])

/** Uit het boek halen (de foto blijft in het album); de app vult de plek aan met de volgende beste foto. */
export function excludePhoto(overrides, id) {
  return { ...overrides, excluded: withId(overrides.excluded, id), pinned: without(overrides.pinned, id) }
}

/** Vastzetten of losmaken. Vastzetten haalt een eerdere uitsluiting weg. */
export function setPinned(overrides, id, pinned) {
  return pinned
    ? { ...overrides, pinned: withId(overrides.pinned, id), excluded: without(overrides.excluded, id) }
    : { ...overrides, pinned: without(overrides.pinned, id) }
}

/**
 * Wisselt een foto voor een andere van dezelfde dag: de oude gaat eruit, de nieuwe staat vast en neemt de plek van
 * de oude in de volgorde over. `currentIds` = de foto's van die dag zoals ze nu in het boek staan.
 */
export function swapPhoto(overrides, day, currentIds, oldId, newId) {
  const next = setPinned(excludePhoto(overrides, oldId), newId, true)
  return { ...next, order: { ...next.order, [day]: currentIds.map((id) => (id === oldId ? newId : id)) } }
}

/** Voegt een foto toe aan een dag (achteraan) en zet hem vast. */
export function addPhoto(overrides, day, currentIds, id) {
  const next = setPinned(overrides, id, true)
  return { ...next, order: { ...next.order, [day]: [...currentIds.filter((x) => x !== id), id] } }
}

/** Eén plek eerder (-1) of later (+1) binnen de dag. Aan de rand verandert er niets. */
export function movePhoto(overrides, day, currentIds, id, step) {
  const from = currentIds.indexOf(id)
  const to = from + step
  if (from < 0 || to < 0 || to >= currentIds.length) return overrides
  const ids = [...currentIds]
  ids.splice(to, 0, ...ids.splice(from, 1))
  return { ...overrides, order: { ...overrides.order, [day]: ids } }
}

/** Bijschrift alleen voor het boek. `null` = terug naar het bijschrift van het album; '' = bewust geen tekst. */
export function setCaption(overrides, id, text) {
  const captions = { ...overrides.captions }
  if (text === null) delete captions[id]
  else captions[id] = String(text).trim()
  return { ...overrides, captions }
}

/** Zet een groepspagina (crew, decisions, facts) aan of uit. */
export function setPage(overrides, key, on) {
  return { ...overrides, pages: { ...overrides.pages, [key]: !!on } }
}

/** True als de groep iets aanpaste (dan is "terug naar het voorstel" zinvol). */
export function hasOverrides(overrides) {
  return overrides.excluded.length > 0 || overrides.pinned.length > 0 || Object.keys(overrides.order).length > 0 || Object.keys(overrides.captions).length > 0
}
