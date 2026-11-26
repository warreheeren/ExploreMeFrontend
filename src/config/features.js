// Functies die af zijn maar bewust uit staan: ze hebben pas zin met veel actieve gebruikers (stories, challenges,
// reisbuddies, swipe-feed, vragen per plek) of leiden af van de kern (ansichtkaarten, tijdcapsules, fotoboek, embed).
// De code en de API blijven bestaan; alleen de ingangen in de UI en de routes verdwijnen.
//
// ExploreMe is een groepsreis-app: de sociale laag (tijdlijn, volgen, ontdekken, lijsten, badges, wereldkaart) staat
// daarom ook standaard uit. Zonder die vlaggen is "/" het startscherm "Mijn reizen" (zie RootView.vue).
//   feed      tijdlijn, posts maken en bekijken, posts-tab op reis en profiel, PWA share target, herinneringen
//   follows   volgen, volgverzoeken, privé-account, volgers-lijsten, aanbevolen reizigers
//   discover  ontdekken, zoeken, plekpagina's, publieke reizen van anderen, likes/bookmarks/reacties op reizen
//   lists     bewaarde lijsten en "opslaan in lijst"
//   badges    badges op het profiel
//   worldMap  kleurbare wereldkaart
//
// Weer aanzetten: VITE_FEATURES=stories,buddies (komma-gescheiden) of VITE_FEATURES=all in .env(.local).
export const OPTIONAL_FEATURES = Object.freeze([
  'feed',
  'follows',
  'discover',
  'lists',
  'badges',
  'worldMap',
  'stories',
  'challenges',
  'buddies',
  'nearby',
  'placeQa',
  'postcards',
  'timeCapsules',
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
// Kernmeldingen (uitnodigingen, stemmingen, dagboek, terugbetalingen, vluchten, ...) staan hier bewust niet in.
const NOTIFICATION_FEATURE = Object.freeze({
  // Posts: likes, reacties, antwoorden en vermeldingen. Antwoorden/vermeldingen kunnen ook bij reisreacties
  // horen, maar het type zegt niet welke; ze volgen de feed.
  like: 'feed',
  comment: 'feed',
  comment_reply: 'feed',
  mention: 'feed',
  memory: 'feed',
  follow: 'follows',
  follow_request: 'follows',
  follow_request_accepted: 'follows',
  trip_like: 'discover',
  trip_comment: 'discover',
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
