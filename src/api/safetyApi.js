import http from './http'

/** De actieve veiligheids-check-in, of null. */
export async function getActive() {
  const res = await http.get('/safety/active')
  return res.status === 204 ? null : res.data || null
}

/** payload: { description, dueAtUtc, emergencyContactName, emergencyContactEmail, tripId, graceMinutes, timeZone, saveAsDefaultContact } */
export async function start(payload) {
  const { data } = await http.post('/safety', payload)
  return data
}

/** "Ik ben veilig". */
export async function checkIn(id) {
  const { data } = await http.post(`/safety/${id}/check-in`)
  return data
}

export async function extend(id, minutes) {
  const { data } = await http.post(`/safety/${id}/extend`, { minutes })
  return data
}

export async function cancel(id) {
  const { data } = await http.post(`/safety/${id}/cancel`)
  return data
}

export async function updateLocation(id, latitude, longitude) {
  const { data } = await http.put(`/safety/${id}/location`, { latitude, longitude })
  return data
}

/** Standaard noodcontact: { name, email } (beide null = geen). */
export async function getDefaultContact() {
  const { data } = await http.get('/safety/default-contact')
  return data
}

export async function updateDefaultContact(contact) {
  const { data } = await http.put('/safety/default-contact', contact)
  return data
}
