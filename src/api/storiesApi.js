import http from './http'

/** Niet-verlopen stories van wie je volgt en jezelf, per gebruiker gegroepeerd. */
export async function getStoryFeed() {
  const { data } = await http.get('/stories/feed')
  return data
}

/** payload: { imageUrl, caption, tripId, latitude, longitude, placeName } — locatie alleen als de gebruiker ze deelt. */
export async function createStory(payload) {
  const { data } = await http.post('/stories', payload)
  return data
}

export async function markViewed(storyId) {
  await http.post(`/stories/${storyId}/view`)
}

export async function getViewers(storyId) {
  const { data } = await http.get(`/stories/${storyId}/viewers`)
  return data
}

export async function deleteStory(storyId) {
  await http.delete(`/stories/${storyId}`)
}

/** Recentste gedeelde locatie per reisgenoot voor de reiskaart. */
export async function getLiveLocations(tripId) {
  const { data } = await http.get(`/trips/${tripId}/live`)
  return data
}