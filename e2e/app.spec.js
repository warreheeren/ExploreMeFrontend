// Kernflows met de seed-accounts: inloggen/uitloggen, tijdlijn, reis-tabs, reis maken, bericht sturen,
// taal/thema wisselen en de publieke deelpagina.
// test/expect uit de fixtures: die zetten een cookiekeuze vooraf, zodat de banner geen knoppen bedekt.
import { expect, test } from './fixtures.js'
import { API_URL, accountFor, escapeRegExp, firstTripOf, login, t } from './helpers.js'

test('inloggen en weer uitloggen', async ({ page }, testInfo) => {
  const { user } = accountFor(testInfo)
  await login(page, user)

  await page.goto('/settings?tab=account')
  await page.getByRole('button', { name: t.nlSettings.logout.title }).last().click()
  await expect(page).toHaveURL(/\/login/)

  // Uitgelogd: beschermde pagina's sturen terug naar de login.
  await page.goto('/trips')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('verkeerd wachtwoord toont een foutmelding', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#login-user').fill('emma.reist')
  await page.locator('#login-pass').fill('fout-wachtwoord')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('de tijdlijn toont posts', async ({ page }, testInfo) => {
  await login(page, accountFor(testInfo).user)
  await expect(page.locator('main article').first()).toBeVisible()
  expect(await page.locator('main article').count()).toBeGreaterThan(0)
})

test('reis-tabs wisselen en zijn deelbaar via ?tab=', async ({ page, request }, testInfo) => {
  const { user } = accountFor(testInfo)
  const { trip } = await firstTripOf(request, user)
  await login(page, user)

  await page.goto(`/trips/${trip.id}`)
  await expect(page.getByRole('heading', { level: 1, name: trip.title })).toBeVisible()
  const itinerary = page.getByRole('tab', { name: new RegExp(escapeRegExp(t.nlTrip.tabs.itinerary)) })
  await itinerary.click()
  await expect(page).toHaveURL(/[?&]tab=dagschema/)
  await expect(itinerary).toHaveAttribute('aria-selected', 'true')

  // Rechtstreeks openen met ?tab= selecteert meteen het juiste tabblad.
  await page.goto(`/trips/${trip.id}?tab=posts`)
  await expect(page.getByRole('tab', { name: new RegExp(escapeRegExp(t.nlTrip.tabs.posts)) })).toHaveAttribute('aria-selected', 'true')
})

test('een reis met een stop aanmaken', async ({ page }, testInfo) => {
  await login(page, accountFor(testInfo).user)
  const title = `E2E-reis ${Date.now()}`

  await page.goto('/trips/new')
  await page.locator('#trip-title').fill(title)
  await page.locator('#trip-country').fill('Slovenië')
  await page.locator('#trip-start').fill('2027-05-01')
  await page.locator('#trip-end').fill('2027-05-05')

  // Klik op de kaart voegt een stop toe; de naam vullen we zelf in (reverse geocoding kan traag zijn).
  const map = page.locator('[role="application"]').first()
  await map.scrollIntoViewIfNeeded()
  await map.click()
  const stopName = page.locator('[id^="stop-name-"]').first()
  await expect(stopName).toBeVisible()
  await stopName.fill('E2E-stop Bled')

  await page.getByRole('button', { name: t.nlEditor.saveTrip }).click()
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  await expect(page.getByText('E2E-stop Bled').first()).toBeVisible()
})

test('een privébericht sturen', async ({ page }, testInfo) => {
  const { user, peer } = accountFor(testInfo)
  await login(page, user)
  const text = `Hallo vanuit de e2e-test ${Date.now()}`

  await page.goto(`/messages/${peer}`)
  const input = page.locator('#msg-input')
  await input.fill(text)
  await input.press('Enter')

  // exact: de gesprekkenlijst toont het ook als voorbeeld ("Jij: …").
  await expect(page.getByText(text, { exact: true })).toBeVisible()
  await expect(page.getByText(t.nlMessages.notSent)).toHaveCount(0)
  await expect(input).toHaveValue('')
})

test('taal naar Engels en thema naar donker in de instellingen', async ({ page }, testInfo) => {
  await login(page, accountFor(testInfo).user)
  await page.goto('/settings?tab=weergave')

  await page.getByRole('radio', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1, name: t.enSettings.title })).toBeVisible()

  await page.getByRole('radio', { name: t.enSettings.display.themes.dark }).click()
  await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)

  // Blijft bewaard na herladen (per toestel).
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)

  // Terugzetten: de taalkeuze wordt ook op de server bewaard (voor e-mails).
  await page.getByRole('radio', { name: 'Nederlands' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl')
})

test('de publieke deelpagina werkt zonder login', async ({ page, request }, testInfo) => {
  const { user } = accountFor(testInfo)
  const { token, trip } = await firstTripOf(request, user)
  const res = await request.post(`${API_URL}/api/trips/${trip.id}/share`, { headers: { Authorization: `Bearer ${token}` } })
  expect(res.ok()).toBeTruthy()
  const { shareToken } = await res.json()

  // Elke test krijgt een verse browsercontext: er is geen sessie, de pagina mag niet naar /login sturen.
  await page.goto(`/share/${shareToken}`)
  await expect(page).toHaveURL(new RegExp(`/share/${shareToken}$`))
  await expect(page.getByRole('heading', { level: 1, name: trip.title })).toBeVisible()
})

test('bezoekers zien de landingspagina en kunnen een openbare reis lezen', async ({ page, request }, testInfo) => {
  const { user } = accountFor(testInfo)
  const { trip } = await firstTripOf(request, user)

  // Geen sessie: "/" is de landingspagina, niet de login.
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1, name: t.nlLanding.headline })).toBeVisible()
  await expect(page.getByRole('link', { name: t.nlLanding.cta }).first()).toHaveAttribute('href', '/register')

  // Een reislink van een lid opent voor bezoekers de leesweergave in plaats van de login.
  await page.goto(`/trips/${trip.id}`)
  await expect(page).toHaveURL(new RegExp(`/t/${trip.id}$`))
  await expect(page.getByRole('heading', { level: 1, name: trip.title })).toBeVisible()
})

