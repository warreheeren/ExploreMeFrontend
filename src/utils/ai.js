// Helpers voor de AI-reisassistent.

/** Zoveel eerdere beurten sturen we mee (de server kapt ook af). */
export const MAX_HISTORY = 10

/** Chatberichten → geschiedenis voor de API: alleen geslaagde vragen/antwoorden, nieuwste {@link MAX_HISTORY}. */
export function toHistory(messages = []) {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.error && m.text)
    .slice(-MAX_HISTORY)
    .map(({ role, text }) => ({ role, text }))
}

/** Stops van een voorstel per dag (1..days), in voorgestelde volgorde; lege dagen blijven zichtbaar. */
export function stopsByDay(stops = [], days = 1) {
  const total = Math.max(1, days)
  const result = Array.from({ length: total }, (_, i) => ({ day: i + 1, stops: [] }))
  stops.forEach((stop, index) => {
    const day = Math.min(total, Math.max(1, Number(stop.day) || 1))
    result[day - 1].stops.push({ ...stop, index })
  })
  return result
}

/** Voorstel-stops als kaartstops (TripMap verwacht id, type, coördinaten en volgorde). */
export function draftMapStops(stops = []) {
  return [...stops]
    .map((s, index) => ({ ...s, index }))
    .sort((a, b) => (a.day - b.day) || (a.index - b.index))
    .map((s, order) => ({ ...s, id: `draft-${s.index}`, orderIndex: order }))
}
