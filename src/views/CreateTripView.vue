<template>
  <div class="max-w-3xl mx-auto">
    <RouterLink to="/trips" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition mb-4">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      Alle reizen
    </RouterLink>

    <h1 class="text-xl font-bold text-gray-900 mb-1">{{ isEdit ? 'Reis bewerken' : 'Nieuwe reis' }}</h1>
    <p class="text-sm text-gray-500 mb-6">{{ isEdit ? 'Pas je reis aan en sla op' : 'Deel je avontuur met de community' }}</p>

    <div v-if="loadingTrip" class="bg-white border border-gray-200 rounded-xl p-8 text-center">
      <div class="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
      <p class="text-sm text-gray-500 mt-3">Reis laden...</p>
    </div>

    <form v-if="!loadingTrip" @submit.prevent="onSubmit" class="space-y-6">
      <!-- Trip info card -->
      <div class="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-bold text-gray-900">Reis details</h2>

        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">Titel *</label>
          <input
            v-model.trim="form.title"
            required
            placeholder="bv. Roadtrip door Italië"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">Land / regio</label>
          <input
            v-model.trim="form.country"
            placeholder="bv. Italië"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">Beschrijving</label>
          <textarea
            v-model.trim="form.description"
            rows="3"
            placeholder="Vertel iets over je reis..."
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary-500 transition"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Startdatum *</label>
            <input
              v-model="form.startDate"
              type="date"
              required
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Einddatum *</label>
            <input
              v-model="form.endDate"
              type="date"
              required
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">Cover foto URL</label>
          <input
            v-model.trim="form.coverImageUrl"
            placeholder="https://..."
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition"
          />
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="form.isPublic" class="w-4 h-4 rounded"/>
          <span class="text-sm text-gray-700">Publiek zichtbaar</span>
        </label>
      </div>

      <!-- Map for picking locations -->
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-900">Kaart</h2>
          <span class="text-xs text-gray-500">Klik op de kaart om een stop toe te voegen</span>
        </div>
        <div ref="mapContainer" class="h-[400px] w-full"></div>
      </div>

      <!-- Stops list -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-gray-900">Stops ({{ form.stops.length }})</h2>
        </div>

        <div v-if="form.stops.length === 0" class="text-center py-8 text-sm text-gray-400">
          Nog geen stops toegevoegd. Klik op de kaart om te beginnen.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(stop, idx) in form.stops"
            :key="idx"
            class="border border-gray-200 rounded-lg p-3 space-y-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">{{ idx + 1 }}</div>
                <select
                  v-model="stop.type"
                  class="text-xs font-semibold px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-primary-500"
                >
                  <option value="Waypoint">Bezocht</option>
                  <option value="Accommodation">Overnachting</option>
                  <option value="FoodSpot">Foodspot</option>
                  <option value="Activity">Activiteit</option>
                </select>
              </div>
              <button
                type="button"
                @click="removeStop(idx)"
                class="text-gray-400 hover:text-red-500 transition"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <input
              v-model.trim="stop.name"
              placeholder="Naam van de plek"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
            />

            <textarea
              v-model.trim="stop.description"
              rows="2"
              placeholder="Beschrijving (optioneel)"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary-500"
            />

            <input
              v-model.trim="stop.address"
              placeholder="Adres (optioneel)"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
            />

            <!-- Foodspot specific -->
            <div v-if="stop.type === 'FoodSpot'" class="space-y-2 pt-2 border-t border-gray-100">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-500 w-20">Rating</span>
                <StarRating v-model="stop.rating" :readonly="false" size="md" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.trim="stop.cuisineType"
                  placeholder="Keuken type"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
                <select
                  v-model.number="stop.priceLevel"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  <option :value="null">Prijsklasse</option>
                  <option :value="1">&#8364;</option>
                  <option :value="2">&#8364;&#8364;</option>
                  <option :value="3">&#8364;&#8364;&#8364;</option>
                </select>
              </div>
            </div>

            <!-- Accommodation specific -->
            <div v-if="stop.type === 'Accommodation'" class="space-y-2 pt-2 border-t border-gray-100">
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="stop.checkInDate"
                  type="date"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
                <input
                  v-model="stop.checkOutDate"
                  type="date"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
              </div>
              <input
                v-model.number="stop.pricePerNight"
                type="number"
                min="0"
                placeholder="Prijs per nacht (&#8364;)"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>

            <!-- Activity specific -->
            <div v-if="stop.type === 'Activity'" class="space-y-2 pt-2 border-t border-gray-100">
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.trim="stop.duration"
                  placeholder="Duur (bv. 2 uur)"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
                <input
                  v-model.number="stop.cost"
                  type="number"
                  min="0"
                  placeholder="Kosten (&#8364;)"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <p class="text-xs text-gray-400">
              &#128205; {{ stop.latitude.toFixed(4) }}, {{ stop.longitude.toFixed(4) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="saving || !canSubmit"
          class="px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition"
        >
          {{ saving ? 'Opslaan...' : isEdit ? 'Wijzigingen opslaan' : 'Reis publiceren' }}
        </button>
        <RouterLink :to="isEdit ? `/trips/${tripId}` : '/trips'" class="text-sm text-gray-500 hover:text-gray-900 transition">Annuleren</RouterLink>
        <p v-if="error" class="text-sm text-red-500 ml-auto">{{ error }}</p>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as tripsApi from '@/api/tripsApi'
