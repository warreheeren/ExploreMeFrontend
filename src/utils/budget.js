// Budget-helpers: categorieën en het vereffenen van saldi tussen reisgenoten.
import { t } from '@/i18n'

export const EXPENSE_CATEGORIES = {
  Accommodation: { icon: 'bed' },
  Food: { icon: 'utensils' },
  Transport: { icon: 'plane' },
  Activity: { icon: 'ticket' },
  Other: { icon: 'wallet' },
}

// Label als getter zodat het altijd de huidige taal volgt.
for (const key of Object.keys(EXPENSE_CATEGORIES)) {
  Object.defineProperty(EXPENSE_CATEGORIES[key], 'label', { get: () => t(`budget.categories.${key}`), enumerable: true })
}

export const EXPENSE_CATEGORY_ORDER = ['Accommodation', 'Transport', 'Food', 'Activity', 'Other']

export function categoryMeta(category) {
  return EXPENSE_CATEGORIES[category] || EXPENSE_CATEGORIES.Other
}

/**
 * Samenvatting van een uitgave die per kasticketregel gesplitst wordt (in de munt van de uitgave).
 * items: [{ amount, userNames }]. Geeft { perUser: { userName: bedrag }, itemsTotal, rest, over } terug;
 * de rest wordt op de server gelijk verdeeld (restcentjes naar de betaler), dus hier alleen als totaal.
 */
export function summarizeItemSplit(items = [], total = 0) {
  const cents = (n) => Math.round((Number(n) || 0) * 100)
  const perUser = {}
  let itemsCents = 0
  for (const item of items) {
    const amount = cents(item.amount)
    if (amount <= 0) continue
    itemsCents += amount
    const users = [...new Set(item.userNames || [])]
    if (!users.length) continue
    const each = Math.floor(amount / users.length)
    for (const u of users) perUser[u] = (perUser[u] || 0) + each
  }
  for (const u of Object.keys(perUser)) perUser[u] /= 100
  const rest = cents(total) - itemsCents
  return { perUser, itemsTotal: itemsCents / 100, rest: Math.max(0, rest) / 100, over: rest < 0 }
}

/**
 * Minimale lijst overschrijvingen om alle saldi op nul te zetten (greedy).
 * participants: [{ userName, displayName, balance }] — positief = krijgt geld terug.
 * Geeft [{ from, to, amount }] terug met displayName-objecten.
 */
export function settleBalances(participants = []) {
  const round = (n) => Math.round(n * 100) / 100
  const debtors = participants
    .filter((p) => p.balance < -0.004)
    .map((p) => ({ ...p, left: -p.balance }))
    .sort((a, b) => b.left - a.left)
  const creditors = participants
    .filter((p) => p.balance > 0.004)
    .map((p) => ({ ...p, left: p.balance }))
    .sort((a, b) => b.left - a.left)

  const transfers = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = round(Math.min(debtors[i].left, creditors[j].left))
    if (amount > 0) transfers.push({ from: debtors[i], to: creditors[j], amount })
    debtors[i].left = round(debtors[i].left - amount)
    creditors[j].left = round(creditors[j].left - amount)
    if (debtors[i].left <= 0.004) i++
    if (creditors[j].left <= 0.004) j++
  }
  return transfers
}
