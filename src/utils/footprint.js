// CO₂-voetafdruk: altijd als schatting tonen, zonder schijnprecisie.
import { localeTag } from '@/i18n'

/** Afronden zoals in de UI: op 1 kg onder 100 kg, daarboven op 10 kg. */
export function roundCo2(kg) {
  const n = Math.max(0, Number(kg) || 0)
  return n < 100 ? Math.round(n) : Math.round(n / 10) * 10
}

/** "± 240 kg" (de eenheid CO₂e staat in de context). Onder 1 kg: "< 1 kg". */
export function formatCo2(kg) {
  const n = Math.max(0, Number(kg) || 0)
  if (n > 0 && n < 0.5) return '< 1 kg'
  return `± ${roundCo2(n).toLocaleString(localeTag())} kg`
}

/**
 * Verschil met een alternatief in procent (positief = minder dan het alternatief).
 * Null wanneer er niets te vergelijken valt.
 */
export function savingPercent(totalKg, alternativeKg) {
  const total = Number(totalKg) || 0
  const alt = Number(alternativeKg) || 0
  if (alt <= 0) return null
  return Math.round(((alt - total) / alt) * 100)
}

/**
 * Eén zin voor de recap en het fotoboek: "Je reis stootte ~240 kg CO₂ uit, 35% minder dan met de auto."
 * Leeg zonder schatting; het verschil met de auto alleen vanaf 5%.
 */
export function footprintSentence(t, footprintKg, footprintCarKg) {
  if (footprintKg == null) return ''
  const kg = `${roundCo2(footprintKg).toLocaleString(localeTag())} kg`
  const line = t('footprint.recap', { kg })
  const pct = savingPercent(footprintKg, footprintCarKg)
  if (pct === null || Math.abs(pct) < 5) return `${line}.`
  return `${line}, ${pct > 0 ? t('footprint.recapLess', { pct }) : t('footprint.recapMore', { pct: -pct })}.`
}
