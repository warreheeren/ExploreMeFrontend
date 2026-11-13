import http from './http'

/** Nieuwste eerst; before = createdAtUtc van de laatste melding (volgende pagina). */
export async function getNotifications(take = 30, before = null) {
  const { data } = await http.get('/notifications', { params: { take, before: before || undefined } })
  return data
}

export async function getUnreadCount() {
  const { data } = await http.get('/notifications/unread-count')
  return data.count
}

export async function markAllRead() {
  await http.post('/notifications/mark-read')
}

// ---------- Web Push ----------

export async function getPushConfig() {
  const { data } = await http.get('/notifications/push/config')
  return data
}

/** subscription: PushSubscription.toJSON() → { endpoint, keys: { p256dh, auth } } */
export async function subscribePush(subscription) {
  await http.post('/notifications/push/subscribe', subscription)
}

export async function unsubscribePush(endpoint) {
  await http.post('/notifications/push/unsubscribe', { endpoint })
}

export async function sendTestPush() {
  await http.post('/notifications/push/test')
}

// ---------- Native app (FCM) ----------

/** platform: 'android' | 'ios'; token: FCM-registratietoken van dit toestel. */
export async function registerNativePush(platform, token) {
  await http.post('/push/native', { platform, token })
}

export async function unregisterNativePush(token) {
  await http.delete('/push/native', { data: { token } })
}