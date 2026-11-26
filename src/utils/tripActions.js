import { t } from '@/i18n'
import { daysUntil, formatDate } from '@/utils/date'

// "Wacht op jou": één plek die een actie uit de API (TripActionDto) omzet naar icoon, tekst en deadline.
// Gebruikt op het startscherm (MyTripCard) en op het tabblad Overzicht van een reis.

const ACTION_META = {
  datePoll: { icon: 'calendar', label: () => t('myTrips.actions.datePoll') },
  poll: { icon: 'vote', label: (a) => t('myTrips.actions.poll', { text: a.text }) },
  task: { icon: 'checklist', label: (a) => t('myTrips.actions.task', { text: a.text }), dated: true },
  payment: { icon: 'wallet', label: (a) => t('myTrips.actions.payment', { text: a.text }), dated: true },
}

/**
 * [{ type, text, tab, dueDate }] → [{ icon, label, tab, due?, overdue? }]. Onbekende types vallen weg, zodat een
 * nieuwere API geen lege regels oplevert. `due` is "vóór 1 mrt" of "te laat" (alleen taken en betalingen).
 */
export function describeActions(actions, now = new Date()) {
  return (actions || [])
    .filter((a) => ACTION_META[a.type])
    .map((a) => {
      const meta = ACTION_META[a.type]
      const item = { icon: meta.icon, label: meta.label(a), tab: a.tab, type: a.type }
      if (meta.dated && a.dueDate) {
        item.overdue = daysUntil(a.dueDate, now) < 0
        item.due = item.overdue ? t('myTrips.actions.overdue') : t('myTrips.actions.dueBy', { date: formatDate(a.dueDate) })
      }
      return item
    })
}
