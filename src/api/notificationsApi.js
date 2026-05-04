import http from './http'

export async function getNotifications(take = 30) {
  const { data } = await http.get(`/notifications?take=${take}`)
  return data
}

export async function getUnreadCount() {
  const { data } = await http.get('/notifications/unread-count')
  return data.count
}

export async function markAllRead() {
  await http.post('/notifications/mark-read')
}
