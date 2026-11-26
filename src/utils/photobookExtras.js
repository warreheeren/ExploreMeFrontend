// Groepspagina's van het fotoboek ("Wie was erbij", "Zo beslisten we", "De reis in cijfers"). De API levert alleen
// feiten (GET /trips/{id}/photobook/extras); hier worden het zinnen in de taal van wie het boek bekijkt.
import { formatCurrency, formatDateRange } from '@/utils/date'

export const EXTRA_PAGES = ['crew', 'decisions', 'facts']

/** Voornaam voor onder een profielfoto; een naam uit één woord blijft zoals hij is. */
export function firstName(displayName) {
  return String(displayName || '').trim().split(/\s+/)[0] || ''
}

/** Wie was erbij: [{ name, fullName, photoUrl, detail }], organisator eerst (de API levert die volgorde). */
export function crewRows(people, t) {
  return (people || []).map((p) => {
    const parts = []
    if (p.isOwner) parts.push(t('photobook.extras.organizer'))
    if (p.photoCount > 0) parts.push(t('photobook.extras.photoCount', p.photoCount))
    return { name: firstName(p.displayName), fullName: p.displayName, photoUrl: p.profilePhotoUrl || '', detail: parts.join(' · ') }
  })
}

/** Zo beslisten we: [{ icon, question, answer, tally }]. */
export function decisionRows(decisions, t) {
  return (decisions || []).map((d) =>
    d.kind === 'dates'
      ? {
          icon: 'calendar',
          question: t('photobook.extras.datesQuestion'),
          answer: formatDateRange(d.start, d.end),
          tally: d.voters > 0 ? t('photobook.extras.couldCome', { n: d.votes, total: d.voters }) : '',
        }
      : {
          icon: 'vote',
          question: d.question,
          answer: d.winner,
          tally: t('photobook.extras.voteTally', { n: d.votes, total: d.voters }),
        },
  )
}

/**
 * De reis in cijfers: [{ type, value, label, wide }]. `wide` = een zin over de hele breedte (duurste uitgave).
 * Onbekende types (nieuwere API) worden overgeslagen in plaats van half getoond.
 */
export function factRows(facts, t) {
  const money = (f) => formatCurrency(f.amount, f.currency || 'EUR')
  const build = {
    photos: (f) => ({ value: String(f.count), label: t('photobook.extras.facts.photos') }),
    totalSpent: (f) => ({ value: money(f), label: t('photobook.extras.facts.totalSpent') }),
    tasksDone: (f) => ({ value: t('photobook.extras.facts.tasksValue', { n: f.count, total: f.total }), label: t('photobook.extras.facts.tasksDone') }),
    topPhotographer: (f) => ({ value: firstName(f.name), label: t('photobook.extras.facts.topPhotographer', { n: f.count }) }),
    topPayer: (f) => ({ value: firstName(f.name), label: t('photobook.extras.facts.topPayer', { amount: money(f) }) }),
    messages: (f) => ({ value: String(f.count), label: t('photobook.extras.facts.messages') }),
    biggestExpense: (f) => ({ value: t('photobook.extras.facts.biggestExpense', { title: f.text, amount: money(f) }), label: '', wide: true }),
  }
  return (facts || []).filter((f) => build[f.type]).map((f) => ({ type: f.type, wide: false, ...build[f.type](f) }))
}

/** Een pagina staat in het boek als de schakelaar aan staat én er iets op te zetten valt. */
export function visibleExtraPages(pages, extras) {
  return {
    crew: !!pages?.crew && (extras?.people?.length || 0) > 0,
    decisions: !!pages?.decisions && (extras?.decisions?.length || 0) > 0,
    facts: !!pages?.facts && (extras?.facts?.length || 0) > 0,
  }
}
