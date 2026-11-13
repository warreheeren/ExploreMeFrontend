import http from './http'

/** Eigen lijsten; met stopId geeft elke lijst `containsStop` terug. */
export async function getMyLists(stopId = null) {
  const { data } = await http.get('/lists/mine', { params: { stopId: stopId || undefined } })
  return data
}

export async function getUserLists(userName) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}/lists`)
  return data
}

export async function getList(listId) {
  const { data } = await http.get(`/lists/${listId}`)
  return data
}

/** payload: { name, description, isPublic } */
export async function createList(payload) {
  const { data } = await http.post('/lists', payload)
  return data
}

export async function updateList(listId, payload) {
  const { data } = await http.put(`/lists/${listId}`, payload)
  return data
}

export async function deleteList(listId) {
  await http.delete(`/lists/${listId}`)
}

export async function addToList(listId, stopId, note = null) {
  await http.post(`/lists/${listId}/items`, { stopId, note })
}

export async function removeFromList(listId, stopId) {
  await http.delete(`/lists/${listId}/items/${stopId}`)
}
