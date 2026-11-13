<template>
  <section :class="variant === 'card' ? 'card card-pad' : ''">
    <h2 v-if="variant === 'card'" class="card-title mb-3">{{ $t('users.suggestedTitle') }}</h2>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex items-center gap-3">
        <div class="skeleton h-10 w-10 rounded-full" />
        <div class="flex-1 space-y-1.5"><div class="skeleton h-3 w-1/2" /><div class="skeleton h-3 w-1/3" /></div>
      </div>
    </div>

    <p v-else-if="!users.length" class="text-sm text-muted">{{ $t('users.followingEveryone') }}</p>

    <ul v-else :class="variant === 'card' ? 'space-y-1' : 'divide-y divide-line'">
      <li v-for="user in users" :key="user.userName" class="flex items-center gap-3" :class="variant === 'card' ? '-mx-2 rounded-xl p-2 hover:bg-gray-50' : 'py-3'">
        <!-- Zelfde bestemming als de naamlink ernaast: voor schermlezers en toetsenbord één link per persoon. -->
        <RouterLink :to="`/u/${user.userName}`" class="shrink-0" tabindex="-1" aria-hidden="true">
          <Avatar :src="user.profilePhotoUrl" :name="user.displayName" :size="variant === 'card' ? 'md' : 'lg'" />
        </RouterLink>
        <div class="min-w-0 flex-1">
          <RouterLink :to="`/u/${user.userName}`" class="block truncate text-sm font-bold text-ink hover:underline">{{ user.displayName }}</RouterLink>
          <p class="truncate text-xs text-muted">@{{ user.userName }} · {{ $t('users.tripsCount', user.tripsCount) }}</p>
          <p v-if="variant === 'list' && user.bio" class="mt-0.5 line-clamp-2 text-xs text-body">{{ user.bio }}</p>
        </div>
        <button
          type="button"
          class="btn btn-sm shrink-0"
          :class="user.isFollowedByMe ? 'btn-secondary' : 'btn-dark'"
          :disabled="busy === user.userName"
          :aria-pressed="user.isFollowedByMe"
          @click="toggle(user)"
        >
          {{ user.isFollowedByMe ? $t('users.following') : $t('users.follow') }}
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from './ui/Avatar.vue'
import * as userApi from '@/api/userApi'
import * as followApi from '@/api/followApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  take: { type: Number, default: 4 },
  variant: { type: String, default: 'card' }, // card | list
})
const emit = defineEmits(['followed'])

const toast = useToastStore()
const { t } = useI18n()
const users = ref([])
const loading = ref(true)
const busy = ref('')

async function load() {
  loading.value = true
  try {
    users.value = await userApi.getSuggested(props.take)
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

async function toggle(user) {
  busy.value = user.userName
  try {
    const status = await followApi.toggleFollow(user.userName)
    user.isFollowedByMe = status.isFollowing
    emit('followed', { userName: user.userName, following: status.isFollowing })
  } catch (e) {
    toast.error(errorMessage(e, t('users.followFailed')))
  } finally {
    busy.value = ''
  }
}

onMounted(load)
defineExpose({ reload: load, users })
</script>
