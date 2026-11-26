<template>
  <header
    class="safe-top sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur transition-transform duration-300 md:translate-y-0"
    :class="hidden ? '-translate-y-full' : 'translate-y-0'"
  >
    <div class="mx-auto flex h-16 max-w-content items-center gap-3 px-4 sm:px-6">
      <RouterLink to="/" class="shrink-0" :aria-label="features.feed ? $t('nav.homeAria') : $t('myTrips.homeAria')" @click="onHomeClick">
        <Logo />
      </RouterLink>

      <div v-if="features.discover" class="mx-4 hidden max-w-sm flex-1 md:block">
        <GlobalSearch />
      </div>

      <nav class="ml-auto flex items-center gap-1" :aria-label="$t('nav.main')">
        <!-- Actieve veiligheids-check-in: aftellen + "ik ben veilig" -->
        <SafetyStatusChip class="mr-1" />

        <!-- Desktop-navigatie -->
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="hidden h-10 w-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition md:inline-flex xl:w-auto xl:px-3"
          :class="item.active ? 'bg-accent-50 text-accent-700' : 'text-body hover:bg-gray-100 hover:text-ink'"
          :aria-label="item.label"
          :aria-current="item.active ? 'page' : undefined"
          :title="item.label"
        >
          <span class="relative">
            <Icon :name="item.icon" :size="20" />
            <span v-if="item.badge" class="badge absolute -right-2.5 -top-2">{{ item.badge > 99 ? '99+' : item.badge }}</span>
          </span>
          <span class="hidden xl:inline" aria-hidden="true">{{ item.label }}</span>
        </RouterLink>

        <!-- Mobiel: zoeken + berichten -->
        <button v-if="features.discover" type="button" class="btn-icon md:hidden" :aria-label="$t('nav.search')" @click="mobileSearchOpen = true">
          <Icon name="search" :size="22" />
        </button>
        <!-- Zonder tijdlijn staan berichten en meldingen op mobiel in de tabbalk onderaan. -->
        <RouterLink v-if="features.feed" to="/messages" class="btn-icon relative md:hidden" :aria-label="$t('nav.messages')">
          <Icon name="chat" :size="22" />
          <span v-if="counts.messages" class="badge absolute right-0.5 top-0.5">{{ counts.messages > 9 ? '9+' : counts.messages }}</span>
        </RouterLink>

        <!-- Meldingen -->
        <div v-click-outside="() => (notifOpen = false)" class="relative" :class="features.feed ? '' : 'hidden md:block'">
          <button
            type="button"
            class="relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition"
            :class="notifOpen ? 'bg-accent-50 text-accent-700' : 'text-body hover:bg-gray-100 hover:text-ink'"
            :aria-label="notif.unreadCount ? $t('nav.notificationsUnread', { n: notif.unreadCount }) : $t('nav.notifications')"
            :aria-expanded="notifOpen"
            @click="toggleNotifications"
          >
            <Icon name="bell" :size="22" />
            <span v-if="notif.unreadCount" class="badge absolute right-0.5 top-0.5">{{ notif.unreadCount > 99 ? '99+' : notif.unreadCount }}</span>
          </button>
          <div v-if="notifOpen && isDesktop" class="absolute right-0 top-full z-50 mt-2 h-[min(560px,75vh)] w-96 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
            <NotificationsPanel @close="notifOpen = false" />
          </div>
        </div>

        <!-- Nieuw (desktop): alleen met de tijdlijn, waar je ook een post maakt. In de groepsversie staat "Nieuwe reis"
             op het startscherm en de veiligheids-check-in in het accountmenu. -->
        <div v-if="features.feed" v-click-outside="() => (createOpen = false)" class="relative ml-1 hidden md:block">
          <button type="button" class="btn btn-primary btn-sm h-9" :aria-expanded="createOpen" @click="createOpen = !createOpen">
            <Icon name="plus" :size="16" :stroke-width="2.5" /> {{ $t('nav.new') }}
          </button>
          <div v-if="createOpen" class="menu right-0 top-full mt-2 w-64" role="menu">
            <button v-if="features.feed" type="button" class="menu-item" role="menuitem" @click="newPost">
              <Icon name="image" :size="18" />
              <span><span class="block font-bold text-ink">{{ $t('nav.newPost') }}</span><span class="block text-xs font-medium text-muted">{{ $t('nav.newPostHint') }}</span></span>
            </button>
            <RouterLink to="/trips/start" class="menu-item" role="menuitem" @click="createOpen = false">
              <Icon name="map" :size="18" />
              <span><span class="block font-bold text-ink">{{ $t('nav.newTrip') }}</span><span class="block text-xs font-medium text-muted">{{ $t('nav.newTripHint') }}</span></span>
            </RouterLink>
            <button v-if="!safety.active" type="button" class="menu-item" role="menuitem" @click="openSafety">
              <Icon name="shield" :size="18" />
              <span><span class="block font-bold text-ink">{{ $t('safety.title') }}</span><span class="block text-xs font-medium text-muted">{{ $t('safety.menuHint') }}</span></span>
            </button>
          </div>
        </div>

        <!-- Account (desktop) -->
        <div v-click-outside="() => (accountOpen = false)" class="relative ml-1 hidden md:block">
          <button type="button" class="relative rounded-full p-0.5 transition hover:ring-2 hover:ring-line" :aria-expanded="accountOpen" :aria-label="$t('nav.accountMenu')" @click="accountOpen = !accountOpen">
            <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" size="sm" />
            <span v-if="counts.invites || (features.follows && auth.pendingFollowRequests)" class="dot-badge right-0 top-0" />
          </button>
          <div v-if="accountOpen" class="menu right-0 top-full mt-2 w-64" role="menu">
            <RouterLink :to="`/u/${auth.userName}`" class="flex items-center gap-3 border-b border-line px-4 pb-3 pt-2 hover:bg-gray-50" role="menuitem" @click="accountOpen = false">
              <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" size="md" />
              <span class="min-w-0">
                <span class="block truncate text-sm font-bold text-ink">{{ auth.displayName }}</span>
                <span class="block truncate text-xs text-muted">{{ $t('nav.viewProfile') }}</span>
              </span>
            </RouterLink>
            <div class="pt-1.5">
              <button v-if="auth.isGuest" type="button" class="menu-item font-bold text-accent-700" role="menuitem" @click="accountOpen = false; openGuestSave()">
                <Icon name="lock" :size="18" /> {{ $t('join.save.menu') }}
              </button>
              <template v-if="!features.feed">
                <RouterLink to="/trips/start" class="menu-item" role="menuitem" @click="accountOpen = false">
                  <Icon name="plus" :size="18" /> {{ $t('nav.newTrip') }}
                </RouterLink>
                <button v-if="!safety.active" type="button" class="menu-item" role="menuitem" @click="accountOpen = false; openSafety()">
                  <Icon name="shield" :size="18" /> {{ $t('safety.title') }}
                </button>
              </template>
              <RouterLink to="/invites" class="menu-item" role="menuitem" @click="accountOpen = false">
                <Icon name="mail" :size="18" /> <span class="flex-1">{{ $t('nav.invites') }}</span>
                <span v-if="counts.invites" class="badge">{{ counts.invites }}</span>
              </RouterLink>
              <RouterLink v-if="features.postcards" to="/postcards" class="menu-item" role="menuitem" @click="accountOpen = false">
                <Icon name="send" :size="18" /> {{ $t('postcards.title') }}
              </RouterLink>
              <RouterLink v-if="features.lists" to="/lists" class="menu-item" role="menuitem" @click="accountOpen = false">
                <Icon name="list" :size="18" /> {{ $t('nav.lists') }}
              </RouterLink>
              <RouterLink v-if="features.challenges" to="/challenges" class="menu-item" role="menuitem" @click="accountOpen = false">
                <Icon name="flag" :size="18" /> {{ $t('challenges.title') }}
              </RouterLink>
              <RouterLink v-if="auth.isAdmin" to="/admin" class="menu-item" role="menuitem" @click="accountOpen = false">
                <Icon name="shield" :size="18" /> {{ $t('nav.admin') }}
              </RouterLink>
              <RouterLink to="/settings" class="menu-item" role="menuitem" @click="accountOpen = false">
                <Icon name="settings" :size="18" /> <span class="flex-1">{{ $t('nav.settings') }}</span>
                <span v-if="features.follows && auth.pendingFollowRequests" class="badge">{{ auth.pendingFollowRequests }}</span>
              </RouterLink>
              <button type="button" class="menu-item" role="menuitemcheckbox" :aria-checked="prefs.isDark" @click="prefs.toggleDark()">
                <Icon :name="prefs.isDark ? 'sun' : 'moon'" :size="18" /> {{ prefs.isDark ? $t('nav.lightMode') : $t('nav.darkMode') }}
              </button>
              <div class="menu-sep" />
              <button type="button" class="menu-item menu-item-danger" role="menuitem" @click="$emit('logout')">
                <Icon name="logout" :size="18" /> {{ $t('nav.logout') }}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>

    <SafetyCheckInDialog v-model="safetyOpen" />

    <!-- Mobiel: zoeken -->
    <Teleport to="body">
      <div v-if="mobileSearchOpen" class="fixed inset-0 z-[90] flex flex-col bg-surface px-4 pb-4 pt-3 md:hidden">
        <div class="mb-3 flex items-center gap-2">
          <button type="button" class="btn-icon -ml-2" :aria-label="$t('common.back')" @click="mobileSearchOpen = false"><Icon name="arrow-left" :size="20" /></button>
          <p class="text-base font-bold">{{ $t('nav.search') }}</p>
        </div>
        <GlobalSearch panel autofocus class="min-h-0 flex-1" @navigate="mobileSearchOpen = false" />
      </div>
      <div v-if="notifOpen && !isDesktop" class="fixed inset-0 z-[90] bg-surface md:hidden">
        <NotificationsPanel closable @close="notifOpen = false" />
      </div>
    </Teleport>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Logo from '../ui/Logo.vue'
