import http from './http'

/** Een via deel-link gedeelde reis; werkt zonder login. */
export async function getSharedTrip(token) {
  const { data } = await http.get(`/public/trips/${encodeURIComponent(token)}`)
  return data
}

/** Ansichtkaart via de link uit de mail; werkt zonder login (geen coördinaten of e-mailadres). */
export async function getPublicPostcard(token) {
  const { data } = await http.get(`/public/postcards/${encodeURIComponent(token)}`)
  return data
}

export async function markPublicPostcardOpened(token) {
  await http.post(`/public/postcards/${encodeURIComponent(token)}/open`)
}

/** Minimale reis voor de insluitbare kaart (/embed/:token); werkt zonder login. */
export async function getEmbedTrip(token) {
  const { data } = await http.get(`/public/embed/trips/${encodeURIComponent(token)}`)
  return data
}
