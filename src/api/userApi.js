import http from './http'
import { UserProfile, Post } from '@/models'

export async function getProfile(userName) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}`)
  return UserProfile.fromApi(data)
}

/** before = createdAtUtc van de laatste post (volgende pagina). */
export async function getUserPosts(userName, take = 30, before = null) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}/posts`, { params: { take, before: before || undefined } })
  return Post.fromApiList(data)
}

/** Alleen meegegeven velden worden gewijzigd; een lege string wist een foto. */
/** → { profile, token }: token is gezet wanneer het e-mailadres wijzigde (header X-Auth-Token, andere sessies ingetrokken). */
export async function updateProfile(payload) {
  const res = await http.put('/users/me', payload)
  return { profile: UserProfile.fromApi(res.data), token: res.headers['x-auth-token'] || null }
}

export async function getMe() {
  const { data } = await http.get('/users/me')
  return data
}

export async function getSuggested(take = 6) {
  const { data } = await http.get('/users/suggested', { params: { take } })
  return data
}

export async function completeOnboarding() {
  await http.post('/users/me/onboarding-complete')
}

export async function getStats(userName) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}/stats`)
  return data
}

export async function getFollowers(userName) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}/followers`)
  return data
}

export async function getFollowing(userName) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}/following`)
  return data
}

// ---------- privacy & volgverzoeken ----------

export async function getFollowRequests() {
  const { data } = await http.get('/users/me/follow-requests')
  return data
}

export async function acceptFollowRequest(userName) {
  await http.post(`/users/me/follow-requests/${encodeURIComponent(userName)}/accept`)
}

export async function declineFollowRequest(userName) {
  await http.post(`/users/me/follow-requests/${encodeURIComponent(userName)}/decline`)
}

export async function removeFollower(userName) {
  await http.delete(`/users/me/followers/${encodeURIComponent(userName)}`)
}

// ---------- meldingsvoorkeuren ----------

export async function getNotificationPreferences() {
  const { data } = await http.get('/users/me/notification-preferences')
  return data
}

export async function updateNotificationPreferences(prefs) {
  const { data } = await http.put('/users/me/notification-preferences', prefs)
  return data
}

// ---------- account (AVG) ----------

/** Download van alle eigen gegevens als JSON-bestand. */
export async function exportData() {
  const res = await http.get('/users/me/export', { responseType: 'blob' })
  const disposition = res.headers['content-disposition'] || ''
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return { blob: res.data, fileName: match ? decodeURIComponent(match[1]) : 'exploreme-export.json' }
}

/** Bevestiging: { password } of, voor Google/Apple-accounts, { provider, idToken, nonce }. */
export async function deleteAccount(confirmation) {
  await http.post('/users/me/delete', confirmation)
}