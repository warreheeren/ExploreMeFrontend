// Toestemming voor cookies/lokale opslag en externe inhoud: pure helpers (zonder Pinia), zodat de store,
// de analytics-loader en de e2e-fixtures dezelfde sleutel en versie gebruiken.

/** Verhoog bij een inhoudelijke wijziging van de categorieën of diensten: iedereen krijgt de banner dan opnieuw. */
export const CONSENT_VERSION = 1

/** localStorage-sleutel van de keuze; staat zelf onder "noodzakelijk". */
export const CONSENT_STORAGE_KEY = 'consent.v1'

/** `necessary` staat altijd aan; de andere twee zijn opt-in. */
export const CONSENT_CATEGORIES = ['necessary', 'functional', 'analytics']
export const OPTIONAL_CATEGORIES = ['functional', 'analytics']

/** Nieuwe keuze met versie en tijdstip (ISO, UTC). */
export function createConsent({ functional = false, analytics = false } = {}, now = new Date()) {
  return {
    version: CONSENT_VERSION,
    decidedAt: now.toISOString(),
    functional: functional === true,
    analytics: analytics === true,
  }
}

/**
 * Leest de opgeslagen keuze. Geeft null bij geen, kapotte of verouderde keuze (andere versie),
 * of wanneer storage geblokkeerd is: dan wordt er (opnieuw) gevraagd.
 */
export function readConsent(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version !== CONSENT_VERSION || typeof parsed.decidedAt !== 'string') return null
    if (Number.isNaN(Date.parse(parsed.decidedAt))) return null
    return {
      version: CONSENT_VERSION,
      decidedAt: parsed.decidedAt,
      functional: parsed.functional === true,
      analytics: parsed.analytics === true,
    }
  } catch {
    return null
  }
}

/** Bewaart de keuze; zonder storage (privévenster, geblokkeerd) geldt ze alleen voor deze sessie. */
export function writeConsent(record, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

/** Banner verbergen op pagina's die in een iframe of als afdruk bedoeld zijn. */
export function isConsentExemptLayout(layout) {
  return layout === 'embed' || layout === 'print'
}
