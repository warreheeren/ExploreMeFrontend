import http from './http'
import { AuthUser } from '@/models'

export async function register(payload) {
  const { data } = await http.post('api/auth/register', payload)
  return AuthUser.fromApi(data)
}

export async function login(payload) {
  const { data } = await http.post('api/auth/login', payload)
  return AuthUser.fromApi(data)
}
