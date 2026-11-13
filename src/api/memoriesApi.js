import http from './http'

/** "Vandaag x jaar geleden": per vorig jaar de reizen, posts en foto's van deze kalenderdag. */
export async function getTodayMemories() {
  const { data } = await http.get('/memories/today')
  return data
}
