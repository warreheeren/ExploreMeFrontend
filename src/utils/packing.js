// Paklijst-suggesties (zie PackingRules in de backend): sleutels en redenen worden hier vertaald.
import { t } from '@/i18n'

/** Alle sleutels die de backend kan voorstellen; elk heeft een label in tripExtras.packing.items. */
export const PACKING_KEYS = [
  'passport', 'travel_adapter', 'warm_layers', 'gloves', 'beanie', 'rain_jacket', 'sunscreen', 'sun_hat',
  'sunglasses', 'water_bottle', 'hiking_boots', 'daypack', 'swimwear', 'beach_towel', 'ski_gear', 'laundry_bag', 'packing_cubes',
]

export const PACKING_REASONS = ['nonSchengen', 'plug', 'cold', 'freezing', 'rain', 'hot', 'keywordHike', 'keywordBeach', 'keywordSki', 'activities', 'manyStays', 'longTrip']

/** Label in de huidige taal (dit wordt ook de tekst van het checklist-item). */
export function packingLabel(key) {
  return t(`tripExtras.packing.items.${key}`)
}

export function packingReason(suggestion) {
  return t(`tripExtras.packing.reasons.${suggestion.reason}`, suggestion.params || {})
}

/** Voegt suggesties met dezelfde reden samen tot één groep, in de volgorde waarin ze binnenkomen. */
export function groupByReason(suggestions) {
  const groups = []
  for (const s of suggestions || []) {
    const signature = `${s.reason}|${JSON.stringify(s.params || {})}`
    let group = groups.find((g) => g.signature === signature)
    if (!group) {
      group = { signature, reason: s.reason, params: s.params || {}, items: [] }
      groups.push(group)
    }
    group.items.push(s)
  }
  return groups
}
