import http from './http'

/** Bezochte landen (uit reizen + zelf gemarkeerd) en verlanglijst. → { visitedCount, visited, wishlist } */
export async function getCountries(userName) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}/countries`)
  return data
}

/** status: 'visited' | 'wishlist'. Geeft de bijgewerkte kaart terug. */
export async function markCountry(country, status) {
  const { data } = await http.put(`/users/me/countries/${encodeURIComponent(country)}`, { status })
  return data
}

export async function unmarkCountry(country) {
  const { data } = await http.delete(`/users/me/countries/${encodeURIComponent(country)}`)
  return data
}
