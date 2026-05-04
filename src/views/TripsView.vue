<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Reizen</h1>
        <p class="text-sm text-gray-500 mt-0.5">Ontdek reizen van de community</p>
      </div>
      <RouterLink
        to="/trips/new"
        class="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Nieuwe reis
      </RouterLink>
    </div>

    <!-- Search + filters -->
    <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-3 mb-5 space-y-3">
      <div class="relative">
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Zoek op titel, land, beschrijving of reiziger..."
          class="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-lg border border-transparent focus:border-primary-500 focus:bg-white focus:outline-none transition"
        />
      </div>

      <!-- Country chips -->
      <div v-if="countries.length > 0" class="flex flex-wrap gap-1.5">
        <button
          @click="selectedCountry = ''"
          class="px-3 py-1 rounded-full text-xs font-medium transition"
          :class="selectedCountry === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          Alle landen
        </button>
        <button
          v-for="country in countries"
          :key="country"
          @click="selectedCountry = selectedCountry === country ? '' : country"
          class="px-3 py-1 rounded-full text-xs font-medium transition"
          :class="selectedCountry === country ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          {{ country }}
        </button>
      </div>

      <!-- Sort -->
      <div class="flex items-center gap-2 text-xs">
        <span class="text-gray-500 font-medium">Sorteer:</span>
        <button
          v-for="opt in sortOptions"
          :key="opt.id"
          @click="sortBy = opt.id"
          class="px-2.5 py-1 rounded-md font-medium transition"
          :class="sortBy === opt.id ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-900'"
        >
          {{ opt.label }}
        </button>
        <span v-if="filteredTrips.length !== trips.length" class="ml-auto text-gray-400">
          {{ filteredTrips.length }} van {{ trips.length }}
        </span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-5">
      <div v-for="n in 3" :key="n" class="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100 animate-pulse">
        <div class="h-56 bg-gray-100"></div>
        <div class="p-5 space-y-3">
          <div class="flex gap-2">
            <div class="h-5 w-16 bg-gray-100 rounded-full"></div>
            <div class="h-5 w-16 bg-gray-100 rounded-full"></div>
            <div class="h-5 w-16 bg-gray-100 rounded-full"></div>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-gray-100"></div>
              <div class="h-3 w-24 bg-gray-100 rounded"></div>
            </div>
            <div class="h-3 w-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtered empty -->
    <div v-else-if="filteredTrips.length === 0 && trips.length > 0" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
      <svg class="w-12 h-12 mx-auto text-gray-200" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M11 8v3m0 0v3m0-3h3m-3 0H8"/>
      </svg>
      <p class="text-gray-500 text-sm mt-3 font-medium">Geen reizen gevonden</p>
      <p class="text-xs text-gray-400 mt-1">Pas je zoekopdracht of filters aan</p>
      <button @click="resetFilters" class="mt-4 px-3 py-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700">
        Filters wissen
      </button>
    </div>

    <!-- Trips grid -->
    <div v-else-if="filteredTrips.length > 0" class="space-y-5">
      <RouterLink
        v-for="trip in filteredTrips"
        :key="trip.id"
        :to="`/trips/${trip.id}`"
        class="block bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition group"
      >
        <!-- Cover -->
        <div class="relative h-56 bg-gray-100 overflow-hidden">
          <img
            v-if="trip.coverImageUrl"
            :src="trip.coverImageUrl"
            :alt="trip.title"
            class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
            </svg>
          </div>
          <!-- Gradient overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
          <!-- Country glass chip -->
          <div class="absolute top-4 left-4 px-3 py-1 bg-white/15 backdrop-blur-md ring-1 ring-white/20 rounded-full text-xs font-semibold text-white">
            {{ trip.country }}
          </div>
          <!-- Title + date inside hero -->
          <div class="absolute bottom-4 left-4 right-4">
            <h2 class="text-xl font-bold text-white tracking-tight drop-shadow">{{ trip.title }}</h2>
            <p class="text-xs text-white/80 mt-0.5">{{ formatDateRange(trip.startDate, trip.endDate) }}</p>
          </div>
        </div>

        <!-- Body -->
        <div class="p-5">
          <!-- Type chips -->
          <div class="flex flex-wrap gap-2">
            <span v-if="typeCounts(trip).Waypoint > 0"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {{ typeCounts(trip).Waypoint }} stops
            </span>
            <span v-if="typeCounts(trip).Accommodation > 0"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              {{ typeCounts(trip).Accommodation }} hotels
            </span>
            <span v-if="typeCounts(trip).FoodSpot > 0"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              {{ typeCounts(trip).FoodSpot }} foodspots
            </span>
            <span v-if="typeCounts(trip).Activity > 0"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {{ typeCounts(trip).Activity }} activities
            </span>
          </div>

          <!-- Footer: author + avg rating -->
          <div class="flex items-center justify-between mt-4">
            <div class="flex items-center gap-2">
              <img
                v-if="trip.profilePhotoUrl"
                :src="trip.profilePhotoUrl"
                class="w-6 h-6 rounded-full object-cover ring-1 ring-gray-100"
              />
              <div v-else class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                {{ trip.displayName?.[0]?.toUpperCase() || '?' }}
              </div>
              <span class="text-xs text-gray-600 font-medium">{{ trip.displayName }}</span>
            </div>

            <StarRating
              v-if="avgRating(trip)"
              :model-value="avgRating(trip).value"
              :count="avgRating(trip).count"
              size="xs"
              show-value
            />
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-gray-200" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
      </svg>
      <p class="text-gray-400 mt-3">Nog geen reizen gedeeld</p>
      <RouterLink to="/trips/new" class="inline-block mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline">
        Deel je eerste reis
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as tripsApi from '@/api/tripsApi'
import StarRating from '@/components/StarRating.vue'

