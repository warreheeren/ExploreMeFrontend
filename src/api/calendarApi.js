import http from './http'

// Abonneerbare agenda-feed (.ics) met al je reizen. GET → { enabled, url: null }: de URL is alleen bekend
// direct na POST (aanmaken/vernieuwen), want de server bewaart enkel een hash van het token.

export async function getCalendarFeed() {
  const { data } = await http.get('/users/me/calendar-feed')
  return data
}

/** Zet de feed aan of maakt een nieuwe URL (de oude werkt daarna niet meer). */
export async function regenerateCalendarFeed() {
  const { data } = await http.post('/users/me/calendar-feed')
  return data
}

export async function disableCalendarFeed() {
  await http.delete('/users/me/calendar-feed')
}
