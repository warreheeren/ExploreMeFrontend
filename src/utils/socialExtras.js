// Pure helpers voor de sociale extra's: reisgenoten, stories, challenges en herinneringen.

// ---------- reisgenoten ----------

/** 'YYYY-MM' → { from, to } als kalenderdatums ('YYYY-MM-DD'), of null bij ongeldige invoer. */
export function monthRange(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ''))
  if (!m) return null
  const year = Number(m[1])
  const monthIndex = Number(m[2])
  if (monthIndex < 1 || monthIndex > 12) return null
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate()
  return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, '0')}` }
}

/** De komende <count> maanden als 'YYYY-MM', te beginnen met de huidige. */
export function upcomingMonths(count = 12, now = new Date()) {
  const result = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

// ---------- stories ----------

/** Index van de eerste ongeziene story (of 0 als alles gezien is). */
export function firstUnseenIndex(stories) {
  const index = (stories || []).findIndex((s) => !s.seen)
  return index < 0 ? 0 : index
}

/**
 * Volgende (dir = 1) of vorige (dir = -1) positie in de story-viewer over groepen heen.
 * → { group, story } of null wanneer je voorbij het begin of einde gaat.
 * Naar een volgende groep springen begint bij diens eerste ongeziene story; terug begint bij de laatste.
 */
export function stepStory(groups, groupIndex, storyIndex, dir) {
  const group = groups?.[groupIndex]
  if (!group) return null
  const next = storyIndex + dir
  if (next >= 0 && next < group.stories.length) return { group: groupIndex, story: next }
  const nextGroup = groupIndex + dir
  if (nextGroup < 0 || nextGroup >= groups.length) return null
  const target = groups[nextGroup]
  return { group: nextGroup, story: dir > 0 ? firstUnseenIndex(target.stories) : target.stories.length - 1 }
}

// ---------- challenges ----------

/** Voortgang in procent (0–100) voor de balk. */
export function challengeProgressPercent(challenge) {
  if (!challenge) return 0
  if (challenge.completed) return 100
  const target = Math.max(1, Number(challenge.target) || 1)
  return Math.min(100, Math.round(((Number(challenge.progress) || 0) / target) * 100))
}

/** Sorteervolgorde op de challengespagina: lopende eerst, dan voltooide, dan afgelopen. */
export function sortChallenges(challenges) {
  const rank = (c) => (c.isActive && !c.completed ? 0 : c.completed ? 1 : 2)
  return [...(challenges || [])].sort((a, b) => rank(a) - rank(b) || Number(b.joined) - Number(a.joined) || (a.year ?? 0) - (b.year ?? 0))
}

// ---------- herinneringen ----------

const MEMORY_DISMISS_KEY = 'memories-dismissed'

/** Lokale kalenderdag 'YYYY-MM-DD'. */
export function localDayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Werd de herinneringskaart vandaag al weggeklikt? Werkt ook zonder (geblokkeerde) storage. */
export function isMemoryDismissed(storage, now = new Date()) {
  try {
    return storage?.getItem(MEMORY_DISMISS_KEY) === localDayKey(now)
  } catch {
    return false
  }
}

export function dismissMemory(storage, now = new Date()) {
  try {
    storage?.setItem(MEMORY_DISMISS_KEY, localDayKey(now))
  } catch {
    // alleen voor deze sessie verborgen
  }
}

/** Hoofdzin-gegevens voor de kaart: recentste jaar met een reis, anders met een post. */
export function memoryHeadline(years) {
  const list = years || []
  const withTrip = list.find((y) => y.trips?.length)
  if (withTrip) {
    const trip = withTrip.trips[0]
    return { yearsAgo: withTrip.yearsAgo, place: trip.placeName || trip.country || trip.title, tripId: trip.tripId }
  }
  const withPost = list.find((y) => y.posts?.length)
  return withPost ? { yearsAgo: withPost.yearsAgo, place: null, postId: withPost.posts[0].postId } : null
}

/** Alle foto's van de herinneringen (zonder dubbels), recentste jaar eerst. */
export function memoryPhotos(years, max = 6) {
  const urls = []
  for (const y of years || []) {
    for (const trip of y.trips || []) urls.push(...(trip.photoUrls || []))
    for (const post of y.posts || []) if (post.imageUrl) urls.push(post.imageUrl)
  }
  return [...new Set(urls)].slice(0, max)
}