import StarRating from '@/components/StarRating.vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const route = useRoute()
const router = useRouter()
const mapContainer = ref(null)
let map = null
const markers = []

const tripId = computed(() => route.params.id)
const isEdit = computed(() => route.name === 'trip-edit')
const loadingTrip = ref(false)

const form = reactive({
  title: '',
  description: '',
  coverImageUrl: '',
  country: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  isPublic: true,
  stops: []
})

const saving = ref(false)
const error = ref('')

const canSubmit = computed(() => form.title.trim().length > 0)

onMounted(async () => {
  if (isEdit.value && tripId.value) {
    loadingTrip.value = true
    try {
      const trip = await tripsApi.getTripById(tripId.value)
      form.title = trip.title || ''
      form.description = trip.description || ''
      form.coverImageUrl = trip.coverImageUrl || ''
      form.country = trip.country || ''
      form.startDate = trip.startDate ? trip.startDate.split('T')[0] : form.startDate
      form.endDate = trip.endDate ? trip.endDate.split('T')[0] : form.endDate
      form.isPublic = trip.isPublic
      form.stops = (trip.stops || []).map((s, i) => reactive({
        name: s.name || '',
        description: s.description || '',
        address: s.address || '',
        imageUrl: s.imageUrl || '',
        latitude: s.latitude,
        longitude: s.longitude,
        orderIndex: i,
        type: s.type || 'Waypoint',
        rating: s.rating ?? null,
        cuisineType: s.cuisineType || '',
        priceLevel: s.priceLevel ?? null,
        checkInDate: s.checkInDate ? s.checkInDate.split('T')[0] : '',
        checkOutDate: s.checkOutDate ? s.checkOutDate.split('T')[0] : '',
        pricePerNight: s.pricePerNight ?? null,
        duration: s.duration || '',
        cost: s.cost ?? null
      }))
    } catch (e) {
      console.error('Load trip failed', e)
      error.value = 'Reis kon niet worden geladen'
    } finally {
      loadingTrip.value = false
    }
  }

  await nextTick()
  initMap()

  // Place markers for existing stops
  if (isEdit.value) {
    form.stops.forEach((s, idx) => {
      const m = L.marker([s.latitude, s.longitude]).addTo(map)
      m.bindTooltip(`Stop ${idx + 1}`, { permanent: false })
      markers.push(m)
    })
    if (form.stops.length > 0) {
      const bounds = form.stops.map(s => [s.latitude, s.longitude])
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }
})

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})

function initMap() {
  map = L.map(mapContainer.value, { scrollWheelZoom: true }).setView([48.8566, 2.3522], 4)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map)

  map.on('click', (e) => {
    addStop(e.latlng.lat, e.latlng.lng)
  })

  setTimeout(() => map && map.invalidateSize(), 100)
}

function addStop(lat, lng) {
  const stop = reactive({
    name: '',
    description: '',
    address: '',
    imageUrl: '',
    latitude: lat,
    longitude: lng,
    orderIndex: form.stops.length,
    type: 'Waypoint',
    rating: null,
    cuisineType: '',
    priceLevel: null,
    checkInDate: '',
    checkOutDate: '',
    pricePerNight: null,
    duration: '',
    cost: null
  })
  form.stops.push(stop)

  const marker = L.marker([lat, lng]).addTo(map)
  marker.bindTooltip(`Stop ${form.stops.length}`, { permanent: false })
  markers.push(marker)
}

function removeStop(idx) {
  form.stops.splice(idx, 1)
  if (markers[idx]) {
    map.removeLayer(markers[idx])
    markers.splice(idx, 1)
  }
  // Update remaining order indices
  form.stops.forEach((s, i) => { s.orderIndex = i })
}

async function onSubmit() {
  if (!canSubmit.value) return
  error.value = ''
  saving.value = true

  try {
    const payload = {
      title: form.title,
      description: form.description || null,
      coverImageUrl: form.coverImageUrl || null,
      country: form.country || null,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      isPublic: form.isPublic,
      stops: form.stops.map((s, i) => ({
        name: s.name || `Stop ${i + 1}`,
        description: s.description || null,
        address: s.address || null,
        imageUrl: s.imageUrl || null,
        latitude: s.latitude,
        longitude: s.longitude,
        orderIndex: i,
        type: s.type,
        rating: s.rating,
        cuisineType: s.cuisineType || null,
        priceLevel: s.priceLevel,
        checkInDate: s.checkInDate ? new Date(s.checkInDate).toISOString() : null,
        checkOutDate: s.checkOutDate ? new Date(s.checkOutDate).toISOString() : null,
        pricePerNight: s.pricePerNight,
        duration: s.duration || null,
        cost: s.cost
      }))
    }

    if (isEdit.value && tripId.value) {
      const updated = await tripsApi.updateTrip(tripId.value, payload)
      router.push(`/trips/${updated.id}`)
    } else {
      const created = await tripsApi.createTrip(payload)
      router.push(`/trips/${created.id}`)
    }
  } catch (e) {
    const data = e?.response?.data
    let msg = data?.message || data?.title
    if (!msg && data?.errors && typeof data.errors === 'object') {
      msg = Object.entries(data.errors)
        .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
        .join(' | ')
    }
    error.value = msg || (isEdit.value ? 'Opslaan mislukt' : 'Aanmaken mislukt')
    console.error('Trip save failed', e?.response?.status, data, e)
  } finally {
    saving.value = false
  }
}
</script>
