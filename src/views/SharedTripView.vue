<template>
  <div class="min-h-screen bg-ground">
    <header class="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 sm:px-6">
        <RouterLink :to="auth.isAuthenticated ? '/' : '/login'" aria-label="ExploreMe"><Logo /></RouterLink>
        <div class="flex items-center gap-2">
          <template v-if="auth.isAuthenticated">
            <RouterLink v-if="trip" :to="`/trips/${trip.id}`" class="btn btn-secondary btn-sm">{{ $t('sharedTrip.openInApp') }}</RouterLink>
          </template>
          <template v-else>
            <RouterLink to="/login" class="btn btn-ghost btn-sm">{{ $t('sharedTrip.login') }}</RouterLink>
            <RouterLink to="/register" class="btn btn-dark btn-sm">{{ $t('sharedTrip.register') }}</RouterLink>
          </template>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-content px-4 py-6 sm:px-6 sm:py-8">
      <div v-if="loading" class="space-y-5">
        <div class="skeleton h-80 rounded-2xl" />
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4"><div v-for="i in 4" :key="i" class="skeleton h-24 rounded-2xl" /></div>
      </div>

      <EmptyState v-else-if="!trip" icon="lock" :title="$t('sharedTrip.invalidTitle')" :text="$t('sharedTrip.invalidText')">
        <RouterLink to="/register" class="btn btn-dark btn-sm">{{ $t('sharedTrip.discover') }}</RouterLink>
      </EmptyState>

      <template v-else>
        <p class="mb-3 inline-flex items-center gap-2 text-xs font-bold text-muted"><Icon name="link" :size="14" /> {{ $t('sharedTrip.sharedVia') }}</p>
        <TripHero :trip="trip" :link-owner="auth.isAuthenticated">
          <template #actions>
            <button type="button" class="btn btn-secondary btn-sm" @click="exportIcs"><Icon name="calendar" :size="16" /> {{ $t('sharedTrip.calendar') }}</button>
          </template>
        </TripHero>

        <TripStats :trip="trip" class="mt-5" />

        <nav class="tabs mt-6" role="tablist" :aria-label="$t('sharedTrip.sections')">
          <button v-for="t in tabs" :key="t.id" type="button" role="tab" class="tab" :class="tab === t.id ? 'tab-active' : ''" :aria-selected="tab === t.id" @click="tab = t.id">
            <Icon :name="t.icon" :size="16" /> {{ t.label }}
          </button>
        </nav>

        <div class="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <div class="order-2 min-w-0 lg:order-1">
            <StopGroups v-if="tab === 'overzicht'" :stops="trip.stops" :selected-stop-id="selectedStopId" @select="(s) => (selectedStopId = s.id)" />
            <ItineraryDays v-else :trip="trip" :selected-stop-id="selectedStopId" @select="(s) => (selectedStopId = s.id)" />
          </div>
          <div class="order-1 lg:order-2">
            <div class="card overflow-hidden lg:sticky lg:top-24">
              <TripMap :stops="trip.stops" :selected-stop-id="selectedStopId" height-class="h-[300px] sm:h-[380px] lg:h-[calc(100vh-8rem)]" @select="(s) => (selectedStopId = s.id)" />
            </div>
          </div>
        </div>

        <section v-if="!auth.isAuthenticated" class="card mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="plane" :size="22" /></span>
          <div class="flex-1">
            <h2 class="text-lg font-extrabold text-ink">{{ $t('sharedTrip.ctaTitle') }}</h2>
            <p class="text-sm text-muted">{{ $t('sharedTrip.ctaText') }}</p>
          </div>
          <RouterLink to="/register" class="btn btn-primary">{{ $t('sharedTrip.ctaButton') }}</RouterLink>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Logo from '@/components/ui/Logo.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import TripHero from '@/components/trip/TripHero.vue'
import TripStats from '@/components/trip/TripStats.vue'
import TripMap from '@/components/trip/TripMap.vue'
import StopGroups from '@/components/trip/StopGroups.vue'
import ItineraryDays from '@/components/trip/ItineraryDays.vue'
import * as publicApi from '@/api/publicApi'
import { useAuthStore } from '@/stores/auth'
import { buildTripIcs, downloadTextFile, safeFileName } from '@/utils/ics'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const trip = ref(null)
const loading = ref(true)
const tab = ref('overzicht')
const selectedStopId = ref(null)
const tabs = computed(() => [
  { id: 'overzicht', label: t('sharedTrip.tabs.overview'), icon: 'map' },
  { id: 'dagschema', label: t('sharedTrip.tabs.schedule'), icon: 'calendar' },
])

function exportIcs() {
  const ics = buildTripIcs(trip.value, { url: window.location.href })
  downloadTextFile(`${safeFileName(trip.value.title)}.ics`, ics, 'text/calendar')
}

onMounted(async () => {
  try {
    trip.value = await publicApi.getSharedTrip(route.params.token)
    document.title = `${trip.value.title} · ExploreMe`
  } catch {
    trip.value = null
  } finally {
    loading.value = false
  }
})
</script>
