import { escapeHtml } from './html'

// Markers rond gevonden termen in snippets van GET /api/search/full (zie FullSearchHitDto).
const MARKED = /\[\[(.+?)\]\]/g
const MARKERS = /\[\[|\]\]/g

/**
 * Zet een snippet om naar veilige HTML: eerst alles escapen (de tekst is ruwe gebruikersinvoer),
 * pas daarna de markers `[[…]]` vervangen door `<mark>…</mark>`. Na het escapen bevat de tekst geen
 * `<`, `>`, `"` of `'` meer, dus wat tussen de markers staat kan geen HTML of attribuut worden.
 */
export function highlightSnippet(snippet) {
  if (!snippet) return ''
  return escapeHtml(String(snippet)).replace(MARKED, '<mark>$1</mark>')
}

/** Snippet zonder markers, bv. voor een aria-label of een `title`. */
export function plainSnippet(snippet) {
  return snippet ? String(snippet).replace(MARKERS, '') : ''
}
