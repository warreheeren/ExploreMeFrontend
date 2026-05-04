import http from './http'

export async function getConversations() {
  const { data } = await http.get('/messages/conversations')
  return data
}

export async function getConversation(userName, take = 200) {
  const { data } = await http.get(`/messages/with/${userName}`, { params: { take } })
  return data
}

export async function sendMessage(userName, text) {
  const { data } = await http.post(`/messages/with/${userName}`, { text })
  return data
}

export async function markConversationRead(userName) {
  await http.post(`/messages/with/${userName}/read`)
}

export async function getUnreadCount() {
  const { data } = await http.get('/messages/unread-count')
  return data
}
