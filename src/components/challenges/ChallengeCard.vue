<template>
  <article class="card flex flex-col p-4" :class="!challenge.isActive && !challenge.completed ? 'opacity-70' : ''">
    <header class="flex items-start gap-3">
      <span
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2"
        :class="challenge.completed ? 'border-accent-700 bg-accent-50 text-accent-800' : 'border-line-strong text-muted'"
      >
        <Icon :name="challenge.icon" :size="20" />
      </span>
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold leading-tight text-ink">{{ $t(`challenges.items.${challenge.key}.name`) }}</h3>
        <p class="mt-0.5 text-sm text-body">{{ $t(`challenges.items.${challenge.key}.description`) }}</p>
      </div>
    </header>

    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
      <span class="chip chip-muted h-6"><Icon name="calendar" :size="12" /> {{ challenge.year ? $t('challenges.year', { year: challenge.year }) : $t('challenges.always') }}</span>
      <span v-if="challenge.completed" class="chip chip-accent h-6"><Icon name="check" :size="12" /> {{ $t('challenges.completed') }}</span>
      <span v-else-if="!challenge.isActive" class="chip chip-muted h-6">{{ $t('challenges.ended') }}</span>
      <span class="text-muted">{{ $t('challenges.participants', challenge.participantCount) }}</span>
    </div>

    <div class="mt-4">
      <div class="mb-1 flex items-center justify-between text-xs font-bold text-muted">
        <span>{{ $t(`challenges.units.${challenge.metric}`, { n: challenge.progress.toLocaleString(localeTag()) }, challenge.progress) }}</span>
        <span class="tabular-nums">{{ challenge.progress.toLocaleString(localeTag()) }} / {{ challenge.target.toLocaleString(localeTag()) }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="challenge.progress" aria-valuemin="0" :aria-valuemax="challenge.target" :aria-label="$t('challenges.progressAria', { value: challenge.progress, target: challenge.target })">
        <div class="h-full rounded-full bg-accent-700 transition-all duration-700" :style="{ width: `${percent}%` }" />
      </div>
      <p v-if="challenge.completedAtUtc" class="mt-1 text-[11px] font-semibold text-muted">{{ $t('challenges.completedOn', { date: formatLongDate(challenge.completedAtUtc) }) }}</p>
    </div>

    <footer v-if="!compact" class="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <button v-if="!challenge.joined && challenge.isActive" type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="$emit('join', challenge)"><Icon name="plus" :size="14" /> {{ $t('challenges.join') }}</button>
      <template v-else-if="challenge.joined">
        <span v-if="!challenge.completed" class="inline-flex items-center gap-1 text-xs font-bold text-accent-700"><Icon name="check" :size="14" /> {{ $t('challenges.joined') }}</span>
        <button v-if="!challenge.completed" type="button" class="btn btn-ghost btn-sm" :disabled="busy" @click="$emit('leave', challenge)">{{ $t('challenges.leave') }}</button>
      </template>
      <button type="button" class="btn btn-secondary btn-sm ml-auto" @click="$emit('leaderboard', challenge)"><Icon name="users" :size="14" /> {{ $t('challenges.leaderboard') }}</button>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { localeTag } from '@/i18n'
import { formatLongDate } from '@/utils/date'
import { challengeProgressPercent } from '@/utils/socialExtras'

const props = defineProps({
  challenge: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  /** Zonder knoppen (profiel). */
  compact: { type: Boolean, default: false },
})
defineEmits(['join', 'leave', 'leaderboard'])

const percent = computed(() => challengeProgressPercent(props.challenge))
</script>
