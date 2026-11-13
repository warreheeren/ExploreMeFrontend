// @vermeldingen — dezelfde regels als de backend (MentionParser.cs):
// een '@' die niet midden in een woord of e-mailadres staat, gevolgd door 3–30 tekens [a-zA-Z0-9._-].

const MENTION_RE = /(^|[^\w.@])@([a-zA-Z0-9._-]{3,30})/g

/** Splitst tekst in stukken: { type: 'text' | 'mention', value }. */
export function splitMentions(text) {
  const source = String(text ?? '')
  const parts = []
  let last = 0

  for (const match of source.matchAll(MENTION_RE)) {
    const atIndex = match.index + match[1].length
    const name = match[2].replace(/[._-]+$/, '')
    if (name.length < 3) continue

    if (atIndex > last) parts.push({ type: 'text', value: source.slice(last, atIndex) })
    parts.push({ type: 'mention', value: name })
    last = atIndex + 1 + name.length
  }

  if (last < source.length) parts.push({ type: 'text', value: source.slice(last) })
  return parts
}

export function extractMentions(text) {
  const seen = new Set()
  return splitMentions(text)
    .filter((p) => p.type === 'mention')
    .map((p) => p.value)
    .filter((name) => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/**
 * Geeft de gedeeltelijke gebruikersnaam terug die de gebruiker aan het typen is
 * (tekst vóór de cursor eindigt op "@abc"), of null.
 */
export function activeMentionQuery(textBeforeCaret) {
  const m = /(^|\s)@([a-zA-Z0-9._-]{0,30})$/.exec(String(textBeforeCaret ?? ''))
  return m ? m[2] : null
}
