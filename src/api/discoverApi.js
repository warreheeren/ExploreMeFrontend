import http from './http'

/**
 * Zoekt stops van publieke reizen.
 * params: { country?, from?, to?, types?: string[], minLat?, maxLat?, minLon?, maxLon? }
 * Arrays gaan als herhaalde parameters mee (types=A&types=B), zoals ASP.NET verwacht.
 */
export async function searchStops(params = {}) {
  const { data } = await http.get('/discover/stops', {
    params,
    paramsSerializer: { indexes: null },
  })
  return data
}