import Icon from '../ui/Icon.vue'
import Avatar from '../ui/Avatar.vue'
import GlobalSearch from './GlobalSearch.vue'
import NotificationsPanel from './NotificationsPanel.vue'
import SafetyStatusChip from '../safety/SafetyStatusChip.vue'
import SafetyCheckInDialog from '../safety/SafetyCheckInDialog.vue'
import { useSafetyStore } from '@/stores/safety'
import { features } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useCountsStore } from '@/stores/counts'
import { usePreferencesStore } from '@/stores/preferences'
import { lockScroll, unlockScroll } from '@/utils/scrollLock'
import { openGuestSave } from '@/composables/useGuestSave'

defineProps({
  hidden: { type: Boolean, default: false },
})
const emit = defineEmits(['logout', 'home-click'])

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notif = useNotificationsStore()
const counts = useCountsStore()
const prefs = usePreferencesStore()
const safety = useSafetyStore()
const safetyOpen = ref(false)

function openSafety() {
  createOpen.value = false
  safetyOpen.value = true
}

const notifOpen = ref(false)
const createOpen = ref(false)
const accountOpen = ref(false)
const mobileSearchOpen = ref(false)
const isDesktop = ref(typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true)

const onTripPage = computed(() => String(route.name || '').startsWith('trip') && route.name !== 'trip-chat')
// Zonder tijdlijn is "/" het startscherm "Mijn reizen" en heet die ingang gewoon Reizen.
const navItems = computed(() => [
  features.feed
    ? { to: '/', label: t('nav.timeline'), icon: 'home', active: route.name === 'home' }
    : { to: '/', label: t('myTrips.nav'), icon: 'map', active: route.name === 'home' || onTripPage.value },
  features.feed && { to: '/trips', label: t('nav.trips'), icon: 'map', active: onTripPage.value },
  features.discover && { to: '/discover', label: t('nav.discover'), icon: 'compass', active: route.name === 'discover' || route.name === 'place' },
  features.buddies && { to: '/buddies', label: t('buddies.title'), icon: 'users', active: route.name === 'buddies' },
  { to: '/messages', label: t('nav.messages'), icon: 'chat', active: String(route.name || '').startsWith('message') || route.name === 'trip-chat', badge: counts.messages },
].filter(Boolean))

