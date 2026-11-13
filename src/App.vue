<template>
  <div class="min-h-screen bg-ground">
    <OfflineBanner v-if="layout !== 'print' && layout !== 'embed'" />
    <template v-if="layout === 'app' && auth.isAuthenticated">
      <!-- Pull-to-refresh indicator (mobiel) -->
      <div
        class="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center md:hidden"
        :style="{ transform: `translateY(${Math.max(0, (refreshing ? 64 : pull) - 36)}px)`, opacity: pull > 4 || refreshing ? 1 : 0, transition: pulling ? 'none' : 'transform .25s ease, opacity .2s ease' }"
        aria-hidden="true"
      >
        <span class="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-pop">
          <Icon name="refresh" :size="18" :class="refreshing ? 'animate-spin' : ''" :style="refreshing ? {} : { transform: `rotate(${Math.min(180, pull * 2.5)}deg)` }" />
        </span>
      </div>

      <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-surface">{{ $t('nav.skipToContent') }}</a>

      <AppHeader :hidden="headerHidden" @logout="logout" @home-click="onHomeClick" />
      <EmailVerifyBanner />

      <main id="main" class="mx-auto w-full max-w-content px-4 pb-28 pt-5 sm:px-6 md:pb-14 md:pt-8">
        <RouterView />
      </main>

      <footer class="hidden border-t border-line bg-surface md:block">
        <div class="mx-auto flex max-w-content items-center justify-between gap-4 px-6 py-6 text-sm">
          <div class="flex items-center gap-3">
            <Logo :size="22" />
            <span class="text-muted">© {{ year }}</span>
          </div>
          <nav class="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 font-semibold text-muted" :aria-label="$t('nav.footer')">
            <RouterLink to="/" class="hover:text-ink">{{ $t('nav.timeline') }}</RouterLink>
            <RouterLink to="/trips" class="hover:text-ink">{{ $t('nav.trips') }}</RouterLink>
            <RouterLink to="/discover" class="hover:text-ink">{{ $t('nav.discover') }}</RouterLink>
            <RouterLink to="/lists" class="hover:text-ink">{{ $t('nav.lists') }}</RouterLink>
            <RouterLink to="/settings" class="hover:text-ink">{{ $t('nav.settings') }}</RouterLink>
            <RouterLink to="/privacy" class="hover:text-ink">{{ $t('legal.footer.privacy') }}</RouterLink>
            <RouterLink to="/terms" class="hover:text-ink">{{ $t('legal.footer.terms') }}</RouterLink>
            <RouterLink to="/cookies" class="hover:text-ink">{{ $t('legal.footer.cookies') }}</RouterLink>
            <button type="button" class="font-semibold hover:text-ink" @click="consent.openSettings()">{{ $t('legal.footer.cookieSettings') }}</button>
          </nav>
        </div>
      </footer>

      <MobileTabBar @create="createOpen = true" @more="moreOpen = true" @home-click="onHomeClick" />
      <MoreSheet v-model="moreOpen" @logout="logout" />
      <CreateSheet v-model="createOpen" @post="newPostFromSheet" />
    </template>

    <RouterView v-else />

    <ToastHost />
    <ConfirmHost />
    <!-- Niet in de embed (iframe op andere sites) en niet op afdrukpagina's. -->
    <ConsentBanner v-if="!isEmbed && !isConsentExemptLayout(layout)" :above-tab-bar="layout === 'app' && auth.isAuthenticated" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import MobileTabBar from '@/components/layout/MobileTabBar.vue'
import CreateSheet from '@/components/layout/CreateSheet.vue'
import MoreSheet from '@/components/layout/MoreSheet.vue'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmHost from '@/components/ConfirmHost.vue'
import Icon from '@/components/ui/Icon.vue'
import Logo from '@/components/ui/Logo.vue'
import EmailVerifyBanner from '@/components/layout/EmailVerifyBanner.vue'
import OfflineBanner from '@/components/layout/OfflineBanner.vue'
import ConsentBanner from '@/components/layout/ConsentBanner.vue'
import { useConsentStore } from '@/stores/consent'
import { isConsentExemptLayout } from '@/utils/consent'
import { useI18n } from 'vue-i18n'
import { resyncPush } from '@/services/push'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useCountsStore } from '@/stores/counts'
import { useToastStore } from '@/stores/toast'
import { useSafetyStore } from '@/stores/safety'
import { onRealtime, startRealtime, stopRealtime } from '@/services/realtime'
import { isSystemNotification, notificationLink, notificationText } from '@/utils/notifications'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notif = useNotificationsStore()
const counts = useCountsStore()
const toast = useToastStore()
const safety = useSafetyStore()
const consent = useConsentStore()
const { t } = useI18n()

