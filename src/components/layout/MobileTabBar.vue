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
        <Icon :name="item.icon" :size="22" />
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
        <Avatar v-if="item.avatar" :src="auth.profilePhotoUrl" :name="auth.displayName" :size="24" :class="item.active ? 'ring-2 ring-accent-700' : ''" />
        <Icon v-else :name="item.icon" :size="22" />
        {{ item.label }}
      </RouterLink>
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

defineEmits(['create', 'home-click'])

const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()

const left = computed(() => [
  { to: '/', label: t('shell.tabs.home'), icon: 'home', active: route.name === 'home' },
  { to: '/trips', label: t('shell.tabs.trips'), icon: 'map', active: String(route.name || '').startsWith('trip') && route.name !== 'trip-chat' },
])
const right = computed(() => [
  { to: '/discover', label: t('shell.tabs.discover'), icon: 'compass', active: route.name === 'discover' },
  { to: `/u/${auth.userName}`, label: t('shell.tabs.profile'), avatar: true, active: route.name === 'profile' && route.params.username === auth.userName },
])
</script>
