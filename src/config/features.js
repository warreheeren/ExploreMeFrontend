// Functies die af zijn maar bewust uit staan: ze hebben pas zin met veel actieve gebruikers (stories, challenges,
// reisbuddies, swipe-feed, vragen per plek) of leiden af van de kern (ansichtkaarten, tijdcapsules, fotoboek, embed).
// De code en de API blijven bestaan; alleen de ingangen in de UI en de routes verdwijnen.
//
// Weer aanzetten: VITE_FEATURES=stories,buddies (komma-gescheiden) of VITE_FEATURES=all in .env(.local).
export const OPTIONAL_FEATURES = Object.freeze([
  'stories',
  'challenges',
  'buddies',
  'nearby',
  'placeQa',
  'postcards',
  'timeCapsules',
  'photobook',
  'embed',
])

/** Zet de waarde van VITE_FEATURES om naar { stories: true|false, ... }. */
export function parseFeatures(raw) {
  const wanted = new Set(String(raw || '').split(',').map((s) => s.trim()).filter(Boolean))
  const all = wanted.has('all')
  return Object.freeze(Object.fromEntries(OPTIONAL_FEATURES.map((key) => [key, all || wanted.has(key)])))
}

export const features = parseFeatures(import.meta.env.VITE_FEATURES)

/** Onbekende sleutels (kernfuncties zonder vlag) staan altijd aan. */
export function isFeatureEnabled(key) {
  return !key || features[key] !== false
}

/** Meldingstype → vlag: een melding over een uitgeschakelde functie linkt nergens meer naartoe. */
const NOTIFICATION_FEATURE = Object.freeze({
  buddy_response: 'buddies',
  buddy_match: 'buddies',
  challenge_completed: 'challenges',
  postcard_received: 'postcards',
  place_question: 'placeQa',
  place_answer: 'placeQa',
})

export function isNotificationFeatureEnabled(type) {
  return isFeatureEnabled(NOTIFICATION_FEATURE[type])
}
