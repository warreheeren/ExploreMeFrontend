import http from './http'

export async function listCollaborators(tripId) {
  const { data } = await http.get(`/trips/${tripId}/collaborators`)
  return data
}

export async function inviteCollaborator(tripId, userName) {
  const { data } = await http.post(`/trips/${tripId}/collaborators`, { userName })
  return data
}

export async function removeCollaborator(tripId, userName) {
  await http.delete(`/trips/${tripId}/collaborators/${encodeURIComponent(userName)}`)
}

export async function leaveTrip(tripId) {
  await http.delete(`/trips/${tripId}/collaborators/me`)
}

export async function respondToInvite(tripId, accept) {
  await http.post(`/trips/${tripId}/collaborators/respond`, { accept })
}

export async function getMyInvites() {
  const { data } = await http.get('/trips/invites')
  return data
}

export async function getInviteCount() {
  const { data } = await http.get('/trips/invites/count')
  return data.count
}

export async function getCollaboratingTrips(take = 50) {
  const { data } = await http.get('/trips/collaborating', { params: { take } })
  return data
}
