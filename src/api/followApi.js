import http from './http'

export async function toggleFollow(userName) {
  const { data } = await http.post(`/users/${userName}/follow`)
  return data
}

export async function searchUsers(query, take = 20) {
  const { data } = await http.get(`/users/search?q=${encodeURIComponent(query)}&take=${take}`)
  return data
}
