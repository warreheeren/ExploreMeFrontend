// Toegankelijkheid: axe-scan (WCAG 2.0/2.1 A + AA) op de belangrijkste pagina's.
// Faalt op schendingen met impact "serious" of "critical"; lichtere meldingen komen alleen in de bijlage.
import AxeBuilder from '@axe-core/playwright'
// test/expect uit de fixtures: die zetten een cookiekeuze vooraf, zodat de banner de scans niet beïnvloedt.
import { expect, test } from './fixtures.js'
import { accountFor, firstTripOf, login } from './helpers.js'

const BLOCKING = new Set(['serious', 'critical'])

/**
 * Bekende schendingen die (nog) niet opgelost zijn, per pagina. Ze laten de test niet falen maar verschijnen als
 * annotatie in het rapport. Haal een regel weg zodra hij opgelost is, zodat hij niet terug kan sluipen.
 */
// Bekende, nog niet opgeloste schendingen per pagina (axe-regel-id's); tonen als annotatie i.p.v. te falen.
const KNOWN_ISSUES = {}

/** Leesbare samenvatting per regel: id, impact, aantal en de eerste paar selectors. */
function summarize(violations) {
  return violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    count: v.nodes.length,
  }))
}

async function scan(page, testInfo, name) {
  // Wachten tot lazy-geladen routes en data er zijn; animaties uit zodat contrast niet halverwege gemeten wordt.
  // (Realtime/polling kan "networkidle" uitstellen; daarom met een korte limiet.)
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Kaarttegels en Leaflet-bediening zijn van derden en hebben geen tekstinhoud om te controleren.
    .exclude('.leaflet-tile-pane')
    .analyze()

  await testInfo.attach(`axe-${name}.json`, { body: JSON.stringify(summarize(results.violations), null, 2), contentType: 'application/json' })
  const known = new Set(KNOWN_ISSUES[name] || [])
  for (const v of results.violations.filter((x) => known.has(x.id))) {
    testInfo.annotations.push({ type: 'known-a11y-issue', description: `${name}: ${v.id} (${v.nodes.length}×) — ${v.help}` })
  }
  const blocking = results.violations.filter((v) => BLOCKING.has(v.impact) && !known.has(v.id))
  expect(summarize(blocking), `ernstige a11y-schendingen op ${name}`).toEqual([])
}

test('login', async ({ page }, testInfo) => {
  await page.goto('/login')
  await expect(page.locator('#login-user')).toBeVisible()
  await scan(page, testInfo, 'login')
})

test.describe('cookiebanner', () => {
  test.use({ seedConsent: false })

  test('banner en instellingen', async ({ page }, testInfo) => {
    await page.goto('/login')
    const banner = page.getByRole('dialog', { name: /privacy/i })
    await expect(banner).toBeVisible()
    await scan(page, testInfo, 'consent-banner')

    // Instellingen openen (modaal venster met schakelaars), dan alleen noodzakelijk kiezen.
    await banner.getByRole('button').nth(2).click()
    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog.getByRole('switch').first()).toBeVisible()
    await scan(page, testInfo, 'consent-settings')
    await page.keyboard.press('Escape')
    await banner.getByRole('button').first().click()
    await expect(banner).toBeHidden()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('consent.v1')).functional)).toBe(false)
  })
})

test.describe('ingelogd', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await login(page, accountFor(testInfo).user)
  })

  test('home', async ({ page }, testInfo) => {
    await expect(page.locator('main article').first()).toBeVisible()
    await scan(page, testInfo, 'home')
  })

  test('reisdetail', async ({ page, request }, testInfo) => {
    const { trip } = await firstTripOf(request, accountFor(testInfo).user)
    await page.goto(`/trips/${trip.id}`)
    await expect(page.getByRole('heading', { level: 1, name: trip.title })).toBeVisible()
    await scan(page, testInfo, 'trip-detail')
  })

  test('ontdekken', async ({ page }, testInfo) => {
    await page.goto('/discover')
    await expect(page.locator('main h1').first()).toBeVisible()
    await scan(page, testInfo, 'discover')
  })

  test('profiel', async ({ page }, testInfo) => {
    const { peer } = accountFor(testInfo)
    await page.goto(`/u/${peer}`)
    await expect(page.locator('main h1').first()).toBeVisible()
    await scan(page, testInfo, 'profile')
  })

  test('instellingen', async ({ page }, testInfo) => {
    await page.goto('/settings')
    await expect(page.locator('#set-name')).toBeVisible()
    await scan(page, testInfo, 'settings')
  })
})
