<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
      <h2 class="text-base font-bold text-ink">{{ $t('nav.notifications') }}</h2>
      <div class="flex items-center gap-1">
        <button v-if="notif.unreadCount > 0" type="button" class="btn btn-ghost btn-sm text-accent-700" @click="notif.markAllRead()">{{ $t('nav.markAllRead') }}</button>
        <RouterLink to="/settings?tab=meldingen" class="btn-icon btn-icon-sm" :aria-label="$t('nav.notificationSettings')" :title="$t('nav.notificationSettings')" @click="$emit('close')"><Icon name="settings" :size="16" /></RouterLink>
        <button v-if="closable" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.close')" @click="$emit('close')"><Icon name="x" :size="18" /></button>
      </div>
    </header>

    <RouterLink
      v-if="counts.invites > 0"
      to="/invites"
      class="flex items-center gap-3 border-b border-line bg-accent-50 px-4 py-3 text-sm font-bold text-accent-800 hover:bg-accent-100"
      @click="$emit('close')"
    >
      <Icon name="mail" :size="18" />
      {{ $t('nav.invitesWaiting', counts.invites) }}
      <Icon name="chevron-right" :size="16" class="ml-auto" />
    </RouterLink>
    <RouterLink
      v-if="auth.pendingFollowRequests > 0"
      to="/settings?tab=privacy"
      class="flex items-center gap-3 border-b border-line bg-accent-50 px-4 py-3 text-sm font-bold text-accent-800 hover:bg-accent-100"
      @click="$emit('close')"
    >
      <Icon name="user" :size="18" />
      {{ $t('nav.requestsWaiting', auth.pendingFollowRequests) }}
      <Icon name="chevron-right" :size="16" class="ml-auto" />
    </RouterLink>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="notif.loading && !notif.items.length" class="flex justify-center py-10"><Spinner /></div>
      <EmptyState v-else-if="!notif.items.length" bare icon="bell" :title="$t('nav.noNotifications')" :text="$t('nav.noNotificationsText')" />
      <ul v-else>
        <li v-for="n in notif.items" :key="n.id">
          <RouterLink
            :to="notificationLink(n)"
            class="flex items-start gap-3 px-4 py-3 transition hover:bg-gray-50"
            :class="n.isRead ? '' : 'bg-accent-50/60'"
            @click="$emit('close')"
          >
            <span class="relative shrink-0">
              <span v-if="isSystemNotification(n)" class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-800"><Logo :size="22" :with-text="false" /></span>
              <Avatar v-else :src="n.actorProfilePhotoUrl" :name="n.actorDisplayName" size="md" />
              <span class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-ink text-surface">
                <Icon :name="notificationIcon(n)" :size="10" :stroke-width="2.5" />
              </span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm leading-snug text-ink">
                <template v-if="!isSystemNotification(n)"><span class="font-extrabold">{{ n.actorDisplayName }}</span> </template>{{ notificationText(n) }}
              </span>
              <span v-if="notificationContext(n)" class="mt-0.5 block truncate text-xs text-muted">“{{ notificationContext(n) }}”</span>
              <span class="mt-0.5 block text-xs font-semibold text-muted">{{ timeAgo(n.createdAtUtc) }}</span>
            </span>
            <span v-if="!n.isRead" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-700" :aria-label="$t('nav.unread')" />
          </RouterLink>
        </li>
      </ul>
      <div v-if="notif.items.length && !notif.done" class="p-3 text-center">
        <button type="button" class="btn btn-ghost btn-sm" :disabled="notif.loadingMore" @click="notif.loadMore()">{{ notif.loadingMore ? $t('common.loading') : $t('common.loadMore') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import Avatar from '../ui/Avatar.vue'
import Icon from '../ui/Icon.vue'
import Logo from '../ui/Logo.vue'
import Spinner from '../ui/Spinner.vue'
import EmptyState from '../ui/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useCountsStore } from '@/stores/counts'
import { isSystemNotification, notificationContext, notificationIcon, notificationLink, notificationText } from '@/utils/notifications'
import { timeAgo } from '@/utils/date'

defineProps({
  closable: { type: Boolean, default: false },
})
defineEmits(['close'])

const auth = useAuthStore()
const notif = useNotificationsStore()
const counts = useCountsStore()

onMounted(() => notif.fetchNotifications())
</script>
