// Goedkope taalgok op basis van stopwoorden, om te beslissen of we een "Vertaal"-knop tonen.
// De AI bevestigt achteraf; een foute gok kost hooguit een "al in jouw taal".

const STOPWORDS = {
  nl: new Set(['de', 'het', 'een', 'en', 'niet', 'ik', 'je', 'van', 'dat']),
  en: new Set(['the', 'and', 'is', 'you', 'of', 'to', 'it', 'that']),
}

/** Zonder @mentions, #hashtags en URL's: die zeggen niets over de taal. */
function words(text) {
  return (text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#][\p{L}\p{N}._-]+/gu, ' ')
    .split(/[^\p{L}']+/u)
    .filter(Boolean)
}

/** { nl, en }: aantal herkende stopwoorden per taal. */
export function stopwordCounts(text) {
  const counts = { nl: 0, en: 0 }
  for (const w of words(text)) {
    if (STOPWORDS.nl.has(w)) counts.nl++
    if (STOPWORDS.en.has(w)) counts.en++
  }
  return counts
}

/** 'nl' | 'en' wanneer een van beide duidelijk wint, anders null. */
export function guessLanguage(text) {
  const { nl, en } = stopwordCounts(text)
  if (nl >= 2 && nl >= en * 2) return 'nl'
  if (en >= 2 && en >= nl * 2) return 'en'
  return null
}

/**
 * Toon de vertaalknop wanneer de andere taal duidelijk wint, of wanneer geen van beide herkend wordt
 * en de tekst lang genoeg is (dan is het misschien Frans, Duits …).
 */
export function shouldOfferTranslation(text, uiLocale) {
  const clean = (text || '').trim()
  if (!clean) return false
  const ui = uiLocale === 'en' ? 'en' : 'nl'
  const other = ui === 'en' ? 'nl' : 'en'
  const counts = stopwordCounts(clean)
  if (counts[other] >= 2 && counts[other] >= counts[ui] * 2) return true
  return counts.nl === 0 && counts.en === 0 && clean.length > 20
}

/** "fr" → "Frans" / "French" in de UI-taal; onbekend → de code zelf. */
export function languageName(code, uiLocale) {
  if (!code || code === 'und') return ''
  try {
    return new Intl.DisplayNames([uiLocale], { type: 'language' }).of(code) || code
  } catch {
    return code
  }
}