const trips = ref([])
const loading = ref(true)

const search = ref('')
const selectedCountry = ref('')
const sortBy = ref('newest')

const sortOptions = [
  { id: 'newest', label: 'Nieuwste' },
  { id: 'longest', label: 'Langste' },
  { id: 'most_stops', label: 'Meeste stops' },
  { id: 'top_rated', label: 'Best beoordeeld' },
]

async function loadTrips() {
  loading.value = true
  try {
    trips.value = await tripsApi.getAllTrips()
  } catch (e) {
    console.error('Failed to load trips', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTrips()
  window.addEventListener('app-refresh', loadTrips)
})

onUnmounted(() => {
  window.removeEventListener('app-refresh', loadTrips)
})

const countries = computed(() => {
  const set = new Set(trips.value.map(t => t.country).filter(Boolean))
  return [...set].sort()
})

const filteredTrips = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = trips.value

  if (selectedCountry.value) {
    list = list.filter(t => t.country === selectedCountry.value)
  }

  if (q) {
    list = list.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.country?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.displayName?.toLowerCase().includes(q) ||
      t.userName?.toLowerCase().includes(q)
    )
  }

  const sorted = [...list]
  switch (sortBy.value) {
    case 'longest':
      sorted.sort((a, b) => durationDays(b) - durationDays(a))
      break
    case 'most_stops':
      sorted.sort((a, b) => (b.stopCount || 0) - (a.stopCount || 0))
      break
    case 'top_rated':
      sorted.sort((a, b) => (b.avgFoodRating?.value || 0) - (a.avgFoodRating?.value || 0))
      break
    default:
      sorted.sort((a, b) => new Date(b.createdAtUtc) - new Date(a.createdAtUtc))
  }
  return sorted
})

function durationDays(trip) {
  return Math.max(1, Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000))
}

function resetFilters() {
  search.value = ''
  selectedCountry.value = ''
  sortBy.value = 'newest'
}

// Listing DTO provides stopCounts and avgFoodRating directly.
// These helpers normalize the backend's camelCase keys so the template
// can read a stable shape (and still works defensively if either is absent).
function typeCounts(trip) {
  const c = trip.stopCounts || {}
  return {
    Waypoint: c.waypoint ?? 0,
    Accommodation: c.accommodation ?? 0,
    FoodSpot: c.foodSpot ?? 0,
    Activity: c.activity ?? 0,
  }
}

function avgRating(trip) {
  return trip.avgFoodRating || null
}

function formatDateRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opts = { day: 'numeric', month: 'short' }
  const startStr = s.toLocaleDateString('nl-NL', opts)
  const endStr = e.toLocaleDateString('nl-NL', { ...opts, year: 'numeric' })
  return `${startStr} - ${endStr}`
}
</script>
