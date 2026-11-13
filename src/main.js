import '@fontsource-variable/manrope'
import './style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { clickOutside } from './directives/clickOutside'
import { usePreferencesStore } from './stores/preferences'
import { useConsentStore } from './stores/consent'
import { setupAnalytics } from './services/analytics'
import { isNative } from './services/native'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(i18n)
app.use(router)
app.directive('click-outside', clickOutside)
usePreferencesStore(pinia).init()

// Toestemming: keuzes uit andere tabbladen volgen; statistieken alleen met configuratie én toestemming
// (vóór het mounten, zodat router.afterEach ook de eerste pagina ziet).
// De embed (iframe op andere sites) toont geen banner en telt dus ook niets.
if (!window.location.pathname.startsWith('/embed/')) {
  const consent = useConsentStore(pinia)
  consent.syncAcrossTabs()
  setupAnalytics({ router, consent })
}

app.mount('#app')

// Native app (Capacitor): push-tik, inkomend delen en terugknop. Dynamisch, zodat de web-bundle er niets van laadt.
if (isNative) {
  import('./services/nativeApp')
    .then(({ setupNativeApp }) => setupNativeApp({ router }))
    .catch((err) => console.error('Native app-setup mislukt', err))
}

// Service worker (PWA + pushmeldingen) alleen in productie-builds; in dev zou caching het werken hinderen.
// Niet voor de embed (iframe op een andere site): die moet licht blijven en niets offline cachen.
// Niet in de native app: Capacitor serveert de bestanden lokaal en push loopt via FCM/APNs.
if (import.meta.env.PROD && !isNative && 'serviceWorker' in navigator && !window.location.pathname.startsWith('/embed/')) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => { /* PWA is optioneel */ })
}
