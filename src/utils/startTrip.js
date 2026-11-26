import { addDays, toDateInput } from '@/utils/date'

// Hulpfuncties voor het korte formulier "Nieuwe groepsreis" (StartTripView).

/**
 * Data nog onbekend: een reis heeft altijd data nodig, dus ze krijgt voorlopig de eerste `length` dagen van de
 * gekozen periode. De datumprikker over die periode bepaalt daarna de echte data.
 * @returns {{ tripStart: string, tripEnd: string }} datums als yyyy-mm-dd
 */
export function datePollPlan(rangeStart, rangeEnd, length) {
  const days = Math.max(1, Math.floor(Number(length) || 1))
  const provisionalEnd = toDateInput(addDays(rangeStart, days - 1))
  // De voorlopige reis mag niet voorbij het einde van de periode lopen.
  return { tripStart: rangeStart, tripEnd: provisionalEnd > rangeEnd ? rangeEnd : provisionalEnd }
}

/**
 * Iedereen uit een eerdere reis behalve jij: de eigenaar plus de geaccepteerde reisgenoten ("Nog een keer?").
 * @returns {{ userName: string, displayName: string, profilePhotoUrl: string }[]}
 */
export function groupOf(trip, myUserName) {
  const people = [
    { userName: trip.userName, displayName: trip.displayName, profilePhotoUrl: trip.profilePhotoUrl || '' },
    ...(trip.collaborators || [])
      .filter((c) => c.status === 'Accepted')
      .map((c) => ({ userName: c.userName, displayName: c.displayName, profilePhotoUrl: c.profilePhotoUrl || '' })),
  ]
  const seen = new Set()
  return people.filter((p) => {
    const key = String(p.userName || '').toLowerCase()
    if (!key || key === String(myUserName || '').toLowerCase() || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
