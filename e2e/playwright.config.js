// End-to-end- en toegankelijkheidstests (Playwright + axe).
// Verwacht een draaiende frontend (E2E_BASE_URL) die praat met een API met verse seed-data (E2E_API_URL).
// Lokaal met de geïnstalleerde Chrome: PW_CHANNEL=chrome; in CI de meegeleverde Chromium (npx playwright install chromium).
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const channel = process.env.PW_CHANNEL === 'chrome' ? 'chrome' : undefined

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  outputDir: '../test-results/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : 2,
  reporter: [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel,
    // De app kiest zijn taal op basis van de browser: vast op Nederlands zodat tests voorspelbaar zijn.
    locale: 'nl-NL',
    timezoneId: 'Europe/Brussels',
    screenshot: 'only-on-failure',
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    // Smalste ondersteunde breedte (390 px) met touch, op Chromium zodat er geen WebKit nodig is.
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, channel } },
  ],
})
