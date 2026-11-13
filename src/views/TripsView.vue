<template>
  <div>
    <PageHeader :title="$t('trips.list.title')" :subtitle="$t('trips.list.subtitle')">
      <template #actions>
        <AiPlanLink />
        <RouterLink to="/trips/new" class="btn btn-primary"><Icon name="plus" :size="16" :stroke-width="2.5" /> {{ $t('trips.list.newTrip') }}</RouterLink>
      </template>
    </PageHeader>

    <OfflineTripsPanel />

    <!-- Filters -->
    <section class="card card-pad mb-6 space-y-4" :aria-label="$t('trips.list.filters')">
      <div class="flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input v-model="search" type="search" class="search-pill" :placeholder="$t('trips.list.searchPlaceholder')" :aria-label="$t('trips.list.searchLabel')" />
        </div>
        <label class="sr-only" for="trip-sort">{{ $t('trips.list.sort') }}</label>
        <select id="trip-sort" v-model="sortBy" class="select h-10 rounded-full sm:w-52">
          <option v-for="opt in sortOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
        </select>
      </div>

      <div v-if="countries.length" class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none" role="group" :aria-label="$t('trips.list.filterByCountry')">
        <button type="button" class="chip-toggle" :class="!selectedCountry ? 'chip-toggle-active' : ''" :aria-pressed="!selectedCountry" @click="selectCountry('')">{{ $t('trips.list.allCountries') }}</button>
        <button
          v-for="c in countries"
          :key="c"
          type="button"
          class="chip-toggle"
          :class="selectedCountry === c ? 'chip-toggle-active' : ''"
          :aria-pressed="selectedCountry === c"
          @click="selectCountry(selectedCountry === c ? '' : c)"
        >
          {{ flagFor(c) }} {{ c }}
        </button>
      </div>

      <p v-if="!loading && (search || selectedCountry)" class="text-xs font-semibold text-muted">
        {{ $t('trips.list.resultCount', { shown: filtered.length, total: trips.length }) }}
        <button type="button" class="link ml-2" @click="resetFilters">{{ $t('trips.list.clearFilters') }}</button>
      </p>
    </section>

    <div v-if="loading" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <div v-for="i in 6" :key="i" class="card overflow-hidden">
        <div class="skeleton aspect-[16/10] rounded-none" />
        <div class="space-y-2 p-4"><div class="skeleton h-3 w-1/2" /><div class="skeleton h-5 w-3/4" /><div class="skeleton h-3 w-2/3" /></div>
      </div>
    </div>

    <EmptyState v-else-if="error" icon="alert" :title="$t('trips.list.loadFailed')" :text="error">
      <button type="button" class="btn btn-secondary btn-sm" @click="load">{{ $t('common.retry') }}</button>
    </EmptyState>

    <EmptyState v-else-if="!trips.length" icon="map" :title="$t('trips.list.emptyTitle')" :text="$t('trips.list.emptyText')">
      <RouterLink to="/trips/new" class="btn btn-primary btn-sm">{{ $t('trips.list.planFirst') }}</RouterLink>
    </EmptyState>

    <EmptyState v-else-if="!filtered.length" icon="search" :title="$t('trips.list.noResultsTitle')" :text="$t('trips.list.noResultsText')">
      <button type="button" class="btn btn-secondary btn-sm" @click="resetFilters">{{ $t('trips.list.clearFilters') }}</button>
    </EmptyState>

    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <TripCard v-for="trip in filtered" :key="trip.id" :trip="trip" />
    </div>

    <!-- Oneindig scrollen: oudere publieke reizen bijladen -->
    <div v-if="!loading && trips.length && !done" ref="sentinel" class="py-6 text-center">
      <span v-if="loadingMore" class="inline-flex items-center gap-2 text-sm font-semibold text-muted"><Spinner /> {{ $t('common.loading') }}</span>
      <button v-else type="button" class="btn btn-secondary btn-sm" @click="loadMore">{{ $t('common.loadMore') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import TripCard from '@/components/TripCard.vue'
import AiPlanLink from '@/components/ai/AiPlanLink.vue'
import OfflineTripsPanel from '@/components/trip/OfflineTripsPanel.vue'
import Spinner from '@/components/ui/Spinner.vue'
import * as tripsApi from '@/api/tripsApi'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { errorMessage } from '@/utils/errors'
import { flagFor, splitCountries } from '@/utils/countries'
import { tripDays } from '@/utils/date'
import { localeTag } from '@/i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Publieke reizen in pagina's van 24; filteren en sorteren gebeurt op wat al geladen is.
const list = useInfiniteList((take, before) => tripsApi.getAllTrips(take, before), { pageSize: 24 })
const { items: trips, loadingMore, done, sentinel, loadMore } = list
const loading = ref(true)
const error = ref('')
const search = ref('')
const selectedCountry = ref(typeof route.query.country === 'string' ? route.query.country : '')
const sortBy = ref('newest')

const sortOptions = computed(() => [
  { id: 'newest', label: t('trips.sort.newest') },
  { id: 'popular', label: t('trips.sort.popular') },
  { id: 'longest', label: t('trips.sort.longest') },
  { id: 'most_stops', label: t('trips.sort.mostStops') },
  { id: 'top_rated', label: t('trips.sort.topRated') },
])

const countries = computed(() => {
  const set = new Set()
  trips.value.forEach((trip) => splitCountries(trip.country).forEach((c) => set.add(c)))
  return [...set].sort((a, b) => a.localeCompare(b, localeTag()))
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = trips.value.filter((trip) => {
    if (selectedCountry.value && !splitCountries(trip.country).some((c) => c.toLowerCase() === selectedCountry.value.toLowerCase())) return false
    if (!q) return true
    return [trip.title, trip.country, trip.displayName, trip.userName].some((v) => String(v || '').toLowerCase().includes(q))
  })

  const sorters = {
    newest: (a, b) => String(b.createdAtUtc).localeCompare(String(a.createdAtUtc)),
    popular: (a, b) => (b.likeCount + b.bookmarkCount + b.commentCount) - (a.likeCount + a.bookmarkCount + a.commentCount),
    longest: (a, b) => tripDays(b.startDate, b.endDate) - tripDays(a.startDate, a.endDate),
    most_stops: (a, b) => b.stopCount - a.stopCount,
    top_rated: (a, b) => (b.avgFoodRating?.value || 0) - (a.avgFoodRating?.value || 0),
  }
  return [...list].sort(sorters[sortBy.value] || sorters.newest)
})

function selectCountry(c) {
  selectedCountry.value = c
  router.replace({ query: c ? { ...route.query, country: c } : Object.fromEntries(Object.entries(route.query).filter(([k]) => k !== 'country')) })
}

function resetFilters() {
  search.value = ''
  selectCountry('')
}

async function load() {
  loading.value = true
  error.value = ''
  await list.reload()
  if (list.error.value) error.value = errorMessage(list.error.value)
  loading.value = false
}

watch(() => route.query.country, (c) => { selectedCountry.value = typeof c === 'string' ? c : '' })

onMounted(() => {
  load()
  window.addEventListener('app-refresh', load)
})
onBeforeUnmount(() => window.removeEventListener('app-refresh', load))
</script>
