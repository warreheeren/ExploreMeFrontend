// Tekst, link en icoon per notificatietype (zie NotificationTypes.cs in de backend).
import { t } from '@/i18n'
import { isNotificationFeatureEnabled } from '@/config/features'

const TEXT_KEYS = {
  like: 'like',
  comment: 'comment',
  comment_reply: 'commentReply',
  follow: 'follow',
  follow_request: 'followRequest',
  follow_request_accepted: 'followRequestAccepted',
  trip_invite: 'tripInvite',
  trip_invite_accepted: 'tripInviteAccepted',
  trip_like: 'tripLike',
  trip_comment: 'tripComment',
  trip_poll: 'tripPoll',
  trip_journal: 'tripJournal',
  trip_settlement: 'tripSettlement',
  trip_copied: 'tripCopied',
  report_resolved: 'reportResolved',
  buddy_response: 'buddyResponse',
  buddy_match: 'buddyMatch',
  place_question: 'placeQuestion',
  place_answer: 'placeAnswer',
  challenge_completed: 'challengeCompleted',
  memory: 'memory',
  trip_departure: 'tripDeparture',
  safety_reminder: 'safetyReminder',
  safety_escalated: 'safetyEscalated',
  date_poll_opened: 'datePollOpened',
  date_poll_decided: 'datePollDecided',
  postcard_received: 'postcardReceived',
  capsule_opened: 'capsuleOpened',
  travel_advisory_changed: 'travelAdvisoryChanged',
  flight_delayed: 'flightDelayed',
  flight_gate_changed: 'flightGateChanged',
  flight_cancelled: 'flightCancelled',
  calendar_sync_failed: 'calendarSyncFailed',
}

// Meldingen zonder andere actor (de ontvanger is zelf de actor).
const SYSTEM_TYPES = [
  'report_resolved', 'challenge_completed', 'memory', 'trip_departure', 'safety_reminder', 'capsule_opened', 'travel_advisory_changed',
  'flight_delayed', 'flight_gate_changed', 'flight_cancelled', 'calendar_sync_failed',
]

export function notificationText(n) {
  if (n?.type === 'mention') return t(n.postId ? 'notifications.types.mentionPost' : 'notifications.types.mentionComment')
  const key = TEXT_KEYS[n?.type]
  return t(`notifications.types.${key || 'other'}`)
}

/** Systeemmeldingen tonen geen naam van de actor ervoor. */
export function isSystemNotification(n) {
  return SYSTEM_TYPES.includes(n?.type)
}

export function notificationLink(n) {
  if (!n) return '/'
  // Melding over een functie die uit staat (config/features.js): geen dode link.
  if (!isNotificationFeatureEnabled(n.type)) return '/'
  switch (n.type) {
    case 'trip_invite': return '/invites'
    case 'follow':
    case 'follow_request_accepted': return `/u/${n.actorUserName}`
    case 'follow_request': return '/settings?tab=privacy'
    case 'report_resolved': return '/'
    case 'trip_poll':
    case 'date_poll_opened': return `/trips/${n.tripId}?tab=stemmen`
    // Na de keuze zijn de datums van de reis zelf het nieuws.
    case 'date_poll_decided': return n.tripId ? `/trips/${n.tripId}` : '/'
    case 'trip_journal': return `/trips/${n.tripId}?tab=dagboek`
    case 'trip_settlement': return `/trips/${n.tripId}?tab=budget`
    case 'buddy_response': return '/buddies?tab=mine'
    case 'buddy_match': return '/buddies?matches=1'
    // Plekvragen: de melding kent alleen de reis; /places/qa zoekt de juiste plekpagina op.
    case 'place_question':
    case 'place_answer': return n.tripId ? `/places/qa/${n.tripId}` : '/'
    case 'challenge_completed': return '/challenges'
    case 'memory': return '/'
    case 'trip_departure': return n.tripId ? `/trips/${n.tripId}/today` : '/'
    case 'safety_reminder': return '/'
    // Een geopende capsule verschijnt in de terugblik; ?slide springt meteen naar die slide.
    case 'capsule_opened': return n.tripId ? `/trips/${n.tripId}/recap?slide=capsules` : '/'
    case 'postcard_received': return '/postcards'
    // Het advies staat in de landeninfo op tab "praktisch".
    case 'travel_advisory_changed': return n.tripId ? `/trips/${n.tripId}?tab=praktisch` : '/'
    // Vluchtwijzigingen staan bovenaan de Vandaag-modus.
    case 'flight_delayed':
    case 'flight_gate_changed':
    case 'flight_cancelled': return n.tripId ? `/trips/${n.tripId}/today` : '/'
    case 'calendar_sync_failed': return '/settings#calendar'
    default: break
  }
  if (n.postId) return `/posts/${n.postId}`
  if (n.tripId) {
    const toComments = ['trip_comment', 'comment_reply', 'mention'].includes(n.type)
    return toComments ? `/trips/${n.tripId}?tab=reacties` : `/trips/${n.tripId}`
  }
  return `/u/${n.actorUserName}`
}

export function notificationIcon(n) {
  switch (n?.type) {
    case 'like':
    case 'trip_like': return 'heart'
    case 'comment':
    case 'trip_comment': return 'chat'
    case 'comment_reply': return 'reply'
    case 'mention': return 'at'
    case 'follow':
    case 'follow_request':
    case 'follow_request_accepted': return 'user'
    case 'trip_invite': return 'mail'
    case 'trip_invite_accepted': return 'check'
    case 'trip_poll': return 'checklist'
    case 'trip_journal': return 'edit'
    case 'trip_settlement': return 'wallet'
    case 'trip_copied': return 'copy'
    case 'report_resolved': return 'flag'
    case 'buddy_response':
    case 'buddy_match': return 'users'
    case 'place_question':
    case 'place_answer': return 'pin'
    case 'challenge_completed': return 'badge'
    case 'memory':
    case 'capsule_opened': return 'clock'
    case 'trip_departure': return 'route'
    case 'safety_reminder':
    case 'safety_escalated':
    case 'travel_advisory_changed': return 'shield'
    case 'date_poll_opened':
    case 'date_poll_decided': return 'calendar'
    case 'postcard_received': return 'mail'
    case 'flight_delayed':
    case 'flight_gate_changed':
    case 'flight_cancelled': return 'plane'
    case 'calendar_sync_failed': return 'calendar'
    default: return 'bell'
  }
}

export function notificationContext(n) {
  return n?.postCaption || n?.tripTitle || ''
}
