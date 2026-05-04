import http from './http'

export async function toggleFollow(userName) {
  const { data } = await http.post(`api/users/${userName}/follow`)
  return data
}

export async function searchUsers(query, take = 20) {
  const { data } = await http.get(`api/users/search?q=${encodeURIComponent(query)}&take=${take}`)
  return data
}
