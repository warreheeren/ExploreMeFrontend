import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { t } from '@/i18n'
import { features, isFeatureEnabled } from '@/config/features'

// meta.layout: 'app' (standaard, met navigatie) | 'auth' | 'public' | 'print' | 'bare' | 'embed' (in een iframe op andere sites)
// meta.titleKey: vertaalsleutel voor de paginatitel (vertaald in afterEach, zodat hij de actieve taal volgt)
const routes = [
  // Landingspagina voor bezoekers; ingelogd "Mijn reizen", of de tijdlijn met de vlag `feed` (RootView kiest); daarom geen requiresAuth.
  { path: '/', name: 'home', component: () => import('@/views/RootView.vue'), meta: { titleKey: features.feed ? 'routes.home' : 'myTrips.title' } },

  // Account
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guestOnly: true, layout: 'auth', titleKey: 'routes.login' } },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { guestOnly: true, layout: 'auth', titleKey: 'routes.register' } },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/ForgotPasswordView.vue'), meta: { guestOnly: true, layout: 'auth', titleKey: 'routes.forgotPassword' } },
  { path: '/reset-password', name: 'reset-password', component: () => import('@/views/ResetPasswordView.vue'), meta: { layout: 'auth', titleKey: 'routes.resetPassword' } },
  { path: '/welcome', name: 'welcome', component: () => import('@/views/OnboardingView.vue'), meta: { requiresAuth: true, layout: 'bare', titleKey: 'routes.welcome' } },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { requiresAuth: true, titleKey: 'routes.settings' } },

  // Sociaal
  { path: '/u/:username', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/posts/:id', name: 'post', component: () => import('@/views/PostView.vue'), meta: { feature: 'feed', requiresAuth: true, titleKey: 'routes.post' } },
  { path: '/messages', name: 'messages', component: () => import('@/views/MessagesView.vue'), meta: { requiresAuth: true, titleKey: 'routes.messages' } },
  { path: '/messages/trip/:tripId', name: 'trip-chat', component: () => import('@/views/MessagesView.vue'), meta: { requiresAuth: true, titleKey: 'routes.tripChat' } },
  { path: '/messages/:userName', name: 'message-thread', component: () => import('@/views/MessagesView.vue'), meta: { requiresAuth: true, titleKey: 'routes.messageThread' } },
  { path: '/postcards', name: 'postcards', component: () => import('@/views/PostcardsView.vue'), meta: { feature: 'postcards', requiresAuth: true, titleKey: 'postcards.title' } },
  { path: '/invites', name: 'invites', component: () => import('@/views/InvitesView.vue'), meta: { requiresAuth: true, titleKey: 'routes.invites' } },
  // "Delen naar ExploreMe": doel van de share_target (via app-sw.js). De login-redirect bewaart ?id= in `redirect`.
  { path: '/share', name: 'share-target', component: () => import('@/views/ShareView.vue'), meta: { feature: 'feed', requiresAuth: true, titleKey: 'shareTarget.routeTitle' } },

  // Reizen
  // Publieke reizen van iedereen (vlag `discover`); zonder die vlag toont TripsRootView "Mijn reizen".
  { path: '/trips', name: 'trips', component: () => import('@/views/TripsRootView.vue'), meta: { requiresAuth: true, titleKey: features.discover ? 'routes.trips' : 'myTrips.title' } },
  // Korte start van een groepsreis (titel + data of datumprikker); de uitgebreide editor blijft op /trips/new.
  { path: '/trips/start', name: 'trip-start', component: () => import('@/views/StartTripView.vue'), meta: { requiresAuth: true, titleKey: 'startTrip.title' } },
  { path: '/trips/new', name: 'trip-create', component: () => import('@/views/CreateTripView.vue'), meta: { requiresAuth: true, titleKey: 'routes.tripCreate' } },
  { path: '/trips/plan-ai', name: 'trip-ai-plan', component: () => import('@/views/AiPlanView.vue'), meta: { requiresAuth: true, titleKey: 'ai.routeTitle' } },
  { path: '/trips/:id/edit', name: 'trip-edit', component: () => import('@/views/CreateTripView.vue'), meta: { requiresAuth: true, titleKey: 'routes.tripEdit' } },
  { path: '/trips/:id/photobook', name: 'trip-photobook', component: () => import('@/views/PhotobookView.vue'), meta: { requiresAuth: true, layout: 'print', titleKey: 'photobook.routeTitle' } },
  { path: '/trips/:id/print', name: 'trip-print', component: () => import('@/views/TripPrintView.vue'), meta: { requiresAuth: true, layout: 'print', titleKey: 'routes.tripPrint' } },
  { path: '/trips/:id/today', name: 'trip-today', component: () => import('@/views/TodayView.vue'), meta: { requiresAuth: true, titleKey: 'today.routeTitle' } },
  { path: '/trips/:id/recap', name: 'trip-recap', component: () => import('@/views/TripRecapView.vue'), meta: { requiresAuth: true, layout: 'bare' } },
  { path: '/trips/:id', name: 'trip-detail', component: () => import('@/views/TripDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/places/:stopId', name: 'place', component: () => import('@/views/PlaceView.vue'), meta: { feature: 'discover', requiresAuth: true, titleKey: 'routes.place' } },
  { path: '/lists', name: 'lists', component: () => import('@/views/ListsView.vue'), meta: { feature: 'lists', requiresAuth: true, titleKey: 'routes.lists' } },
  { path: '/lists/:id', name: 'list', component: () => import('@/views/ListView.vue'), meta: { feature: 'lists', requiresAuth: true, titleKey: 'routes.list' } },
  { path: '/discover', name: 'discover', component: () => import('@/views/DiscoverView.vue'), meta: { feature: 'discover', requiresAuth: true, titleKey: 'routes.discover' } },
  { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue'), meta: { feature: 'discover', requiresAuth: true, titleKey: 'search.routeTitle' } },
  { path: '/discover/nearby', name: 'nearby', component: () => import('@/views/NearbyView.vue'), meta: { feature: 'nearby', requiresAuth: true, titleKey: 'nearby.routeTitle' } },

  // Sociale extra's: reisgenoten, challenges en de plekpagina bij een melding over een vraag
  { path: '/buddies', name: 'buddies', component: () => import('@/views/BuddiesView.vue'), meta: { feature: 'buddies', requiresAuth: true, titleKey: 'buddies.title' } },
  { path: '/challenges', name: 'challenges', component: () => import('@/views/ChallengesView.vue'), meta: { feature: 'challenges', requiresAuth: true, titleKey: 'challenges.title' } },
  { path: '/places/qa/:tripId', name: 'place-qa', component: () => import('@/views/PlaceQaRedirectView.vue'), meta: { feature: 'placeQa', requiresAuth: true, titleKey: 'routes.place' } },

  // Moderatie (de API controleert de rol; de guard houdt alleen de navigatie netjes)
  { path: '/admin', name: 'admin', component: () => import('@/views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true, titleKey: 'routes.admin' } },

  // Publiek gedeelde reis (geen login nodig)
  { path: '/privacy', name: 'privacy', component: () => import('@/views/LegalView.vue'), meta: { layout: 'bare', legalDoc: 'privacy', titleKey: 'legal.privacy.title' } },
  { path: '/terms', name: 'terms', component: () => import('@/views/LegalView.vue'), meta: { layout: 'bare', legalDoc: 'terms', titleKey: 'legal.terms.title' } },
  { path: '/cookies', name: 'cookies', component: () => import('@/views/LegalView.vue'), meta: { layout: 'bare', legalDoc: 'cookies', titleKey: 'legal.cookies.title' } },
  { path: '/privacy-rights', name: 'privacy-rights', component: () => import('@/views/LegalView.vue'), meta: { layout: 'bare', legalDoc: 'rights', titleKey: 'legal.rights.title' } },
  // Openbare reis lezen zonder account (bezoekers die /trips/:id openen komen hier terecht).
  // Uitnodigingslink: preview + meedoen, ook zonder account (dus geen requiresAuth en geen guestOnly).
  // Geen cookiebanner op deze eerste indruk: zonder keuze laadt de app alleen het noodzakelijke (Google vraagt zelf
  // toestemming via de knop), en de banner verschijnt zodra de bezoeker in de app zit.
  { path: '/join/:token', name: 'join-trip', component: () => import('@/views/JoinTripView.vue'), meta: { layout: 'public', titleKey: 'join.routeTitle', consentBanner: false } },
  { path: '/t/:id', name: 'public-trip', component: () => import('@/views/SharedTripView.vue'), meta: { layout: 'public', titleKey: 'routes.sharedTrip' } },
  { path: '/share/:token', name: 'shared-trip', component: () => import('@/views/SharedTripView.vue'), meta: { layout: 'public', titleKey: 'routes.sharedTrip' } },
  { path: '/postcard/:token', name: 'public-postcard', component: () => import('@/views/PublicPostcardView.vue'), meta: { feature: 'postcards', layout: 'public', titleKey: 'postcards.public.routeTitle' } },
  // Insluitbare kaart voor andere sites (de enige route die geframed mag worden, zie nginx.conf.template)
  { path: '/embed/:token', name: 'embed-trip', component: () => import('@/views/EmbedTripView.vue'), meta: { feature: 'embed', layout: 'embed', titleKey: 'embed.routeTitle' } },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { titleKey: 'routes.notFound' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Uitgeschakelde functie (zie config/features.js): de route bestaat niet voor de bezoeker.
  if (!isFeatureEnabled(to.meta.feature)) {
    return { name: 'not-found', params: { pathMatch: to.path.split('/').filter(Boolean) }, query: to.query, hash: to.hash }
  }

  // Een reis is zonder account leesbaar als hij openbaar is: bezoekers naar de leesweergave, leden naar de volledige pagina.
  if (to.name === 'trip-detail' && !auth.isAuthenticated) return { name: 'public-trip', params: { id: to.params.id } }
  if (to.name === 'public-trip' && auth.isAuthenticated) return { name: 'trip-detail', params: { id: to.params.id } }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home' }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' }
  }
  // Nieuwe accounts eerst door de onboarding (bestaande sessies niet).
  if (auth.isAuthenticated && auth.onboardingCompleted === false && (to.meta.requiresAuth || to.name === 'home') && to.name !== 'welcome') {
    // Iets gedeeld via het OS-deelmenu? Na de onboarding verder naar die gedeelde inhoud (?id= bewaren).
    return to.name === 'share-target' ? { name: 'welcome', query: { redirect: to.fullPath } } : { name: 'welcome' }
  }
  return true
})

router.afterEach((to) => {
  if (to.meta.titleKey) document.title = `${t(to.meta.titleKey)} · ExploreMe`
})

export default router
