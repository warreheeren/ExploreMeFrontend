<template>
  <div v-if="running.length" class="space-y-2">
    <RouterLink
      v-for="trip in running"
      :key="trip.id"
      :to="`/trips/${trip.id}/today`"
      class="flex items-center gap-3 rounded-2xl bg-ink p-3 text-surface transition hover:opacity-95"
    >
      <span class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        <CoverImage :src="thumbUrl(trip.coverImageUrl)" :seed="trip.id" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-bold">{{ $t('today.banner.title', { day: dayOf(trip), title: trip.title }) }}</span>
        <span class="block truncate text-xs opacity-80">{{ $t('today.banner.text') }}</span>
      </span>
      <Icon name="chevron-right" :size="18" class="shrink-0" />
    </RouterLink>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Icon from '../ui/Icon.vue'
import CoverImage from '../ui/CoverImage.vue'
import * as tripsApi from '@/api/tripsApi'
import { thumbUrl } from '@/utils/media'
import { tripDayStatus } from '@/utils/today'

const trips = ref([])

// De API geeft ±1 dag speling (tijdzone onbekend); hier filteren we exact op de lokale datum.
const running = computed(() => trips.value.filter((trip) => tripDayStatus(trip).state === 'during'))
const dayOf = (trip) => tripDayStatus(trip).dayNumber

async function load() {
  try {
    trips.value = await tripsApi.getActiveTrips()
  } catch {
    trips.value = []
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>
