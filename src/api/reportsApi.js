import http from './http'

/** targetType: 'post' | 'trip' | 'user' | 'comment' | 'buddyPost' | 'placeQuestion' | 'placeAnswer' | 'story' | 'postcard' */
export async function createReport({ targetType, targetId, reason, details }) {
  const { data } = await http.post('/reports', { targetType, targetId, reason, details: details || null })
  return data
}
