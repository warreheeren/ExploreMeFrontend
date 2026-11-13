<template>
  <section v-if="trips.length" class="card card-pad mb-6" aria-labelledby="offline-trips-title">
    <h2 id="offline-trips-title" class="card-title inline-flex items-center gap-2"><Icon name="download" :size="16" class="text-accent-700" /> {{ $t('tripExtras.offline.listTitle') }}</h2>
    <p class="mt-0.5 text-xs text-muted">{{ $t('tripExtras.offline.listSubtitle') }}</p>
    <ul class="mt-3 divide-y divide-line">
      <li v-for="trip in trips" :key="trip.id" class="flex items-center gap-3 py-2">
        <RouterLink :to="`/trips/${trip.id}`" class="min-w-0 flex-1">
          <span class="block truncate text-sm font-bold text-ink hover:underline">{{ trip.title }}</span>
          <span class="block text-xs text-muted">{{ $t('tripExtras.offline.savedAt', { date: timeAgo(parseTimestamp(trip.savedAt)) }) }}</span>
        </RouterLink>
        <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('tripExtras.offline.removeAria', { title: trip.title })" @click="remove(trip)">
          <Icon name="trash" :size="15" />
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useOfflineTrips } from '@/composables/useOfflineTrips'
import { confirm } from '@/composables/useConfirm'
import { parseTimestamp, timeAgo } from '@/utils/date'

const { t } = useI18n()
const offline = useOfflineTrips()
const trips = offline.trips

async function remove(trip) {
  const ok = await confirm({
    title: t('tripExtras.offline.removeTitle'),
    message: t('tripExtras.offline.removeText', { title: trip.title }),
    confirmLabel: t('tripExtras.offline.remove'),
  })
  if (ok) await offline.remove(trip)
}
</script>
