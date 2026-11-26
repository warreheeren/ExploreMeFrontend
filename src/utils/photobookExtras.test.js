import { describe, expect, it } from 'vitest'
import { crewRows, decisionRows, factRows, firstName, visibleExtraPages } from './photobookExtras'

// Vertaalfunctie die de sleutel en de parameters teruggeeft, zodat de test niet van de teksten afhangt.
const t = (key, params) => (params === undefined ? key : `${key}:${typeof params === 'object' ? JSON.stringify(params) : params}`)

describe('firstName', () => {
  it('takes the first word and survives empty names', () => {
    expect(firstName('Emma de Vries')).toBe('Emma')
    expect(firstName('  Jasper ')).toBe('Jasper')
    expect(firstName(null)).toBe('')
  })
})

describe('crewRows', () => {
  it('labels the organiser and shows photo counts only when there are photos', () => {
    const rows = crewRows(
      [
        { displayName: 'Emma de Vries', profilePhotoUrl: '/uploads/e.jpg', isOwner: true, photoCount: 34 },
        { displayName: 'Jasper', profilePhotoUrl: null, isOwner: false, photoCount: 0 },
      ],
      t,
    )
    expect(rows[0]).toEqual({ name: 'Emma', fullName: 'Emma de Vries', photoUrl: '/uploads/e.jpg', detail: 'photobook.extras.organizer · photobook.extras.photoCount:34' })
    expect(rows[1]).toEqual({ name: 'Jasper', fullName: 'Jasper', photoUrl: '', detail: '' })
  })
})

describe('decisionRows', () => {
  it('turns the date poll and polls into question, answer and tally', () => {
    const rows = decisionRows(
      [
        { kind: 'dates', votes: 5, voters: 6, start: '2027-05-12T00:00:00Z', end: '2027-05-16T00:00:00Z' },
        { kind: 'poll', question: 'Welke wijk?', winner: 'Alfama', votes: 4, voters: 6 },
      ],
      t,
    )
    expect(rows[0].icon).toBe('calendar')
    expect(rows[0].question).toBe('photobook.extras.datesQuestion')
    expect(rows[0].answer).toContain('12')
    expect(rows[0].answer).toContain('16')
    expect(rows[0].tally).toBe('photobook.extras.couldCome:{"n":5,"total":6}')
    expect(rows[1]).toEqual({ icon: 'vote', question: 'Welke wijk?', answer: 'Alfama', tally: 'photobook.extras.voteTally:{"n":4,"total":6}' })
  })

  it('leaves the tally out when nobody filled in the date poll', () => {
    expect(decisionRows([{ kind: 'dates', votes: 0, voters: 0, start: '2027-05-12T00:00:00Z', end: '2027-05-16T00:00:00Z' }], t)[0].tally).toBe('')
  })
})

describe('factRows', () => {
  it('builds a value and a label per fact and skips unknown types', () => {
    const rows = factRows(
      [
        { type: 'photos', count: 143 },
        { type: 'tasksDone', count: 12, total: 14 },
        { type: 'topPhotographer', name: 'Lucas Jansen', count: 52 },
        { type: 'somethingNew', count: 1 },
        { type: 'biggestExpense', text: 'Appartement', amount: 960, currency: 'EUR' },
      ],
      t,
    )
    expect(rows.map((r) => r.type)).toEqual(['photos', 'tasksDone', 'topPhotographer', 'biggestExpense'])
    expect(rows[0]).toMatchObject({ value: '143', label: 'photobook.extras.facts.photos', wide: false })
    expect(rows[1].value).toBe('photobook.extras.facts.tasksValue:{"n":12,"total":14}')
    expect(rows[2]).toMatchObject({ value: 'Lucas', label: 'photobook.extras.facts.topPhotographer:{"n":52}' })
    expect(rows[3].wide).toBe(true)
    expect(rows[3].value).toContain('Appartement')
    expect(rows[3].value).toContain('960')
  })
})

describe('visibleExtraPages', () => {
  const extras = { people: [{}], decisions: [], facts: [{}] }

  it('shows a page only when it is switched on and has content', () => {
    expect(visibleExtraPages({ crew: true, decisions: true, facts: false }, extras)).toEqual({ crew: true, decisions: false, facts: false })
    expect(visibleExtraPages({ crew: false, decisions: true, facts: true }, extras)).toEqual({ crew: false, decisions: false, facts: true })
  })

  it('shows nothing without data (visitors of a public trip)', () => {
    expect(visibleExtraPages({ crew: true, decisions: true, facts: true }, null)).toEqual({ crew: false, decisions: false, facts: false })
  })
})
