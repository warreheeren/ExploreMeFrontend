<template>
  <RouterLink :to="`/trips/${trip.id}`" class="card group flex flex-col overflow-hidden transition hover:border-line-strong">
    <div class="relative aspect-[16/10] overflow-hidden bg-gray-100">
      <CoverImage :src="thumbUrl(trip.coverImageUrl)" :alt="trip.title" :seed="trip.id" img-class="transition duration-500 group-hover:scale-[1.03]" />
      <span v-if="trip.isPublic === false" class="chip absolute left-3 top-3 bg-surface text-ink">
        <Icon name="lock" :size="12" /> {{ $t('common.private') }}
      </span>
      <span v-if="showCountdown && countdown" class="chip absolute right-3 top-3 bg-ink text-surface">{{ countdown }}</span>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-4">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span class="eyebrow-accent">{{ flag }} {{ trip.country || $t('trips.card.unknownCountry') }}</span>
        <span class="text-xs font-semibold text-muted">{{ dateRange }} · {{ $t('trips.card.days', days) }}</span>
      </div>
      <h3 class="title-display line-clamp-2 text-xl leading-snug">{{ trip.title }}</h3>

      <div v-if="typeChips.length" class="flex flex-wrap gap-1.5">
        <StopTypeChip v-for="c in typeChips" :key="c.type" :type="c.type" :count="c.count" />
      </div>

      <div class="mt-auto flex items-center gap-2 pt-2">
        <template v-if="showAuthor">
          <Avatar :src="trip.profilePhotoUrl" :name="trip.displayName" size="xs" />
          <span class="truncate text-xs font-semibold text-body">{{ trip.displayName }}</span>
        </template>
        <StarRating v-if="trip.avgFoodRating" :model-value="trip.avgFoodRating.value" size="xs" show-value />
        <span class="ml-auto inline-flex shrink-0 items-center gap-3 text-xs font-bold text-muted">
          <!-- Likes en publieke reacties horen bij ontdekken (features.discover). -->
          <span v-if="features.discover" class="inline-flex items-center gap-1" :class="trip.likedByMe ? 'text-accent-700' : ''">
            <Icon name="heart" :size="14" :filled="trip.likedByMe" /> {{ trip.likeCount || 0 }}
          </span>
          <span v-if="features.discover && trip.commentCount" class="inline-flex items-center gap-1">
            <Icon name="chat" :size="14" /> {{ trip.commentCount }}
          </span>
          <span v-if="trip.copyCount" class="inline-flex items-center gap-1" :title="$t('tripExtras.copy.count', { n: trip.copyCount })">
            <Icon name="copy" :size="14" /> {{ trip.copyCount }}<span class="sr-only">{{ $t('tripExtras.copy.count', { n: trip.copyCount }) }}</span>
          </span>
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import Avatar from './ui/Avatar.vue'
import Icon from './ui/Icon.vue'
import CoverImage from './ui/CoverImage.vue'
import StarRating from './StarRating.vue'
import StopTypeChip from './StopTypeChip.vue'
import { countdownLabel, daysUntil, formatDateRange, tripDays } from '@/utils/date'
import { countsFromSummary, STOP_TYPE_ORDER } from '@/utils/stopTypes'
import { flagFor } from '@/utils/countries'
import { thumbUrl } from '@/utils/media'
import { features } from '@/config/features'

const props = defineProps({
  trip: { type: Object, required: true },
  showAuthor: { type: Boolean, default: true },
  showCountdown: { type: Boolean, default: false },
})

const dateRange = computed(() => formatDateRange(props.trip.startDate, props.trip.endDate))
const days = computed(() => tripDays(props.trip.startDate, props.trip.endDate))
const flag = computed(() => flagFor(props.trip.country))
const countdown = computed(() => (daysUntil(props.trip.endDate) >= 0 ? countdownLabel(props.trip.startDate, props.trip.endDate) : ''))

const typeChips = computed(() => {
  const counts = countsFromSummary(props.trip.stopCounts)
  return STOP_TYPE_ORDER.filter((t) => counts[t] > 0).map((t) => ({ type: t, count: counts[t] }))
})
</script>
