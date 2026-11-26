// Logica voor de gedeelde lijst van een reis: taken (met eigenaar en deadline) en de paklijst.
// Puur en zonder Vue, zodat sorteren en deadline-status los te testen zijn.

import { daysUntil, parseDateOnly } from './date'

export const CHECKLIST_KIND = Object.freeze({ packing: 'Packing', task: 'Task' })

/** Oude items (van vóór taken bestonden) hebben geen kind: die horen bij de paklijst. */
export function isTask(item) {
  return item?.kind === CHECKLIST_KIND.task
}

const byOrder = (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)

/** Paklijst: open items eerst, verder in de volgorde waarin ze zijn toegevoegd. */
export function sortPackingItems(items) {
  return [...items].sort((a, b) => Number(a.isDone) - Number(b.isDone) || byOrder(a, b))
}

/**
 * Taken: open taken met deadline eerst (vroegste eerst), dan open taken zonder deadline,
 * afgevinkte taken onderaan. Binnen een groep geldt de toevoegvolgorde.
 */
export function sortTasks(items) {
  const dueTime = (item) => parseDateOnly(item.dueDate)?.getTime() ?? null
  return [...items].sort((a, b) => {
    if (a.isDone !== b.isDone) return Number(a.isDone) - Number(b.isDone)
    if (!a.isDone) {
      const da = dueTime(a)
      const db = dueTime(b)
      if (da !== null && db !== null && da !== db) return da - db
      if ((da === null) !== (db === null)) return da === null ? 1 : -1
    }
    return byOrder(a, b)
  })
}

/**
 * Status van de deadline van een taak, voor kleur en label:
 * 'none' (geen deadline), 'done' (afgevinkt), 'overdue', 'today', 'tomorrow' of 'later'.
 */
export function deadlineState(item, now = new Date()) {
  if (!item?.dueDate || !parseDateOnly(item.dueDate)) return 'none'
  if (item.isDone) return 'done'
  const days = daysUntil(item.dueDate, now)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return 'later'
}
