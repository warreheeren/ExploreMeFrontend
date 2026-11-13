// Haalt bedrag, datum en munt uit de (rommelige) OCR-tekst van een kasticket.
// Puur en zonder afhankelijkheden, zodat het los van tesseract getest kan worden.

/** Regels met het eindtotaal, in volgorde van voorkeur (nl, en, de, fr, es). */
const TOTAL_KEYWORDS = /(te\s*betalen|totaal|total(?:e|en)?|amount\s*due|balance\s*due|to\s*pay|summe|gesamt|betrag|montant|importe|bedrag)/i
const SUBTOTAL = /(sub\s*-?\s*tota|zwischensumme|sous[-\s]?total)/i

const CURRENCY_CODES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CNY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'AUD', 'CAD', 'NZD', 'THB', 'TRY', 'MAD', 'ISK', 'MXN', 'IDR', 'VND', 'INR', 'ZAR', 'BRL']
const CODE_PATTERN = new RegExp(`\\b(${CURRENCY_CODES.join('|')})\\b`, 'g')

/** Symbolen en lokale afkortingen → ISO-code (codes in de tekst gaan voor). */
const SYMBOLS = [
  [/€/g, 'EUR'],
  [/£/g, 'GBP'],
  [/US\$|\$/g, 'USD'],
  [/[¥円]/g, 'JPY'],
  [/元|RMB/g, 'CNY'],
  [/zł/gi, 'PLN'],
  [/Kč/g, 'CZK'],
  [/฿/g, 'THB'],
  [/₺/g, 'TRY'],
  [/₹/g, 'INR'],
  [/\bFr\.|\bSFr/g, 'CHF'],
]

// Bedragen als 12,50 · 1.234,56 · 1,234.56 · 1 234,56 · 1200
const AMOUNT_PATTERN = /\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}|\d+/g

/**
 * Zet een bedrag-string om naar een getal. Het laatste scheidingsteken is het decimaalteken als er
 * 1–2 cijfers op volgen; gevolgd door precies 3 cijfers is het een duizendtal-scheiding.
 */
export function parseAmount(raw) {
  if (raw == null) return null
  const s = String(raw).replace(/\s/g, '')
  if (!/\d/.test(s)) return null
  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  if (lastSep === -1) return Number(s)
  const decimals = s.length - lastSep - 1
  if (decimals === 3) return Number(s.replace(/[.,]/g, ''))
  const intPart = s.slice(0, lastSep).replace(/[.,]/g, '')
  const value = Number(`${intPart}.${s.slice(lastSep + 1)}`)
  return Number.isFinite(value) ? value : null
}

function amountsIn(line) {
  return (line.match(AMOUNT_PATTERN) || []).map(parseAmount).filter((n) => n != null && n > 0 && n < 1e7)
}

/** Totaal: laatste bedrag op een totaal-regel (niet het subtotaal), anders het grootste bedrag met decimalen. */
export function findTotal(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (!TOTAL_KEYWORDS.test(line) || SUBTOTAL.test(line)) continue
    const here = amountsIn(line)
    if (here.length) return here[here.length - 1]
    const next = lines[i + 1] ? amountsIn(lines[i + 1]) : []
    if (next.length) return next[next.length - 1]
  }
  const decimals = lines.flatMap((l) => (l.match(/\d+[.,]\d{2}(?!\d)/g) || []).map(parseAmount)).filter((n) => n > 0)
  return decimals.length ? Math.max(...decimals) : null
}

/** Eerste geldige datum als 'YYYY-MM-DD' (dag-maand-jaar, tenzij dat onmogelijk is, of ISO). */
export function findDate(text) {
  const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(text)
  if (iso) {
    const d = toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    if (d) return d
  }
  const re = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/g
  let m
  while ((m = re.exec(text))) {
    let [a, b] = [Number(m[1]), Number(m[2])]
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    // Dag-eerst (Europees), behalve wanneer alleen maand-eerst klopt (VS-tickets).
    if (b > 12 && a <= 12) [a, b] = [b, a]
    const d = toIsoDate(year, b, a)
    if (d) return d
  }
  return null
}

function toIsoDate(y, mo, d) {
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (date.getUTCMonth() !== mo - 1) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${y}-${pad(mo)}-${pad(d)}`
}

/** Meest voorkomende munt: ISO-codes eerst, anders symbolen. */
export function findCurrency(text) {
  const counts = {}
  for (const m of text.matchAll(CODE_PATTERN)) counts[m[1]] = (counts[m[1]] || 0) + 1
  if (!Object.keys(counts).length) {
    for (const [re, code] of SYMBOLS) {
      const n = (text.match(re) || []).length
      if (n) counts[code] = (counts[code] || 0) + n
    }
  }
  const best = Object.entries(counts).sort((x, y) => y[1] - x[1])[0]
  return best ? best[0] : null
}

/**
 * Regels die geen artikel zijn: totalen, btw, betaalwijze, wisselgeld en kortingen (nl, en, fr, de).
 * Bewust ruim: een gemist artikel vul je zelf aan, een "Totaal" als item zou de verdeling verpesten.
 */
const NON_ITEM = /(tota|te\s*betalen|bedrag|amount\s*due|balance|to\s*pay|summe|gesamt|betrag|montant|\bnet\b|btw|b\.t\.w|\bvat\b|\btax|\btva\b|mwst|\bust\b|\bpin\b|pinnen|contant|\bcash|change|wisselgeld|retour|terug|rückgeld|rendu|monnaie|esp[eè]ces|\bbar\b|\bcard\b|kaart|carte|karte|visa|mastercard|maestro|bancontact|korting|discount|rabatt|remise|r[ée]duction|fooi|\btip\b|trinkgeld|pourboire|service\s*charge)/i

// Omschrijving, dan een bedrag met precies twee decimalen aan het eind; eventueel gevolgd door een munt of btw-letter.
const ITEM_LINE = /^(.*?)\s*(?:€|EUR|\$|£)?\s*(\d{1,3}(?:[.,\s]\d{3})+[.,]\d{2}|\d+[.,]\d{2})\s*(?:€|EUR|[A-Z]{1,2}|\*)?$/

/** Artikelregels van een kasticket: [{ description, amount }] in de volgorde van het ticket. */
export function parseReceiptLines(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean)
  const items = []
  for (const line of lines) {
    if (NON_ITEM.test(line)) continue
    const m = ITEM_LINE.exec(line)
    if (!m) continue
    const description = m[1].replace(/[\s.:€$£-]+$/, '').replace(/\s+/g, ' ').trim()
    const amount = parseAmount(m[2])
    // Minstens twee letters: anders is het een datum, tijd of losse bedragregel.
    if (!/\p{L}.*\p{L}/u.test(description) || !(amount > 0) || amount >= 1e6) continue
    items.push({ description: description.slice(0, 120), amount })
  }
  return items
}

/** { amount, date, currency } — elk veld null wanneer niet gevonden. */
export function parseReceiptText(text) {
  const clean = String(text || '').replace(/\r/g, '')
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    amount: findTotal(lines),
    date: findDate(clean),
    currency: findCurrency(clean),
  }
}
