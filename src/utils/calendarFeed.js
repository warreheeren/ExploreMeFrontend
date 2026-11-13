// Links voor het agenda-abonnement.

/** https://… → webcal://… (opent de standaard agenda-app met "abonneren"). */
export function toWebcalUrl(url) {
  if (!url) return ''
  return String(url).replace(/^https?:\/\//i, 'webcal://')
}

/** Google Agenda: "Toevoegen via URL" met de webcal-link. */
export function googleCalendarUrl(url) {
  if (!url) return ''
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(toWebcalUrl(url))}`
}
