<template>
  <section class="card overflow-hidden">
    <header class="flex items-end justify-between gap-3 px-4 pb-3 pt-4">
      <div>
        <h3 class="card-title">{{ $t('worldmap.title') }}</h3>
        <p class="text-xs font-semibold text-muted">{{ isOwn ? $t('worldmap.subtitleOwn') : $t('worldmap.subtitle', { name: firstName }) }}</p>
      </div>
      <div class="text-right">
        <p class="text-2xl font-extrabold leading-none tabular-nums text-ink">{{ countryCount }}</p>
        <p class="text-[10px] font-extrabold uppercase tracking-wider text-muted">{{ $t('worldmap.outOf', { n: WORLD_COUNTRIES }) }}</p>
      </div>
    </header>

    <div class="relative">
      <div ref="mapRef" class="h-60 w-full bg-gray-100" :class="isOwn ? 'world-map-editable' : ''" role="img" :aria-label="$t('worldmap.ariaLabel', { n: countryCount })" />
      <p v-if="geoError" class="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-semibold text-muted">{{ $t('worldmap.loadError') }}</p>
      <span v-if="saving" class="absolute right-3 top-3 rounded-full bg-surface p-1.5"><Spinner /></span>
    </div>

    <div class="px-4 py-3">
      <div class="mb-1.5 flex items-center justify-between text-xs font-bold text-muted">
        <span>{{ $t('worldmap.discovered') }}</span>
        <span class="tabular-nums">{{ percentLabel }}%</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div class="h-full rounded-full bg-accent-700 transition-all duration-700" :style="{ width: `${Math.min(100, percent)}%` }" />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-muted">
        <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: FILL[1] }" /> {{ $t('worldmap.legendVisited') }}</span>
        <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: FILL[2] }" /> {{ $t('worldmap.trips', 2) }}</span>
        <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: FILL[3] }" /> {{ $t('worldmap.tripsMany') }}</span>
        <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm border border-dashed border-gray-500 bg-gray-200" /> {{ $t('worldmap.legendWishlist') }}</span>
      </div>
      <p v-if="isOwn" class="mt-2 text-[11px] text-muted">{{ $t('worldmap.editHint') }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from 'vue-i18n'
import Spinner from '@/components/ui/Spinner.vue'
import * as countriesApi from '@/api/countriesApi'
import { useToastStore } from '@/stores/toast'
import { dutchNameFor, englishNameFor, nextCountryStatus } from '@/utils/countries'
import { errorMessage } from '@/utils/errors'
import { escapeHtml } from '@/utils/html'
import { observeMapSize } from '@/utils/leaflet'
import { localeTag } from '@/i18n'

const GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
const WORLD_COUNTRIES = 195
// Teal-schaal per aantal reizen; zelf gemarkeerde landen krijgen de lichtste tint.
const FILL = { 0: '#E2E8F0', 1: '#99F6E4', 2: '#2DD4BF', 3: '#0F766E' }
// Verlanglijst: geen tweede accentkleur, maar een gedempte vulling met stippellijn.
const WISHLIST_STYLE = { fillColor: '#CBD5E1', fillOpacity: 1, color: '#64748B', weight: 1, dashArray: '3 3' }
let geoCache = null
let geoRequest = null

const { t, locale } = useI18n()
const toast = useToastStore()

const props = defineProps({
  userName: { type: String, required: true },
  displayName: { type: String, default: '' },
  /** Eigen profiel: klikken op een land wisselt geen → bezocht → verlanglijst → geen. */
  isOwn: { type: Boolean, default: false },
})
const emit = defineEmits(['loaded'])

const mapRef = ref(null)
const geoError = ref(false)
const data = ref({ visitedCount: 0, visited: [], wishlist: [] })
const saving = ref(false)
let map = null
let layer = null
let stopObserving = () => {}

const firstName = computed(() => (props.displayName || t('worldmap.fallbackName')).split(' ')[0])

/** Per Engelse kaartnaam: aantal reizen, status en de opgeslagen (Nederlandse) naam. */
const byEnglishName = computed(() => {
  const result = {}
  const englishOf = (name) => englishNameFor(name) || name
  for (const v of data.value.visited || []) {
    const en = englishOf(v.country)
    const current = result[en]
    result[en] = {
      trips: Math.max(current?.trips || 0, v.tripCount),
      status: 'visited',
      stored: v.marked ? v.country : current?.stored ?? null,
    }
  }
  for (const w of data.value.wishlist || []) {
    const en = englishOf(w)
    if (!result[en]) result[en] = { trips: 0, status: 'wishlist', stored: w }
  }
  return result
})

const countryCount = computed(() => data.value.visitedCount || 0)
// Numeriek voor de balkbreedte, geformatteerd (komma/punt per taal) voor het label.
const percent = computed(() => Math.round((countryCount.value / WORLD_COUNTRIES) * 1000) / 10)
const percentLabel = computed(() => {
  void locale.value // herbereken bij taalwissel
  return percent.value.toLocaleString(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
})

function countryName(feature) {
  const p = feature?.properties || {}
  return p.ADMIN || p.admin || p.NAME || p.name || p.SOVEREIGNT || ''
}

function styleFor(entry) {
  if (entry?.status === 'wishlist') return WISHLIST_STYLE
  if (entry?.status === 'visited') {
    const fill = FILL[Math.min(3, Math.max(1, entry.trips))]
    return { fillColor: fill, fillOpacity: 1, color: '#FFFFFF', weight: 0.8, dashArray: null }
  }
  return { fillColor: FILL[0], fillOpacity: 1, color: '#CBD5E1', weight: 0.4, dashArray: null }
}

function tooltipFor(name, entry) {
  let line
  if (entry?.status === 'wishlist') line = t('worldmap.wishlist')
  else if (entry?.trips) line = t('worldmap.trips', entry.trips)
  else if (entry?.status === 'visited') line = t('worldmap.markedVisited')
  else line = t('worldmap.notVisited')
  const color = entry?.status === 'visited' ? '#0F766E' : '#6B7280'
  return `<strong>${escapeHtml(name)}</strong><br><span style="color:${color}">${escapeHtml(line)}</span>`
}

function render() {
  if (!map || !geoCache) return
  layer?.remove()
  const entries = byEnglishName.value
  layer = L.geoJSON(geoCache, {
    style: (f) => styleFor(entries[countryName(f)]),
    onEachFeature: (f, l) => {
      const name = countryName(f)
      if (!name) return
      l.bindTooltip(tooltipFor(name, entries[name]), { sticky: true, direction: 'top', opacity: 1 })
      if (props.isOwn) l.on('click', () => cycle(name))
    },
  }).addTo(map)
}

async function load() {
  try {
    data.value = await countriesApi.getCountries(props.userName)
    emit('loaded', data.value)
  } catch {
    data.value = { visitedCount: 0, visited: [], wishlist: [] }
  }
}

/** Klik op een land (eigen profiel): geen → bezocht → verlanglijst → geen. Landen uit reizen blijven bezocht. */
async function cycle(englishName) {
  if (saving.value) return
  const entry = byEnglishName.value[englishName]
  if (entry?.trips) {
    toast.info(t('worldmap.fromTrips'))
    return
  }
  const next = nextCountryStatus(entry?.status || null)
  const name = entry?.stored || dutchNameFor(englishName)
  saving.value = true
  try {
    data.value = next ? await countriesApi.markCountry(name, next) : await countriesApi.unmarkCountry(name)
    emit('loaded', data.value)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function loadGeo() {
  if (geoCache) return geoCache
  // Profiel kan de kaart twee keer tonen (mobiel + zijbalk): één gedeelde request.
  geoRequest ??= fetch(GEOJSON_URL).then((res) => {
    if (!res.ok) throw new Error('geo')
    return res.json()
  })
  try {
    geoCache = await geoRequest
  } catch (e) {
    geoRequest = null
    throw e
  }
  return geoCache
}

onMounted(async () => {
  map = L.map(mapRef.value, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    minZoom: 1,
    maxZoom: 5,
    zoomSnap: 0.25,
  })
  map.setView([25, 10], 1.25)
  stopObserving = observeMapSize(map, mapRef.value)
  load()
  try {
    await loadGeo()
    render()
  } catch {
    geoError.value = true
  }
})

onBeforeUnmount(() => {
  stopObserving()
  map?.remove()
  map = null
})

// Tooltips zijn statische HTML: opnieuw opbouwen bij nieuwe data of een taalwissel.
watch([byEnglishName, locale], render)
watch(() => props.userName, load)
</script>

<style scoped>
.world-map-editable :deep(.leaflet-interactive) {
  cursor: pointer;
}
</style>
