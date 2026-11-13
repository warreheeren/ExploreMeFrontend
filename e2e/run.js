// Start Playwright met de e2e-config. Extra argumenten gaan door (bv. `npm run test:e2e -- --project=mobile`).
//
// PW_DISABLE_TS_ESM: Playwright 1.48 registreert een ESM-loader voor TypeScript die op recente Node-versies
// (o.a. Node 24) blijft hangen bij het laden van .js-testbestanden in een "type": "module"-pakket. Onze tests
// zijn gewoon JavaScript, dus die transformatie is niet nodig. Via dit script werkt het ook op Windows
// (geen `VAR=x cmd` in npm-scripts).
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')

const child = spawn(process.execPath, [cli, 'test', '-c', join(here, 'playwright.config.js'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, PW_DISABLE_TS_ESM: '1' },
})
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1))
