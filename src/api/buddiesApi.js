import http from './http'

/**
 * Oproepen voor reisgenoten. filters: { country, from, to (ISO-datums), matches, mine };
 * before = createdAtUtc van de laatste oproep (volgende pagina).
 */
export async function getBuddyPosts(filters = {}, take = 20, before = null) {
  const { data } = await http.get('/buddies', {
    params: {
      country: filters.country || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      matches: filters.matches || undefined,
      mine: filters.mine || undefined,
      take,
      before: before || undefined,
    },
  })
  return data
}

export async function getBuddyPost(id) {
  const { data } = await http.get(`/buddies/${id}`)
  return data
}

/** payload: { country, region, startDate, endDate, description, tripId } (datums als ISO op UTC-middernacht). */
export async function createBuddyPost(payload) {
  const { data } = await http.post('/buddies', payload)
  return data
}

export async function updateBuddyPost(id, payload) {
  const { data } = await http.put(`/buddies/${id}`, payload)
  return data
}

export async function closeBuddyPost(id) {
  const { data } = await http.post(`/buddies/${id}/close`)
  return data
}

export async function reopenBuddyPost(id) {
  const { data } = await http.post(`/buddies/${id}/reopen`)
  return data
}

export async function deleteBuddyPost(id) {
  await http.delete(`/buddies/${id}`)
}

export async function getResponses(id) {
  const { data } = await http.get(`/buddies/${id}/responses`)
  return data
}

export async function respond(id, message) {
  const { data } = await http.post(`/buddies/${id}/responses`, { message })
  return data
}
