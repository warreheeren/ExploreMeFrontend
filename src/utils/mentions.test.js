import { describe, expect, it } from 'vitest'
import { activeMentionQuery, extractMentions, splitMentions } from './mentions'

describe('splitMentions', () => {
  it('splitst tekst en vermeldingen en houdt leestekens als tekst', () => {
    expect(splitMentions('Hoi @emma.reist, zin in?')).toEqual([
      { type: 'text', value: 'Hoi ' },
      { type: 'mention', value: 'emma.reist' },
      { type: 'text', value: ', zin in?' },
    ])
  })

  it('knipt afsluitende punten van de naam af', () => {
    expect(splitMentions('Bedankt @lucas.')).toEqual([
      { type: 'text', value: 'Bedankt ' },
      { type: 'mention', value: 'lucas' },
      { type: 'text', value: '.' },
    ])
  })

  it('ziet e-mailadressen en te korte namen niet als vermelding', () => {
    expect(splitMentions('mail lotte@example.com of @ab')).toEqual([{ type: 'text', value: 'mail lotte@example.com of @ab' }])
  })

  it('geeft unieke vermeldingen ongeacht hoofdletters', () => {
    expect(extractMentions('@Daan en @daan en @sofie')).toEqual(['Daan', 'sofie'])
  })
})

describe('activeMentionQuery', () => {
  it('herkent een vermelding die nog getypt wordt', () => {
    expect(activeMentionQuery('Vraag aan @em')).toBe('em')
    expect(activeMentionQuery('@')).toBe('')
    expect(activeMentionQuery('mail@ex')).toBeNull()
    expect(activeMentionQuery('@emma klaar')).toBeNull()
  })
})
