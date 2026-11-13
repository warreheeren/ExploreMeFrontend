<template>
  <Modal
    :model-value="modelValue"
    :title="challenge ? $t('challenges.leaderboardTitle', { name: $t(`challenges.items.${challenge.key}.name`) }) : ''"
    :subtitle="$t('challenges.leaderboardHint')"
    size="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="loading" class="space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-12" /></div>
    <p v-else-if="entries.length <= 1 && !entries.some((e) => !e.isMe)" class="mb-3 text-sm text-muted">{{ $t('challenges.leaderboardEmpty') }}</p>
    <ol v-if="!loading && entries.length" class="divide-y divide-line">
      <li v-for="e in entries" :key="e.userName" class="flex items-center gap-3 py-2.5" :class="e.isMe ? 'font-extrabold' : ''">
        <span class="w-6 text-center text-sm font-bold tabular-nums text-muted">{{ e.rank }}</span>
        <RouterLink :to="`/u/${e.userName}`" @click="$emit('update:modelValue', false)"><Avatar :src="e.profilePhotoUrl" :name="e.displayName" size="sm" /></RouterLink>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm text-ink">{{ e.displayName }} <span v-if="e.isMe" class="text-xs font-bold text-accent-700">({{ $t('challenges.you') }})</span></span>
          <span class="mt-1 block h-1.5 overflow-hidden rounded-full bg-gray-100"><span class="block h-full rounded-full bg-accent-700" :style="{ width: `${pct(e)}%` }" /></span>
        </span>
        <span class="shrink-0 text-xs font-bold tabular-nums text-muted">
          <Icon v-if="e.completed" name="check" :size="14" class="inline text-accent-700" />
          {{ e.progress.toLocaleString(localeTag()) }} / {{ challenge.target.toLocaleString(localeTag()) }}
        </span>
      </li>
    </ol>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import * as challengesApi from '@/api/challengesApi'
import { localeTag } from '@/i18n'
import { challengeProgressPercent } from '@/utils/socialExtras'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  challenge: { type: Object, default: null },
})
defineEmits(['update:modelValue'])

const entries = ref([])
const loading = ref(false)

function pct(entry) {
  return challengeProgressPercent({ progress: entry.progress, target: props.challenge?.target, completed: entry.completed })
}

watch(() => [props.modelValue, props.challenge?.key], async ([open]) => {
  if (!open || !props.challenge) return
  loading.value = true
  try {
    entries.value = await challengesApi.getLeaderboard(props.challenge.key)
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
})
</script>