test('functies die uit staan zijn niet bereikbaar', async ({ page }, testInfo) => {
  await login(page, accountFor(testInfo).user)
  await page.goto('/buddies')
  await expect(page.getByRole('link', { name: 'Reisbuddies' })).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText('Reisbuddies')
})

test('mobiel: het Meer-scherm geeft toegang tot uitnodigingen en instellingen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'alleen de mobiele tabbalk heeft "Meer"')
  await login(page, accountFor(testInfo).user)
  await page.getByRole('button', { name: t.nlShell.tabs.more }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('link', { name: t.nlNav.settings })).toBeVisible()
  await sheet.getByRole('link', { name: t.nlNav.invites }).click()
  await expect(page).toHaveURL(/\/invites$/)
})

test('budget: een uitgave die een reisgenoot intussen wijzigde wordt niet stil overschreven', async ({ page, request }, testInfo) => {
  const { user } = accountFor(testInfo)
  const { token, trip } = await firstTripOf(request, user)
  const headers = { Authorization: `Bearer ${token}` }
  const title = `E2E-uitgave ${testInfo.project.name} ${Date.now()}`
  const created = await request.post(`${API_URL}/api/trips/${trip.id}/expenses`, {
    headers,
    data: { title, amount: 10, category: 'Other', date: new Date().toISOString(), currency: 'EUR' },
  })
  expect(created.ok(), `uitgave aanmaken: ${created.status()} ${await created.text()}`).toBeTruthy()
  const expense = await created.json()

  await login(page, user)
  await page.goto(`/trips/${trip.id}?tab=budget`)
  await page.getByRole('button', { name: t.nlBudget.editExpense.replace('{title}', title) }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Intussen wijzigt "iemand anders" dezelfde uitgave via de API: de versie loopt op.
  const other = await request.put(`${API_URL}/api/trips/${trip.id}/expenses/${expense.id}`, {
    headers,
    data: { title: `${title} (gewijzigd)`, amount: 12, category: 'Other', date: expense.date, currency: 'EUR', version: expense.version },
  })
  expect(other.ok(), `tussentijdse wijziging: ${other.status()}`).toBeTruthy()

  // Opslaan met de verouderde versie: het formulier sluit en de actuele uitgave staat in de lijst.
  await dialog.getByRole('button', { name: t.nlCommon.save }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(`${title} (gewijzigd)`).first()).toBeVisible()

  // Opruimen (zonder versie = altijd toegestaan).
  await request.delete(`${API_URL}/api/trips/${trip.id}/expenses/${expense.id}`, { headers })
})
