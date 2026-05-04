import http from './http'
import { UserProfile, Post } from '@/models'

export async function getProfile(userName) {
  const { data } = await http.get(`/users/${userName}`)
  return UserProfile.fromApi(data)
}

export async function getUserPosts(userName, take = 20) {
  const { data } = await http.get(`/users/${userName}/posts?take=${take}`)
  return Post.fromApiList(data)
}

export async function updateProfile(payload) {
  const { data } = await http.put('/users/me', payload)
  return UserProfile.fromApi(data)
}
