import http from './http'

/** Zoekt tegelijk in reizigers, publieke reizen en landen. Minstens 2 tekens. */
export async function search(q, take = 6) {
  const { data } = await http.get('/search', { params: { q, take } })
  return data // { users, trips, countries }
}

/** Tabbladen van de zoekpagina, in dezelfde volgorde als de API ze kent. */
export const SEARCH_TYPES = ['all', 'posts', 'trips', 'places', 'users', 'journal']

/**
 * Volledige zoekfunctie (FTS5) met cursor-paginering.
 * @returns {Promise<{ items: Array<{ kind, id, title, snippet, imageUrl, subtitle, link }>, nextCursor: string|null, didYouMean: string|null }>}
 *   `snippet` bevat de gevonden termen tussen `[[` en `]]` (zie utils/searchHighlight).
 */
export async function searchFull(q, type = 'all', cursor = null, take = 20) {
  const params = { q, type, take }
  if (cursor) params.cursor = cursor
  const { data } = await http.get('/search/full', { params })
  return data
}
