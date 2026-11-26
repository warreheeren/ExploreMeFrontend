import { describe, expect, it } from 'vitest'
import { datePollPlan, groupOf } from './startTrip'

describe('datePollPlan', () => {
  it('geeft de reis voorlopig de eerste dagen van de periode', () => {
    expect(datePollPlan('2027-05-01', '2027-05-31', 4)).toEqual({ tripStart: '2027-05-01', tripEnd: '2027-05-04' })
    expect(datePollPlan('2027-05-01', '2027-05-31', 1)).toEqual({ tripStart: '2027-05-01', tripEnd: '2027-05-01' })
  })

  it('loopt niet voorbij het einde van de periode', () => {
    expect(datePollPlan('2027-05-01', '2027-05-03', 10)).toEqual({ tripStart: '2027-05-01', tripEnd: '2027-05-03' })
  })

  it('verdraagt een ongeldige lengte', () => {
    expect(datePollPlan('2027-05-01', '2027-05-31', 0).tripEnd).toBe('2027-05-01')
  })
})

describe('groupOf', () => {
  const trip = {
    userName: 'emma.reist', displayName: 'Emma', profilePhotoUrl: null,
    collaborators: [
      { userName: 'lucas.explores', displayName: 'Lucas', status: 'Accepted' },
      { userName: 'gast-ab12', displayName: 'Sofie', status: 'Accepted' },
      { userName: 'noah.outdoors', displayName: 'Noah', status: 'Pending' },
    ],
  }

  it('geeft de eigenaar en geaccepteerde reisgenoten, zonder jezelf', () => {
    expect(groupOf(trip, 'lucas.explores').map((p) => p.userName)).toEqual(['emma.reist', 'gast-ab12'])
    expect(groupOf(trip, 'Emma.Reist').map((p) => p.userName)).toEqual(['lucas.explores', 'gast-ab12'])
  })

  it('verdraagt een reis zonder reisgenoten', () => {
    expect(groupOf({ userName: 'emma.reist', displayName: 'Emma' }, 'emma.reist')).toEqual([])
  })
})