// De mobiele tabbalk opent het meldingenpaneel via App.vue.
defineExpose({ openNotifications: () => { if (!notifOpen.value) toggleNotifications() } })

function toggleNotifications() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) {
    // Gelezen markeren gebeurt na het tonen, zodat de "nieuw"-markering eerst zichtbaar is.
    setTimeout(() => notif.markAllRead(), 1500)
  }
}

function newPost() {
  createOpen.value = false
  if (route.name !== 'home') router.push('/').then(() => setTimeout(() => window.dispatchEvent(new CustomEvent('focus-create-post')), 150))
  else window.dispatchEvent(new CustomEvent('focus-create-post'))
}

function onHomeClick() {
  emit('home-click')
}

const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)') : null
const onMq = (e) => { isDesktop.value = e.matches }
onMounted(() => mq?.addEventListener('change', onMq))
onBeforeUnmount(() => mq?.removeEventListener('change', onMq))

watch(() => route.fullPath, () => {
  notifOpen.value = false
  createOpen.value = false
  accountOpen.value = false
  mobileSearchOpen.value = false
})

// Volledig-scherm overlays op mobiel blokkeren het scrollen van de pagina eronder.
let overlayLocked = false
watch([mobileSearchOpen, () => notifOpen.value && !isDesktop.value], ([search, sheet]) => {
  const shouldLock = search || sheet
  if (shouldLock && !overlayLocked) {
    lockScroll()
    overlayLocked = true
  } else if (!shouldLock && overlayLocked) {
    unlockScroll()
    overlayLocked = false
  }
})
onBeforeUnmount(() => {
  if (overlayLocked) unlockScroll()
})
</script>
