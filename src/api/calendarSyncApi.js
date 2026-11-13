import http from './http'

// Agenda-sync met Google Agenda / Outlook (OAuth, server-side). De status bevat alleen providers met een
// geconfigureerde client-id; tokens komen nooit naar de frontend.

/** [{ provider: 'google'|'microsoft', connected, accountEmail, connectedAtUtc, lastSyncedAtUtc, error: null|'reauth'|'failed', pending }] */
export async function getCalendarSyncStatus() {
  const { data } = await http.get('/calendar-sync')
  return data
}

/** Geeft de URL van het toestemmingsscherm; de browser moet daarheen (de provider stuurt terug naar /settings#calendar). */
export async function connectCalendar(provider) {
  const { data } = await http.post(`/calendar-sync/${encodeURIComponent(provider)}/connect`)
  return data.url
}

/** Synct meteen en geeft de bijgewerkte status van die provider terug. */
export async function syncCalendarNow(provider) {
  const { data } = await http.post(`/calendar-sync/${encodeURIComponent(provider)}/sync`)
  return data
}

export async function disconnectCalendar(provider, removeEvents) {
  await http.delete(`/calendar-sync/${encodeURIComponent(provider)}`, { params: { removeEvents: !!removeEvents } })
}
