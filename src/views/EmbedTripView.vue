<template>
  <div class="flex h-screen flex-col overflow-hidden bg-ground">
    <div v-if="loading" class="skeleton min-h-0 flex-1" />

    <div v-else-if="!trip" class="flex min-h-0 flex-1 items-center justify-center p-4">
      <EmptyState icon="lock" :title="$t('embed.goneTitle')" :text="$t('embed.goneText')" bare />
    </div>

    <template v-else>
      <div class="relative min-h-0 flex-1">
        <TripMap
          :stops="trip.stops"
          :route-segments="trip.routeSegments"
          :selected-stop-id="selectedStopId"
          :aria-label="$t('embed.mapAria')"
          height-class="h-full"
          @select="(s) => (selectedStopId = s.id)"
        />
      </div>

      <footer class="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-3 py-2">
        <img v-if="trip.coverThumbUrl" :src="trip.coverThumbUrl" alt="" class="h-9 w-9 shrink-0 rounded-lg object-cover" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-ink">{{ trip.title }}</p>
          <p class="truncate text-xs text-muted">
            {{ formatDateRange(trip.startDate, trip.endDate) }}<template v-if="trip.country"> · {{ trip.country }}</template> · {{ $t('embed.by', { name: trip.ownerDisplayName }) }}
          </p>
        </div>
        <a :href="shareUrl" target="_blank" rel="noopener" class="btn btn-dark btn-sm shrink-0">
          {{ $t('embed.viewOnExploreMe') }} <span aria-hidden="true">↗</span>
          <span class="sr-only">{{ $t('embed.newTab') }}</span>
        </a>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import TripMap from '@/components/trip/TripMap.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import * as publicApi from '@/api/publicApi'
import { applyTheme } from '@/stores/preferences'
import { formatDateRange } from '@/utils/date'

// Lichte pagina voor een iframe op een andere site: geen login, realtime of push (zie App.vue en main.js).
const route = useRoute()
const trip = ref(null)
const loading = ref(true)
const selectedStopId = ref(null)

const shareUrl = computed(() => `${window.location.origin}/share/${encodeURIComponent(route.params.token)}`)

// Thema uit de insluitcode (?theme=light|dark|auto), los van de opgeslagen voorkeur van de bezoeker.
const theme = ['light', 'dark'].includes(route.query.theme) ? route.query.theme : 'system'
const media = window.matchMedia?.('(prefers-color-scheme: dark)')
const onSchemeChange = () => applyTheme(theme)

onMounted(async () => {
  applyTheme(theme)
  if (theme === 'system') media?.addEventListener?.('change', onSchemeChange)
  try {
    trip.value = await publicApi.getEmbedTrip(route.params.token)
    document.title = `${trip.value.title} · ExploreMe`
  } catch {
    trip.value = null
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => media?.removeEventListener?.('change', onSchemeChange))
</script>
