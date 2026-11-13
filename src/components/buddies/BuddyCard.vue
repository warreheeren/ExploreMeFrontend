<template>
  <article class="card flex flex-col p-4">
    <header class="flex items-center gap-3">
      <RouterLink :to="`/u/${post.userName}`" class="shrink-0"><Avatar :src="post.profilePhotoUrl" :name="post.displayName" size="md" /></RouterLink>
      <div class="min-w-0 flex-1">
        <RouterLink :to="`/u/${post.userName}`" class="block truncate text-sm font-extrabold text-ink hover:underline">{{ post.displayName }}</RouterLink>
        <p class="truncate text-xs text-muted">{{ timeAgo(post.createdAtUtc) }}</p>
      </div>
      <span v-if="post.isClosed" class="chip chip-muted h-6">{{ $t('buddies.card.closed') }}</span>
      <span v-else-if="post.matchesMyPlans" class="chip chip-accent h-6"><Icon name="sparkle" :size="12" /> {{ $t('buddies.card.match') }}</span>
    </header>

    <button type="button" class="mt-3 flex-1 text-left" :aria-label="$t('buddies.card.open')" @click="$emit('open', post)">
      <p class="flex items-center gap-2 text-base font-extrabold text-ink">
        <span v-if="flag" class="text-lg leading-none" aria-hidden="true">{{ flag }}</span>
        <span class="truncate">{{ post.country }}<template v-if="post.region"> · {{ post.region }}</template></span>
      </p>
      <p class="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-muted"><Icon name="calendar" :size="13" /> {{ formatDateRange(post.startDate, post.endDate) }}</p>
      <p class="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-body">{{ post.description }}</p>
    </button>

    <footer class="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
      <span class="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
        <Icon name="users" :size="14" />
        {{ post.responseCount ? $t('buddies.card.responses', post.responseCount) : $t('buddies.card.noResponses') }}
      </span>
      <button v-if="post.isOwner" type="button" class="btn btn-secondary btn-sm" @click="$emit('open', post)">{{ $t('buddies.card.viewResponses') }}</button>
      <span v-else-if="post.hasResponded" class="inline-flex items-center gap-1 text-xs font-bold text-accent-700"><Icon name="check" :size="14" /> {{ $t('buddies.card.responded') }}</span>
      <button v-else-if="!post.isClosed" type="button" class="btn btn-primary btn-sm" @click="$emit('open', post)"><Icon name="plus" :size="14" /> {{ $t('buddies.card.joinCta') }}</button>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import { flagFor } from '@/utils/countries'
import { formatDateRange, timeAgo } from '@/utils/date'

const props = defineProps({
  post: { type: Object, required: true },
})
defineEmits(['open'])

const flag = computed(() => flagFor(props.post.country))
</script>
