// Landen zoals gebruikers ze typen (Nederlands) → vlag-emoji en Engelse naam (voor de GeoJSON-wereldkaart).

const COUNTRIES = {
  'Argentinië': ['🇦🇷', 'Argentina'],
  'Australië': ['🇦🇺', 'Australia'],
  'België': ['🇧🇪', 'Belgium'],
  'Brazilië': ['🇧🇷', 'Brazil'],
  'Cambodja': ['🇰🇭', 'Cambodia'],
  'Canada': ['🇨🇦', 'Canada'],
  'Chili': ['🇨🇱', 'Chile'],
  'China': ['🇨🇳', 'China'],
  'Colombia': ['🇨🇴', 'Colombia'],
  'Costa Rica': ['🇨🇷', 'Costa Rica'],
  'Cuba': ['🇨🇺', 'Cuba'],
  'Denemarken': ['🇩🇰', 'Denmark'],
  'Duitsland': ['🇩🇪', 'Germany'],
  'Egypte': ['🇪🇬', 'Egypt'],
  'Engeland': ['🇬🇧', 'United Kingdom'],
  'Filipijnen': ['🇵🇭', 'Philippines'],
  'Finland': ['🇫🇮', 'Finland'],
  'Frankrijk': ['🇫🇷', 'France'],
  'Georgië': ['🇬🇪', 'Georgia'],
  'Griekenland': ['🇬🇷', 'Greece'],
  'Hongarije': ['🇭🇺', 'Hungary'],
  'IJsland': ['🇮🇸', 'Iceland'],
  'India': ['🇮🇳', 'India'],
  'Indonesië': ['🇮🇩', 'Indonesia'],
  'Ierland': ['🇮🇪', 'Ireland'],
  'Israël': ['🇮🇱', 'Israel'],
  'Italië': ['🇮🇹', 'Italy'],
  'Japan': ['🇯🇵', 'Japan'],
  'Jordanië': ['🇯🇴', 'Jordan'],
  'Kroatië': ['🇭🇷', 'Croatia'],
  'Maleisië': ['🇲🇾', 'Malaysia'],
  'Marokko': ['🇲🇦', 'Morocco'],
  'Mexico': ['🇲🇽', 'Mexico'],
  'Nederland': ['🇳🇱', 'Netherlands'],
  'Nieuw-Zeeland': ['🇳🇿', 'New Zealand'],
  'Noorwegen': ['🇳🇴', 'Norway'],
  'Oostenrijk': ['🇦🇹', 'Austria'],
  'Peru': ['🇵🇪', 'Peru'],
  'Polen': ['🇵🇱', 'Poland'],
  'Portugal': ['🇵🇹', 'Portugal'],
  'Schotland': ['🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'United Kingdom'],
  'Singapore': ['🇸🇬', 'Singapore'],
  'Slovenië': ['🇸🇮', 'Slovenia'],
  'Spanje': ['🇪🇸', 'Spain'],
  'Thailand': ['🇹🇭', 'Thailand'],
  'Tsjechië': ['🇨🇿', 'Czech Republic'],
  'Turkije': ['🇹🇷', 'Turkey'],
  'Verenigd Koninkrijk': ['🇬🇧', 'United Kingdom'],
  'Verenigde Arabische Emiraten': ['🇦🇪', 'United Arab Emirates'],
  'Verenigde Staten': ['🇺🇸', 'United States of America'],
  'Vietnam': ['🇻🇳', 'Vietnam'],
  'Wales': ['🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'United Kingdom'],
  'Zuid-Afrika': ['🇿🇦', 'South Africa'],
  'Zuid-Korea': ['🇰🇷', 'South Korea'],
  'Zweden': ['🇸🇪', 'Sweden'],
  'Zwitserland': ['🇨🇭', 'Switzerland'],
}

const lookup = new Map(Object.entries(COUNTRIES).map(([nl, v]) => [nl.toLowerCase(), v]))

/** Splitst "Thailand, Vietnam" in afzonderlijke landen. */
export function splitCountries(value) {
  return String(value || '')
    .split(/[,/&]| en /)
    .map((c) => c.trim())
    .filter(Boolean)
}

let flagSupport = null

/**
 * Windows tekent vlag-emoji als twee letters ("SI"). We tekenen er één op een canvas en kijken
 * of er gekleurde pixels verschijnen; zo niet, dan laten we vlaggen weg.
 */
export function supportsFlagEmoji() {
  if (flagSupport !== null) return flagSupport
  flagSupport = false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 20
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return flagSupport
    ctx.font = '16px sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText('🇧🇪', 0, 0)
    const data = ctx.getImageData(0, 0, 20, 20).data
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
      if (a > 0 && (Math.abs(r - g) > 40 || Math.abs(g - b) > 40 || Math.abs(r - b) > 40)) {
        flagSupport = true
        break
      }
    }
  } catch {
    flagSupport = false
  }
  return flagSupport
}

/** Vlag-emoji voor het (eerste) land, of '' als het land onbekend is of het systeem geen vlaggen kan tekenen. */
export function flagFor(country) {
  if (typeof document !== 'undefined' && !supportsFlagEmoji()) return ''
  const first = splitCountries(country)[0]
  return (first && lookup.get(first.toLowerCase())?.[0]) || ''
}

export function englishNameFor(country) {
  return lookup.get(String(country || '').trim().toLowerCase())?.[1] || null
}

// Omgekeerde richting (Engelse GeoJSON-naam → Nederlandse naam zoals in Trip.Country). Bij meerdere Nederlandse
// namen voor één Engelse naam (Engeland/Schotland/Wales) kiezen we het land zelf.
const PREFERRED_DUTCH = { 'United Kingdom': 'Verenigd Koninkrijk' }
const reverseLookup = new Map()
for (const [nl, [, en]] of Object.entries(COUNTRIES)) {
  if (!reverseLookup.has(en.toLowerCase())) reverseLookup.set(en.toLowerCase(), PREFERRED_DUTCH[en] || nl)
}

/** Nederlandse naam voor een Engelse landnaam; onbekende landen behouden hun Engelse naam. */
export function dutchNameFor(englishName) {
  const name = String(englishName || '').trim()
  return reverseLookup.get(name.toLowerCase()) || name
}

/** Alle bekende landen (Nederlandse namen), alfabetisch; voor keuzelijsten. */
export function countryNames() {
  return Object.keys(COUNTRIES).filter((n) => !['Engeland', 'Schotland', 'Wales'].includes(n))
}

/** Volgende markering bij klikken op de wereldkaart: geen → bezocht → verlanglijst → geen. */
export function nextCountryStatus(status) {
  if (status === 'visited') return 'wishlist'
  if (status === 'wishlist') return null
  return 'visited'
}
