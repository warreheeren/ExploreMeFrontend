// IBAN-validatie voor de betaalgegevens (betaal-QR). Zelfde regels als de backend (IbanValidator.cs):
// normaliseren, landcode + lengte per SEPA-land en de ISO 13616 mod-97-controle.

/** IBAN-lengte per land van de SEPA-zone. */
const LENGTH_BY_COUNTRY = {
  AD: 24, AL: 28, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24,
  DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23,
  GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20,
  LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MT: 31, NL: 18,
  NO: 15, PL: 28, PT: 25, RO: 24, RS: 22, SE: 24, SI: 19, SK: 24,
  SM: 27, VA: 22,
}

const SHAPE = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/

/** Spaties (ook niet-afbreekbare) en streepjes weg, hoofdletters. */
export function normalizeIban(value) {
  return String(value ?? '').replace(/[\s-]+/g, '').toUpperCase()
}

/** Mod-97 stapsgewijs (het getal is te groot voor een Number); letters tellen als 10–35. */
function mod97(rearranged) {
  let remainder = 0
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0)
    const digit = code >= 65 ? code - 55 : code - 48
    remainder = digit >= 10 ? (remainder * 100 + digit) % 97 : (remainder * 10 + digit) % 97
  }
  return remainder
}

/** True als de waarde een geldig SEPA-IBAN is (spaties en kleine letters mogen). */
export function isValidIban(value) {
  const iban = normalizeIban(value)
  if (!SHAPE.test(iban)) return false
  if (LENGTH_BY_COUNTRY[iban.slice(0, 2)] !== iban.length) return false
  return mod97(iban.slice(4) + iban.slice(0, 4)) === 1
}

/** Leesbare notatie in groepjes van 4: "NL91 ABNA 0417 1643 00". */
export function formatIban(value) {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ')
}
