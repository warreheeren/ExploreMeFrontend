<template>
  <Modal :model-value="modelValue" :title="mode === 'followers' ? $t('profile.followers') : $t('profile.following')" size="sm" :padded="false" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="loading" class="space-y-2 p-4"><div v-for="i in 4" :key="i" class="skeleton h-12 rounded-xl" /></div>
    <p v-else-if="!users.length" class="p-6 text-center text-sm text-muted">{{ mode === 'followers' ? $t('profile.noFollowers') : $t('profile.noFollowing') }}</p>
    <ul v-else class="divide-y divide-line">
      <li v-for="u in users" :key="u.userName" class="flex items-center gap-3 px-4 py-3">
        <RouterLink :to="`/u/${u.userName}`" class="flex min-w-0 flex-1 items-center gap-3" @click="$emit('update:modelValue', false)">
          <Avatar :src="u.profilePhotoUrl" :name="u.displayName" size="md" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-bold text-ink">{{ u.displayName }}</span>
            <span class="block truncate text-xs text-muted">@{{ u.userName }}</span>
          </span>
        </RouterLink>
        <span v-if="u.isMe" class="text-xs font-bold text-muted">{{ $t('common.you') }}</span>
        <button v-else-if="isOwn && mode === 'followers'" type="button" class="btn btn-ghost btn-sm" @click="removeFollower(u)">{{ $t('profile.removeFollower') }}</button>
        <span v-else-if="u.isFollowedByMe" class="chip chip-muted h-6">{{ $t('profile.followingState') }}</span>
      </li>
    </ul>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Avatar from '@/components/ui/Avatar.vue'
import * as userApi from '@/api/userApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  userName: { type: String, required: true },
  /** 'followers' | 'following' */
  mode: { type: String, default: 'followers' },
  isOwn: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'changed'])

const { t } = useI18n()
const toast = useToastStore()
const users = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    users.value = props.mode === 'followers' ? await userApi.getFollowers(props.userName) : await userApi.getFollowing(props.userName)
  } catch (e) {
    users.value = []
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

async function removeFollower(u) {
  const ok = await confirm({ title: t('profile.removeFollowerTitle', { name: u.displayName }), message: t('profile.removeFollowerText'), confirmLabel: t('profile.removeFollower'), variant: 'danger' })
  if (!ok) return
  try {
    await userApi.removeFollower(u.userName)
    users.value = users.value.filter((x) => x.userName !== u.userName)
    emit('changed')
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

watch(() => props.modelValue, (open) => { if (open) load() })
</script>
