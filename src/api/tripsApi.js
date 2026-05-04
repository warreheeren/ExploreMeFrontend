import http from './http'

export async function getAllTrips(take = 50) {
  const { data } = await http.get('/trips', { params: { take } })
  return data
}

export async function getTripById(tripId) {
  const { data } = await http.get(`/trips/${tripId}`)
  return data
}

export async function getUserTrips(username, take = 50) {
  const { data } = await http.get(`/trips/user/${username}`, { params: { take } })
  return data
}

export async function createTrip(tripData) {
  const { data } = await http.post('/trips', tripData)
  return data
}

export async function updateTrip(tripId, tripData) {
  const { data } = await http.put(`/trips/${tripId}`, tripData)
  return data
}

export async function deleteTrip(tripId) {
  await http.delete(`/trips/${tripId}`)
}

export async function cloneTrip(tripId) {
  const { data } = await http.post(`/trips/${tripId}/clone`)
  return data
}

export async function toggleBookmark(tripId) {
  const { data } = await http.post(`/trips/${tripId}/bookmark`)
  return data
}

export async function getBookmarkedTrips(take = 50) {
  const { data } = await http.get('/trips/bookmarks', { params: { take } })
  return data
}
