import http from './http'
import { AuthUser } from '@/models'

// Uitnodigingslink van een reis (/join/:token): beheren (eigenaar), bekijken en meedoen.

/** { token, createdAtUtc } of null als er nog geen link is (204). */
export async function getInviteLink(tripId) {
  const { data, status } = await http.get(`/trips/${tripId}/collaborators/invite-link`)
  return status === 204 || !data?.token ? null : data
}

/** Maakt de link of geeft de bestaande terug; `reset` vervangt hem (de oude link werkt dan niet meer). */
export async function createInviteLink(tripId, { reset = false } = {}) {
  const { data } = await http.post(`/trips/${tripId}/collaborators/invite-link`, null, { params: reset ? { reset: true } : {} })
  return data
}

export async function deleteInviteLink(tripId) {
  await http.delete(`/trips/${tripId}/collaborators/invite-link`)
}

/** Preview zonder login: { tripId, title, coverImageUrl, startDate, endDate, invitedByDisplayName, participants, alreadyParticipant, isFull … } */
export async function getInvitePreview(token) {
  const { data } = await http.get(`/public/invites/${encodeURIComponent(token)}`)
  return data
}

/** Meedoen met het ingelogde account → tripId. */
export async function joinTrip(token) {
  const { data } = await http.post(`/invites/${encodeURIComponent(token)}/join`)
  return data.tripId
}

/** Meedoen zonder account: payload { displayName, language } → { auth, guestKey, tripId }. */
export async function joinAsGuest(token, payload) {
  const { data } = await http.post(`/public/invites/${encodeURIComponent(token)}/join-guest`, { ...payload, acceptTerms: true })
  return { auth: AuthUser.fromApi(data.auth), guestKey: data.guestKey, tripId: data.tripId }
}

/** "Bewaar je reis": payload { userName, password, email? } → nieuw token als gewoon account. */
export async function upgradeGuest(payload) {
  const { data } = await http.post('/auth/guest/upgrade', payload)
  return AuthUser.fromApi(data)
}

/** "Bewaar je reis" met Google/Apple: payload { idToken, nonce? }. */
export async function upgradeGuestExternal(provider, payload) {
  const { data } = await http.post(`/auth/guest/upgrade-external/${encodeURIComponent(provider)}`, payload)
  return AuthUser.fromApi(data)
}
