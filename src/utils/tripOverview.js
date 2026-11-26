import { daysUntil } from '@/utils/date'

// Logica van het tabblad "Overzicht" van een reis: waar staat de groep, en hoeveel wacht er per tabblad.

/**
 * De vier stappen van een groepsreis. Elke stap is 'done', 'now' (de eerstvolgende, met een actie) of 'later'.
 * Hoogstens één stap is 'now': de eerste die nog niet klaar is.
 *
 * @param {{ participantCount: number, hasOpenDatePoll: boolean, stopCount: number, startDate: string, endDate: string, balance: number|null }} s
 * @returns {{ id: 'group'|'dates'|'route'|'settle', state: 'done'|'now'|'later' }[]}
 */
export function groupSteps(s, now = new Date()) {
  const over = daysUntil(s.endDate, now) < 0
  const owes = typeof s.balance === 'number' && Math.abs(s.balance) >= 0.005
  const done = {
    group: s.participantCount > 1,
    dates: !s.hasOpenDatePoll,
    route: s.stopCount > 0,
    // Verrekenen is pas aan de orde na de reis; dan is het klaar zodra niemand nog iets van jou krijgt of moet.
    settle: over && !owes,
  }
  let nowTaken = false
  return ['group', 'dates', 'route', 'settle'].map((id) => {
    if (done[id]) return { id, state: 'done' }
    // Vóór het einde van de reis is verrekenen nooit "nu".
    if (id === 'settle' && !over) return { id, state: 'later' }
    if (nowTaken) return { id, state: 'later' }
    nowTaken = true
    return { id, state: 'now' }
  })
}

/** Aantal acties per hoofdtabblad: { regelen: 2, geld: 1 }. `groups` = [{ id, tabs: [...] }]. */
export function actionCountByGroup(actions, groups) {
  const counts = {}
  for (const action of actions || []) {
    const group = groups.find((g) => g.tabs.includes(action.tab))
    if (group) counts[group.id] = (counts[group.id] || 0) + 1
  }
  return counts
}
