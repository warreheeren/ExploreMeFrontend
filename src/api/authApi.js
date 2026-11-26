import http from './http'
import { AuthUser } from '@/models'

export async function register(payload) {
  const { data } = await http.post('/auth/register', payload)
  return AuthUser.fromApi(data)
}

export async function login(payload) {
  const { data } = await http.post('/auth/login', payload)
  return AuthUser.fromApi(data)
}

export async function forgotPassword(emailOrUserName) {
  const { data } = await http.post('/auth/forgot-password', { emailOrUserName })
  return data
}

export async function resetPassword(token, newPassword) {
  const { data } = await http.post('/auth/reset-password', { token, newPassword })
  return data
}

/** Trekt alle andere sessies in; geeft een nieuw token voor deze sessie terug. */
export async function changePassword(currentPassword, newPassword) {
  const { data } = await http.post('/auth/change-password', { currentPassword, newPassword })
  return AuthUser.fromApi(data)
}
