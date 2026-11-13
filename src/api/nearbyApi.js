import http from './http'

/**
 * Plekken uit publieke reizen rond een punt, beste eerst.
 * exclude: al overgeslagen stop-ids (herhaalde querysleutel, zoals ASP.NET verwacht).
 */
export async function getNearby(lat, lng, { radiusKm = 25, take = 30, exclude = [] } = {}) {
  const { data } = await http.get('/discover/nearby', {
    params: { lat, lng, radiusKm, take, exclude },
    paramsSerializer: { indexes: null },
  })
  return data
}
