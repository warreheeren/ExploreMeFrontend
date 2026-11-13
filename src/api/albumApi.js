import http from './http'

// Gedeeld fotoalbum per reis. Een foto wordt eerst opgeladen via /upload/image, daarna gekoppeld.

export async function getPhotos(tripId) {
  const { data } = await http.get(`/trips/${tripId}/photos`)
  return data
}

/** Upload met voortgang (0–1); geeft de URL van de (verkleinde) foto terug. */
export async function uploadAlbumImage(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.min(1, e.loaded / e.total))
    },
  })
  return data.url
}

/** payload: { imageUrl, caption?, takenAtUtc?, latitude?, longitude?, tripStopId? } */
export async function addPhoto(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/photos`, payload)
  return data
}

/** payload: { caption, tripStopId } — volledige nieuwe staat (leeg = wissen). */
export async function updatePhoto(tripId, photoId, payload) {
  const { data } = await http.patch(`/trips/${tripId}/photos/${photoId}`, payload)
  return data
}

export async function deletePhoto(tripId, photoId) {
  await http.delete(`/trips/${tripId}/photos/${photoId}`)
}
