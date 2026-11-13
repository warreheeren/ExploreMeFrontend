import http from './http'
import { AuthUser } from '@/models'

/** { google: clientId | null, apple: { clientId, redirectUri } | null } */
export async function getExternalAuthConfig() {
  const { data } = await http.get('/auth/external/config')
  return data
}

/** payload: { idToken, nonce?, displayName? } → zelfde antwoord als gewoon inloggen. */
export async function externalLogin(provider, payload) {
  const { data } = await http.post(`/auth/external/${encodeURIComponent(provider)}`, payload)
  return AuthUser.fromApi(data)
}

/** [{ provider, email, createdAtUtc, lastUsedAtUtc }] */
export async function getExternalLogins() {
  const { data } = await http.get('/users/me/external-logins')
  return data
}

/** payload: { idToken, nonce? } */
export async function linkExternalLogin(provider, payload) {
  const { data } = await http.post(`/users/me/external-logins/${encodeURIComponent(provider)}`, payload)
  return data
}

export async function unlinkExternalLogin(provider) {
  const { data } = await http.delete(`/users/me/external-logins/${encodeURIComponent(provider)}`)
  return data
}
