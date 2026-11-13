<template>
  <!-- Mobiel: alles wat op desktop in het accountmenu staat (dat menu bestaat op mobiel niet). -->
  <Modal :model-value="modelValue" :title="$t('shell.more.title')" size="sm" :padded="false" @update:model-value="$emit('update:modelValue', $event)">
    <RouterLink :to="`/u/${auth.userName}`" class="flex items-center gap-3 border-b border-line px-5 py-4 transition hover:bg-gray-50" @click="close">
      <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" size="md" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[15px] font-bold text-ink">{{ auth.displayName }}</span>
        <span class="block truncate text-xs text-muted">{{ $t('nav.viewProfile') }}</span>
      </span>
      <Icon name="chevron-right" :size="18" class="text-muted" />
    </RouterLink>

    <nav class="safe-bottom py-1.5" :aria-label="$t('shell.more.title')">
      <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="menu-item px-5 py-3" @click="close">
        <Icon :name="item.icon" :size="19" />
        <span class="flex-1">{{ item.label }}</span>
        <span v-if="item.badge" class="badge">{{ item.badge > 99 ? '99+' : item.badge }}</span>
      </RouterLink>
      <button type="button" class="menu-item px-5 py-3" role="switch" :aria-checked="prefs.isDark" @click="prefs.toggleDark()">
        <Icon :name="prefs.isDark ? 'sun' : 'moon'" :size="19" />
        <span class="flex-1">{{ prefs.isDark ? $t('nav.lightMode') : $t('nav.darkMode') }}</span>
      </button>
      <div class="menu-sep" />
      <button type="button" class="menu-item menu-item-danger px-5 py-3" @click="logout">
        <Icon name="logout" :size="19" /> {{ $t('nav.logout') }}
      </button>
    </nav>
  </Modal>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/Modal.vue'
import Icon from '../ui/Icon.vue'
import Avatar from '../ui/Avatar.vue'
import { features } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import { useCountsStore } from '@/stores/counts'
import { usePreferencesStore } from '@/stores/preferences'

defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'logout'])

const { t } = useI18n()
const auth = useAuthStore()
const counts = useCountsStore()
const prefs = usePreferencesStore()

const items = computed(() => [
  { to: '/invites', icon: 'mail', label: t('nav.invites'), badge: counts.invites },
  { to: '/lists', icon: 'list', label: t('nav.lists') },
  features.buddies && { to: '/buddies', icon: 'users', label: t('buddies.title') },
  features.challenges && { to: '/challenges', icon: 'flag', label: t('challenges.title') },
  features.postcards && { to: '/postcards', icon: 'send', label: t('postcards.title') },
  auth.isAdmin && { to: '/admin', icon: 'shield', label: t('nav.admin') },
  { to: '/settings', icon: 'settings', label: t('nav.settings'), badge: auth.pendingFollowRequests },
].filter(Boolean))

function close() {
  emit('update:modelValue', false)
}

function logout() {
  close()
  emit('logout')
}
</script>
