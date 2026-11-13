import http from './http'

/** Ontvangen kaarten, nieuwste eerst; before = createdAtUtc van de laatste kaart (volgende pagina). */
export async function getInbox(take = 12, before = null) {
  const { data } = await http.get('/postcards/inbox', { params: { take, before: before || undefined } })
  return data
}

export async function getSent(take = 12, before = null) {
  const { data } = await http.get('/postcards/sent', { params: { take, before: before || undefined } })
  return data
}

export async function getPostcard(id) {
  const { data } = await http.get(`/postcards/${id}`)
  return data
}

/** Accounts met een volgrelatie (in één van beide richtingen), voor het ontvangersveld. */
export async function searchRecipients(q = '') {
  const { data } = await http.get('/postcards/recipients', { params: { q: q || undefined } })
  return data
}

/**
 * payload: { recipientUserId | recipientEmail, tripId, stopId, imageUrl, message, placeName, stampStyle }
 * Precies één van recipientUserId en recipientEmail.
 */
export async function sendPostcard(payload) {
  const { data } = await http.post('/postcards', payload)
  return data
}

export async function markOpened(id) {
  await http.post(`/postcards/${id}/open`)
}

/** Afzender: intrekken. Ontvanger: uit de inbox halen. */
export async function deletePostcard(id) {
  await http.delete(`/postcards/${id}`)
}
