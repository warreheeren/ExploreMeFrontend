<template>
  <!-- Feestdagen tijdens de reis (tab praktisch, onder de landeninfo). De data komt van TripDetailView. -->
  <section class="mx-auto max-w-3xl space-y-3" :aria-labelledby="headingId">
    <header>
      <h2 :id="headingId" class="card-title">{{ $t('stopDiscover.holidays.title') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ $t('stopDiscover.holidays.intro') }}</p>
    </header>

    <LoadingState v-if="loading" :text="$t('stopDiscover.holidays.loading')">
      <div class="skeleton h-16 rounded-2xl" />
    </LoadingState>
    <p v-else-if="failed" class="card card-pad text-sm text-muted">{{ $t('stopDiscover.holidays.failed') }}</p>
    <p v-else-if="!holidays.length" class="card card-pad text-sm text-muted">{{ $t('stopDiscover.holidays.empty') }}</p>
    <template v-else>
      <ul class="card divide-y divide-line overflow-hidden">
        <li v-for="h in holidays" :key="`${h.date}-${h.countryCode}-${h.localName}`" class="flex items-center gap-3 px-4 py-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800" aria-hidden="true">
            <Icon name="calendar" :size="18" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-extrabold text-ink">{{ h.name }}</p>
            <p class="text-xs font-semibold text-muted">
              {{ formatFullDate(h.date) }} · {{ h.countryName }}<span v-if="h.localName && h.localName !== h.name"> · {{ h.localName }}</span>
            </p>
          </div>
        </li>
      </ul>
      <p class="text-xs text-muted">{{ $t('stopDiscover.holidays.source') }}</p>
    </template>
  </section>
</template>

<script setup>
import Icon from '../ui/Icon.vue'
import LoadingState from '../ui/LoadingState.vue'
import { formatFullDate } from '@/utils/date'

defineProps({
  /** [{ date, countryCode, countryName, name, localName }] */
  holidays: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
})

const headingId = `holidays-${Math.random().toString(36).slice(2, 9)}`
</script>
