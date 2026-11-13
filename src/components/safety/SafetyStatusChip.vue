<template>
  <div v-if="safety.active" v-click-outside="() => (open = false)" class="relative">
    <button
      type="button"
      class="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold tabular-nums transition"
      :class="chipClass"
      :aria-expanded="open"
      :aria-label="$t('safety.chip.aria', { time: countdown })"
      @click="open = !open"
    >
      <Icon name="shield" :size="15" :stroke-width="2.25" />
      <span class="hidden sm:inline">{{ $t('safety.chip.label') }}</span>
      <span>{{ state === 'overdue' ? $t('safety.chip.overdue') : countdown }}</span>
    </button>

    <div v-if="open" class="fixed inset-x-4 top-[4.5rem] z-50 rounded-2xl border border-line bg-surface p-4 shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
      <p class="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Icon name="shield" :size="16" /> {{ $t('safety.title') }}</p>
      <SafetyCheckInStatus @done="open = false" />
      <p class="mt-3 text-xs text-muted">{{ $t('safety.disclaimer') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import SafetyCheckInStatus from './SafetyCheckInStatus.vue'
import { useSafetyStore } from '@/stores/safety'
import { countdownState, formatCountdown, msUntil } from '@/utils/safety'

const safety = useSafetyStore()
const route = useRoute()
const open = ref(false)
const now = ref(new Date())

const remaining = computed(() => (safety.active ? msUntil(safety.active.dueAtUtc, now.value) : 0))
const countdown = computed(() => formatCountdown(remaining.value))
const state = computed(() => countdownState(remaining.value))
const chipClass = computed(() => ({
  ok: 'bg-accent-50 text-accent-800 hover:bg-accent-100',
  warning: 'bg-amber-50 text-amber-800 hover:bg-amber-100',
  overdue: 'animate-pulse bg-red-600 text-white',
}[state.value]))

watch(() => route.fullPath, () => { open.value = false })

let timer = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
</script>
