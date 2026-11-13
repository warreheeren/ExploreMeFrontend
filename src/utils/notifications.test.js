import { describe, expect, it } from 'vitest'
import { isSystemNotification, notificationIcon, notificationLink, notificationText } from './notifications'

describe('notificaties', () => {
  it('linkt naar de juiste plek per type', () => {
    expect(notificationLink({ type: 'trip_invite', tripId: 't1' })).toBe('/invites')
    expect(notificationLink({ type: 'follow', actorUserName: 'emma' })).toBe('/u/emma')
    expect(notificationLink({ type: 'like', postId: 'p1' })).toBe('/posts/p1')
    expect(notificationLink({ type: 'trip_comment', tripId: 't1' })).toBe('/trips/t1?tab=reacties')
    expect(notificationLink({ type: 'trip_like', tripId: 't1' })).toBe('/trips/t1')
    expect(notificationLink({ type: 'capsule_opened', tripId: 't1' })).toBe('/trips/t1/recap?slide=capsules')
  })

  it('heeft een Nederlandse tekst per type', () => {
    expect(notificationText({ type: 'mention', postId: 'p' })).toBe('noemde je in een post')
    expect(notificationText({ type: 'mention', tripId: 't' })).toBe('noemde je in een reactie')
    expect(notificationText({ type: 'onbekend' })).toBe('heeft iets gedaan')
  })

  it('toont een aangescherpt reisadvies als systeemmelding met link naar de landeninfo', () => {
    const n = { type: 'travel_advisory_changed', tripId: 't1' }
    expect(notificationLink(n)).toBe('/trips/t1?tab=praktisch')
    expect(notificationText(n)).toBe('Het reisadvies voor een land van je reis is aangescherpt')
    expect(isSystemNotification(n)).toBe(true)
    expect(notificationIcon(n)).toBe('shield')
  })
})
