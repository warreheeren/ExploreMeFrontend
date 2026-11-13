<template>
  <section v-if="challenges.length || isOwn" class="card" :aria-label="$t('challenges.profileTitle')">
    <header class="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
      <h3 class="card-title flex items-center gap-2"><Icon name="flag" :size="17" /> {{ $t('challenges.profileTitle') }}</h3>
      <RouterLink to="/challenges" class="text-xs font-bold text-accent-700 hover:underline">{{ $t('challenges.link') }}</RouterLink>
    </header>
    <ul v-if="challenges.length" class="space-y-1 px-4 pb-4">
      <li v-for="c in challenges" :key="c.key" class="flex items-center gap-3 rounded-xl p-1.5">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-accent-700 bg-accent-50 text-accent-800"><Icon :name="c.icon" :size="16" /></span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-extrabold text-ink">{{ $t(`challenges.items.${c.key}.name`) }}</span>
          <span v-if="c.completedAtUtc" class="block text-xs text-muted">{{ $t('challenges.completedOn', { date: formatLongDate(c.completedAtUtc) }) }}</span>
        </span>
      </li>
    </ul>
    <p v-else class="px-4 pb-4 text-sm text-muted">{{ $t('challenges.subtitle') }}</p>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import * as challengesApi from '@/api/challengesApi'
import { formatLongDate } from '@/utils/date'

const props = defineProps({
  userName: { type: String, required: true },
  isOwn: { type: Boolean, default: false },
})

const challenges = ref([])

async function load() {
  try {
    challenges.value = await challengesApi.getCompletedChallenges(props.userName)
  } catch {
    challenges.value = []
  }
}

watch(() => props.userName, load, { immediate: true })
</script>
