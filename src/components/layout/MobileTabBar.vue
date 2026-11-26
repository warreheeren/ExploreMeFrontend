<template>
  <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur safe-bottom md:hidden" :aria-label="$t('shell.quickMenu')">
    <div class="flex h-16 items-stretch justify-around px-2">
      <RouterLink
        v-for="item in left"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
        :class="item.active ? 'text-accent-700' : 'text-muted'"
        :aria-current="item.active ? 'page' : undefined"
        @click="item.to === '/' && $emit('home-click')"
      >
        <span class="relative">
          <Icon :name="item.icon" :size="22" />
          <span v-if="item.badge" class="badge absolute -right-2.5 -top-2">{{ item.badge > 9 ? '9+' : item.badge }}</span>
        </span>
        {{ item.label }}
      </RouterLink>

      <div class="flex flex-1 items-center justify-center">
        <button type="button" class="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-surface ring-4 ring-ground transition active:scale-95" :aria-label="$t('shell.createSomething')" @click="$emit('create')">
          <Icon name="plus" :size="24" :stroke-width="2.5" />
        </button>
      </div>

      <RouterLink
        v-for="item in right"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
        :class="item.active ? 'text-accent-700' : 'text-muted'"
        :aria-current="item.active ? 'page' : undefined"
      >
        <span class="relative">
          <Icon :name="item.icon" :size="22" />
          <span v-if="item.badge" class="badge absolute -right-2.5 -top-2">{{ item.badge > 9 ? '9+' : item.badge }}</span>
        </span>
        {{ item.label }}
      </RouterLink>

      <!-- Zonder tijdlijn: meldingen als eigen tab (het belletje in de kop is dan op mobiel verborgen). -->
      <button v-if="!features.feed" type="button" class="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-muted" aria-haspopup="dialog" @click="$emit('notifications')">
        <span class="relative">
          <Icon name="bell" :size="22" />
          <span v-if="notif.unreadCount" class="badge absolute -right-2.5 -top-2">{{ notif.unreadCount > 9 ? '9+' : notif.unreadCount }}</span>
        </span>
        {{ $t('myTrips.navNotifications') }}
      </button>

      <!-- Meer: profiel, uitnodigingen, lijsten, instellingen (op desktop het accountmenu) -->
      <button
        type="button"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
        :class="moreActive ? 'text-accent-700' : 'text-muted'"
        aria-haspopup="dialog"
        @click="$emit('more')"
      >
        <span class="relative">
          <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" :size="24" :class="moreActive ? 'ring-2 ring-accent-700' : ''" />
          <span v-if="counts.invites || (features.follows && auth.pendingFollowRequests)" class="dot-badge -right-1 -top-0.5" />
        </span>
        {{ $t('shell.tabs.more') }}
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import Avatar from '../ui/Avatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useCountsStore } from '@/stores/counts'
import { useNotificationsStore } from '@/stores/notifications'
import { features } from '@/config/features'

defineEmits(['create', 'home-click', 'more', 'notifications'])

const route = useRoute()
const auth = useAuthStore()
const counts = useCountsStore()
const notif = useNotificationsStore()
const { t } = useI18n()

const onTripPage = computed(() => String(route.name || '').startsWith('trip') && route.name !== 'trip-chat')
// Zonder tijdlijn (groepsreis-app): Reizen · Berichten · ＋ · Meldingen · Meer.
const left = computed(() => (features.feed
  ? [
      { to: '/', label: t('shell.tabs.home'), icon: 'home', active: route.name === 'home' },
      { to: '/trips', label: t('shell.tabs.trips'), icon: 'map', active: onTripPage.value },
    ]
  : [
      { to: '/', label: t('myTrips.nav'), icon: 'map', active: route.name === 'home' || onTripPage.value },
      { to: '/messages', label: t('nav.messages'), icon: 'chat', active: String(route.name || '').startsWith('message') || route.name === 'trip-chat', badge: counts.messages },
    ]))
const right = computed(() => (features.feed && features.discover
  ? [{ to: '/discover', label: t('shell.tabs.discover'), icon: 'compass', active: route.name === 'discover' }]
  : []))
// Alles wat achter "Meer" zit licht die tab op.
const moreActive = computed(() =>
  ['invites', 'lists', 'list', 'settings', 'admin', 'postcards', 'challenges', 'buddies'].includes(route.name)
  || (route.name === 'profile' && route.params.username === auth.userName))
</script>
