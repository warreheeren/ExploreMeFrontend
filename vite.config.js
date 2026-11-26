import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const apiTarget = 'https://localhost:7284'

/**
 * Content-Security-Policy als <meta> in de productiebuild (werkt op elke host: nginx, Render, de API-wwwroot).
 * Niet in dev: Vite's HMR gebruikt inline scripts en een websocket.
 * - script: eigen code, Google/Apple-login (alleen geladen als geconfigureerd), tesseract-worker van jsDelivr + WebAssembly
 * - connect/img: https overal (API op een ander domein, kaarttegels, weer, GeoJSON, tessdata, foto-URL's)
 * - frame: 'self' voor de live preview van de embed in de deeldialoog
 * - analytics: alleen met VITE_ANALYTICS_PROVIDER komt de origin van het Plausible/Umami-script erbij (connect-src staat al op https:)
 * frame-ancestors kan niet via <meta>; die staat als header in nginx.conf.template (alleen /embed/* mag geframed worden).
 */
const buildCsp = (statsOrigin, httpApi) => [
  "default-src 'self'",
  `script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com https://appleid.cdn-apple.com https://cdn.jsdelivr.net blob:${statsOrigin ? ` ${statsOrigin}` : ''}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  `img-src 'self' data: blob: https:${httpApi ? ` ${httpApi.http}` : ''}`,
  // Video's/spraakmemo's: eigen uploads (ook vanaf een API op een ander domein) en blob:-previews vóór de upload
  `media-src 'self' blob: https:${httpApi ? ` ${httpApi.http}` : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' https: wss:${httpApi ? ` ${httpApi.http} ${httpApi.ws}` : ''}`,
  "frame-src 'self' https://accounts.google.com https://appleid.apple.com",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://appleid.apple.com",
].join('; ')

// Standaardscripts per provider; zelfde waarden als in src/services/analytics.js.
const ANALYTICS_DEFAULT_SRC = { plausible: 'https://plausible.io/js/script.manual.js', umami: 'https://cloud.umami.is/script.js' }

/** Origin van het statistiekenscript (null zonder provider of bij een script op het eigen domein). */
function analyticsOrigin(env) {
  const provider = String(env.VITE_ANALYTICS_PROVIDER || '').trim().toLowerCase()
  if (!ANALYTICS_DEFAULT_SRC[provider]) return null
  const src = String(env.VITE_ANALYTICS_SRC || '').trim() || ANALYTICS_DEFAULT_SRC[provider]
  try {
    const url = new URL(src)
    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

/**
 * Een expliciet ingestelde API op http:// (lokale ontwikkel-API voor de native app, bv. http://localhost:5051 via
 * `adb reverse`) staat anders buiten de CSP (alleen https:/wss:). Alleen die ene origin komt erbij, nooit "http:" als geheel.
 */
function httpApiOrigin(env) {
  const raw = String(env.VITE_NATIVE_API_URL || env.VITE_API_URL || '').trim()
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' ? { http: url.origin, ws: `ws://${url.host}` } : null
  } catch {
    return null
  }
}

let resolvedEnv = {}
const cspPlugin = {
  name: 'exploreme-csp',
  apply: 'build',
  // config.env bevat de VITE_*-variabelen uit .env-bestanden en de omgeving (zoals de app ze ook ziet).
  configResolved: (config) => { resolvedEnv = config.env || {} },
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp(analyticsOrigin(resolvedEnv), httpApiOrigin(resolvedEnv)) }, injectTo: 'head-prepend' }],
}

export default defineConfig({
  plugins: [
    vue(),
    cspPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ExploreMe',
        short_name: 'ExploreMe',
        description: "Eén plek voor je groepsreis: plannen, stemmen, kosten delen en foto's bewaren. Je vrienden doen mee zonder account.",
        lang: 'nl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F6F8',
        theme_color: '#0F766E',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // "Delen naar ExploreMe" in het deelmenu van het OS (alleen na installatie). De POST wordt door app-sw.js
        // afgevangen; ShareView (/share) leest het resultaat uit Cache Storage.
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [{ name: 'files', accept: ['image/*', 'video/*', 'application/pdf', '.pdf', 'text/plain'] }],
          },
        },
      },
      workbox: {
        // Eigen SW-code: pushmeldingen + de share-target-handler (POST /share-target → Cache Storage → /share?id=…).
        importScripts: ['app-sw.js'],
        navigateFallback: '/index.html',
        // /embed/ niet via de service worker: de gecachte index.html draagt de headers van "/" (frame-ancestors 'none').
        // /share-target is een POST die app-sw.js zelf afhandelt; nooit de app-shell teruggeven.
        navigateFallbackDenylist: [/^\/embed\//, /^\/api\//, /^\/hubs\//, /^\/uploads\//, /^\/swagger/, /^\/app-sw\.js$/, /^\/share-target/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // pdf.js (boekingsimport) is groot en alleen online nuttig: niet voor iedereen precachen.
        globIgnores: ['**/pdf-*.js', '**/pdf.worker*'],
        runtimeCaching: [
          {
            // Spraakmemo's (/uploads/audio/) niet: alleen online beschikbaar, en <audio> gebruikt range-requests.
            urlPattern: ({ url }) =>
              (url.pathname.startsWith('/uploads/') && !url.pathname.startsWith('/uploads/audio/')) ||
              url.hostname === 'images.unsplash.com' ||
              url.hostname === 'randomuser.me',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Kaarttegels ({z}/{x}/{y}.png): CacheFirst met ≥ 7 dagen bewaren, zoals de OSM-tegelrichtlijn vraagt.
            urlPattern: ({ url, request }) =>
              url.hostname.endsWith('tile.openstreetmap.org') ||
              (request.destination === 'image' && /\/\d+\/\d+\/\d+(@2x)?\.(png|jpe?g|webp)$/.test(url.pathname)),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Reisgegevens voor offline gebruik (zie services/offlineTrip.js, dat dezelfde cache vooraf vult).
            // Alleen GET-leesendpoints van één reis; downloads van bijlagen blijven no-store.
            urlPattern: ({ url }) =>
              /^\/api\/trips\/[0-9a-fA-F-]{36}(\/(route|weather|journal|posts|comments|stop-photos|recap|checklist|budget|attachments|polls))?$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'trip-data',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
              // De cache-sleutel is de URL; Authorization/Accept-Language-headers mogen niet verschillen.
              matchOptions: { ignoreVary: true },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Testuitvoer en de native build niet volgen: Playwright schrijft het rapport terwijl de dev-server draait (EBUSY op Windows).
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/android/**', '**/dist/**'] },
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true, secure: false },
      '/uploads': { target: apiTarget, changeOrigin: true, secure: false },
      '/hubs': { target: apiTarget, changeOrigin: true, secure: false, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
    setupFiles: ['src/test/setup.js'],
    // Uitgeschakelde functies (src/config/features.js) blijven in de tests aan, zodat hun code gedekt blijft.
    env: { VITE_FEATURES: 'all' },
  },
})
