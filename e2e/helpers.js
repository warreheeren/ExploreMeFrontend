// Gedeelde helpers voor de e2e-tests. Teksten komen uit de echte vertaalbestanden, zodat tests niet breken
// wanneer een label wijzigt.
import { expect } from '@playwright/test'
import nlSettings from '../src/i18n/locales/nl/settings.js'
import enSettings from '../src/i18n/locales/en/settings.js'
import nlTrip from '../src/i18n/locales/nl/trip.js'
import nlEditor from '../src/i18n/locales/nl/editor.js'
import nlMessages from '../src/i18n/locales/nl/messages.js'
import nlLanding from '../src/i18n/locales/nl/landing.js'
import nlShell from '../src/i18n/locales/nl/shell.js'
import nlNav from '../src/i18n/locales/nl/nav.js'
import nlBudget from '../src/i18n/locales/nl/budget.js'
import nlCommon from '../src/i18n/locales/nl/common.js'

export const t = { nlSettings, enSettings, nlTrip, nlEditor, nlMessages, nlLanding, nlShell, nlNav, nlBudget, nlCommon }

/** Seed-wachtwoord van alle demo-accounts (DataSeeder). */
export const PASSWORD = 'Password123!'

/** Basis-URL van de API voor setup via HTTP (bv. een deellink aanmaken). */
export const API_URL = (process.env.E2E_API_URL || 'http://localhost:5051').replace(/\/+$/, '')

/**
 * Account per project: desktop en mobiel lopen parallel en mogen elkaars gegevens (taal, berichten) niet raken.
 * emma en lucas hebben in de seed-data allebei reizen, posts en volgers.
 */
export function accountFor(testInfo) {
  return testInfo.project.name === 'mobile'
    ? { user: 'lucas.explores', peer: 'emma.reist' }
    : { user: 'emma.reist', peer: 'lucas.explores' }
}

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Logt in via het formulier en wacht tot de tijdlijn geladen is. */
export async function login(page, userName, password = PASSWORD) {
  await page.goto('/login')
  await page.locator('#login-user').fill(userName)
  await page.locator('#login-pass').fill(password)
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/$/)
}

/** Token via de API, voor setup die niet via de UI hoeft. */
export async function apiToken(request, userName, password = PASSWORD) {
  const res = await request.post(`${API_URL}/api/auth/login`, { data: { userName, password } })
  expect(res.ok(), `login ${userName} via API: ${res.status()}`).toBeTruthy()
  return (await res.json()).token
}

/** Eerste reis van de gebruiker (seed-data). */
export async function firstTripOf(request, userName) {
  const token = await apiToken(request, userName)
  const res = await request.get(`${API_URL}/api/trips/user/${encodeURIComponent(userName)}`, { headers: { Authorization: `Bearer ${token}` } })
  expect(res.ok()).toBeTruthy()
  const trips = await res.json()
  expect(trips.length, `${userName} heeft seed-reizen`).toBeGreaterThan(0)
  return { token, trip: trips[0] }
}
