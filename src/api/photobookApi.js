import http from './http'

// Het bewaarde fotoboek van een reis: instellingen en aanpassingen die de hele groep deelt.

/** { format, photosPerPage, density, includeText, title, subtitle, coverPhotoId, overrides, updatedByDisplayName, updatedAtUtc, version } of null (204). */
export async function getPhotobook(tripId) {
  const { data, status } = await http.get(`/trips/${tripId}/photobook`)
  return status === 204 || !data ? null : data
}

/** Bewaart het hele boek. `version` = de versie die je zag (0 = nog geen bewaard boek); 409 als iemand anders voor was. */
export async function savePhotobook(tripId, payload) {
  const { data } = await http.put(`/trips/${tripId}/photobook`, payload)
  return data
}

/** Feiten voor de groepspagina's: { people, decisions, facts }. Alleen voor deelnemers (anders 403). */
export async function getPhotobookExtras(tripId) {
  const { data } = await http.get(`/trips/${tripId}/photobook/extras`)
  return data
}

/** Terug naar het voorstel van de app. */
export async function resetPhotobook(tripId) {
  await http.delete(`/trips/${tripId}/photobook`)
}
