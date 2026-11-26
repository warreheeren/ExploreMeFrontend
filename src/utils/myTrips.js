import { daysUntil, tripDays } from '@/utils/date'

// Indeling van het startscherm "Mijn reizen". De API geeft alleen data en acties; de fase hangt af van de
// lokale datum van de gebruiker en wordt daarom hier bepaald.

export const TRIP_PHASES = ['active', 'upcoming', 'undated', 'past']

/** Afgelopen reizen die meteen zichtbaar zijn; de rest zit achter "toon meer". */
export const PAST_VISIBLE = 5

/**
 * 'active' (loopt vandaag), 'undated' (data nog niet vast: er loopt een datumprikker), 'upcoming' of 'past'.
 * Een reis met een open prikker heet pas "zonder datum" zolang ze niet begonnen is.
 */
export function tripPhase(item, now = new Date()) {
  const untilStart = daysUntil(item.trip.startDate, now)
  const untilEnd = daysUntil(item.trip.endDate, now)
  if (untilStart <= 0 && untilEnd >= 0) return 'active'
  if (untilEnd < 0) return 'past'
  return item.hasOpenDatePoll ? 'undated' : 'upcoming'
}

/** Groepeert en sorteert: onderweg en komend op vroegste start, afgelopen op recentste einde. */
export function groupTrips(items, now = new Date()) {
  const groups = { active: [], upcoming: [], undated: [], past: [] }
  for (const item of items || []) groups[tripPhase(item, now)].push(item)
  const byStart = (a, b) => new Date(a.trip.startDate) - new Date(b.trip.startDate)
  groups.active.sort(byStart)
  groups.upcoming.sort(byStart)
  groups.undated.sort(byStart)
  groups.past.sort((a, b) => new Date(b.trip.endDate) - new Date(a.trip.endDate))
  return groups
}

/** { day, total } voor "Dag 2 van 4" bij een lopende reis. */
export function tripDayProgress(trip, now = new Date()) {
  const total = tripDays(trip.startDate, trip.endDate)
  const day = Math.min(total, Math.max(1, 1 - daysUntil(trip.startDate, now)))
  return { day, total }
}

/** Alles wat op de gebruiker wacht: acties in zijn reizen plus openstaande uitnodigingen. */
export function waitingCount(items, invites = []) {
  return (items || []).reduce((sum, item) => sum + (item.actionCount || 0), 0) + (invites?.length || 0)
}