const year = new Date().getFullYear()
const layout = computed(() => route.meta.layout || 'app')
// De embed draait in een iframe op andere sites: geen sessie, realtime, push of gebaren.
// Via het pad (niet route.meta), want de eerste route is bij de setup nog niet opgelost.
const isEmbed = window.location.pathname.startsWith('/embed/')
const createOpen = ref(false)
const moreOpen = ref(false)

// ---------- sessie: realtime + polling ----------
const unsubscribers = []

function bindRealtime() {
  unsubscribers.push(
    onRealtime('notification', (n) => {
      notif.push(n)
      const text = isSystemNotification(n) ? notificationText(n) : `${n.actorDisplayName} ${notificationText(n)}`
      toast.info(text, { action: { label: t('common.view'), to: notificationLink(n) } })
      if (n.type === 'follow_request') auth.pendingFollowRequests += 1
      if (n.type === 'safety_reminder') safety.load()
    }),
    onRealtime('counts', (p) => {
      counts.apply(p)
      notif.setUnread(p?.notifications)
    }),
    onRealtime('connected', () => {
      counts.refresh()
      notif.fetchUnreadCount()
    }),
  )
}

watch(() => auth.isAuthenticated, (loggedIn) => {
  if (isEmbed) return
  if (loggedIn) {
    startRealtime(() => auth.token)
    // Polling blijft als vangnet wanneer de realtime-verbinding wegvalt.
    notif.startPolling(60000)
    counts.startPolling(60000)
    auth.loadMe()
    resyncPush()
    safety.load()
  } else {
    stopRealtime()
    notif.reset()
    counts.reset()
    safety.reset()
  }
}, { immediate: true })

function onVisibility() {
  if (document.visibilityState === 'visible' && auth.isAuthenticated) {
    counts.refresh()
    notif.fetchUnreadCount()
    safety.load()
  }
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

// ---------- verberg header bij scrollen (mobiel) ----------
const headerHidden = ref(false)
let lastY = 0

function onScroll() {
  const y = window.scrollY
  if (window.innerWidth >= 768 || y < 80) headerHidden.value = false
  else if (y > lastY + 8) headerHidden.value = true
  else if (y < lastY - 4) headerHidden.value = false
  lastY = y
}

// ---------- pull-to-refresh (mobiel) ----------
const pull = ref(0)
const pulling = ref(false)
const refreshing = ref(false)
let startY = 0

function onTouchStart(e) {
  if (window.innerWidth >= 768 || window.scrollY > 0 || refreshing.value || document.body.style.overflow === 'hidden') return
  startY = e.touches[0].clientY
  pulling.value = true
}

function onTouchMove(e) {
  if (!pulling.value) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0) {
    pull.value = 0
    return
  }
  pull.value = Math.min(130, dy * 0.5)
  if (pull.value > 4 && e.cancelable) e.preventDefault()
}

function onTouchEnd() {
  if (!pulling.value) return
  pulling.value = false
  if (pull.value >= 70) triggerRefresh()
  pull.value = 0
}

function triggerRefresh() {
  refreshing.value = true
  window.dispatchEvent(new CustomEvent('app-refresh'))
  counts.refresh()
  notif.fetchUnreadCount()
  setTimeout(() => { refreshing.value = false }, 900)
}

function onHomeClick() {
  if (route.name === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    triggerRefresh()
  }
}

function newPostFromSheet() {
  createOpen.value = false
  const focus = () => window.dispatchEvent(new CustomEvent('focus-create-post'))
  if (route.name !== 'home') router.push('/').then(() => setTimeout(focus, 150))
  else focus()
}

onMounted(() => {
  if (isEmbed) return
  bindRealtime()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
})

onBeforeUnmount(() => {
  unsubscribers.forEach((off) => off())
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
})
</script>
