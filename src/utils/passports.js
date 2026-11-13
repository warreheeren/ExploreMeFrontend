// Paspoortlanden (nationaliteit) voor de visumregels. De backend accepteert alleen ISO-2-codes uit CountryFacts.json;
// deze lijst volgt dat bestand (bij een nieuw land daar ook hier toevoegen). Namen komen uit Intl.DisplayNames, zodat
// ze in de taal van de app staan zonder extra vertalingen.

export const MAX_PASSPORTS = 3

export const PASSPORT_COUNTRY_CODES = Object.freeze([
  'AD', 'AE', 'AL', 'AR', 'AT', 'AU', 'AW', 'BA', 'BE', 'BG', 'BO', 'BQ', 'BR', 'BT', 'BW', 'BZ', 'CA', 'CH', 'CL', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CY', 'CZ', 'DE', 'DK', 'DO', 'EC', 'EE', 'EG', 'ES', 'ET', 'FI', 'FJ', 'FO', 'FR', 'GB',
  'GE', 'GH', 'GL', 'GR', 'GT', 'GY', 'HK', 'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IS', 'IT', 'JM', 'JO', 'JP', 'KE', 'KG',
  'KH', 'KR', 'LA', 'LI', 'LK', 'LT', 'LU', 'LV', 'MA', 'MC', 'ME', 'MG', 'MK', 'MM', 'MN', 'MT', 'MU', 'MV', 'MX', 'MY',
  'NA', 'NL', 'NO', 'NP', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PH', 'PL', 'PT', 'PY', 'QA', 'RO', 'RS', 'RW', 'SE', 'SG', 'SI',
  'SK', 'SM', 'SN', 'SR', 'TH', 'TN', 'TO', 'TR', 'TW', 'TZ', 'UG', 'US', 'UY', 'UZ', 'VE', 'VN', 'WS', 'ZA',
])

const displayNamesCache = new Map()

function displayNames(locale) {
  if (!displayNamesCache.has(locale)) {
    let names = null
    try {
      names = new Intl.DisplayNames([locale], { type: 'region' })
    } catch {
      names = null // Oude browsers: we tonen dan de code.
    }
    displayNamesCache.set(locale, names)
  }
  return displayNamesCache.get(locale)
}

/** Landnaam in de gegeven taal ("NL", "nl-NL" → "Nederland"); de code zelf als de browser het niet weet. */
export function regionName(code, locale) {
  const value = String(code || '').toUpperCase()
  if (!value) return ''
  try {
    return displayNames(locale)?.of(value) || value
  } catch {
    return value
  }
}

// Kleurcode van een inreisregel als reisadviesniveau, zodat de kleuren uit utils/advisory.js hergebruikt worden:
// groen (eigen land/visumvrij), geel (visum bij aankomst/eVisa/ETA), rood (visum vereist/geen toegang).
const VISA_TONES = {
  own_country: 'normal',
  visa_free: 'normal',
  visa_on_arrival: 'caution',
  e_visa: 'caution',
  eta: 'caution',
  visa_required: 'avoidAll',
  no_admission: 'avoidAll',
}

/** Reisadviesniveau voor de kleur van een inreisregel; null voor een onbekende (toekomstige) waarde. */
export function visaTone(requirement) {
  return VISA_TONES[requirement] || null
}

/** Alle keuzes als { code, name }, alfabetisch op naam in de taal van de app. */
export function passportOptions(locale) {
  const collator = new Intl.Collator(locale)
  return PASSPORT_COUNTRY_CODES
    .map((code) => ({ code, name: regionName(code, locale) }))
    .sort((a, b) => collator.compare(a.name, b.name))
}
