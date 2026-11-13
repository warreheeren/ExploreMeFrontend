<template>
  <div>
    <PageHeader :title="$t('discover.title')" :subtitle="$t('discover.subtitle')" />

    <!-- Sociale extra's: ook op mobiel bereikbaar (daar staan ze niet in de tabbalk) -->
    <nav class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2" :aria-label="$t('buddies.eyebrow')">
      <RouterLink to="/buddies" class="card flex items-center gap-3 p-3 transition hover:border-line-strong">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Icon name="users" :size="18" /></span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-extrabold text-ink">{{ $t('buddies.title') }}</span>
          <span class="block truncate text-xs text-muted">{{ $t('buddies.subtitle') }}</span>
        </span>
        <Icon name="chevron-right" :size="16" class="text-muted" />
      </RouterLink>
      <RouterLink to="/challenges" class="card flex items-center gap-3 p-3 transition hover:border-line-strong">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Icon name="flag" :size="18" /></span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-extrabold text-ink">{{ $t('challenges.title') }}</span>
          <span class="block truncate text-xs text-muted">{{ $t('challenges.subtitle') }}</span>
        </span>
        <Icon name="chevron-right" :size="16" class="text-muted" />
      </RouterLink>
    </nav>

    <!-- Filters -->
    <section class="card card-pad mb-4 space-y-3" :aria-label="$t('discover.filters')">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,200px)_150px_150px_auto]">
        <div class="relative">
          <label for="disc-country" class="sr-only">{{ $t('discover.country') }}</label>
          <Icon name="globe" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input id="disc-country" v-model="filters.country" type="search" class="input pl-10" :placeholder="$t('discover.countryPlaceholder')" @input="onFiltersChanged(true)" />
        </div>
        <div class="relative">
          <label for="disc-user" class="sr-only">{{ $t('discover.traveller') }}</label>
          <Icon name="user" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input id="disc-user" v-model="filters.userName" type="search" class="input pl-10" :placeholder="$t('discover.userPlaceholder')" autocapitalize="none" spellcheck="false" @input="onFiltersChanged(true)" />
        </div>
        <div>
          <label for="disc-from" class="sr-only">{{ $t('discover.from') }}</label>
          <input id="disc-from" v-model="filters.from" type="date" class="input" :title="$t('discover.fromTitle')" @change="onFiltersChanged()" />
        </div>
        <div>
          <label for="disc-to" class="sr-only">{{ $t('discover.to') }}</label>
          <input id="disc-to" v-model="filters.to" type="date" class="input" :min="filters.from" :title="$t('discover.toTitle')" @change="onFiltersChanged()" />
        </div>
        <button type="button" class="btn btn-secondary" :disabled="!hasFilters" @click="resetFilters">{{ $t('discover.clear') }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="t in STOP_TYPE_ORDER"
          :key="t"
          type="button"
          class="chip border transition"
          :class="filters.types.includes(t) ? [stopTypeMeta(t).chip, 'border-transparent'] : 'border-line-strong bg-surface text-body hover:text-ink'"
          :aria-pressed="filters.types.includes(t)"
          @click="toggleType(t)"
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="stopTypeMeta(t).dot" /> {{ stopTypeMeta(t).label }}
        </button>
        <span class="ml-auto text-xs font-semibold text-muted" aria-live="polite">
          <template v-if="!loading">{{ $t('discover.stopCount', stopCount) }}<template v-if="stopCount >= 500"> · {{ $t('discover.maxShown') }}</template></template>
        </span>
      </div>
    </section>

    <!-- Kaart -->
    <div class="card relative overflow-hidden">
      <div ref="mapRef" class="h-[60vh] min-h-[420px] w-full" role="application" :aria-label="$t('discover.mapAria')" />

      <div class="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
        <span v-if="loading" class="chip pointer-events-auto bg-surface text-ink shadow-pop"><Spinner :size="14" /> {{ $t('common.loading') }}</span>
        <span v-else-if="error" class="chip pointer-events-auto bg-surface text-red-700 shadow-pop">
          {{ error }} <button type="button" class="underline" @click="fetchStops">{{ $t('discover.again') }}</button>
        </span>
        <span v-else-if="!stopCount" class="chip pointer-events-auto bg-surface text-ink shadow-pop">{{ $t('discover.noStops') }}</span>
      </div>

      <button type="button" class="btn btn-secondary btn-sm absolute bottom-4 right-4 z-[500] bg-surface shadow-pop" :disabled="locating" @click="locateMe">
        <Icon name="locate" :size="14" /> {{ locating ? $t('discover.locating') : $t('discover.myLocation') }}
      </button>
    </div>
    <SaveToListDialog v-model="saveOpen" :stop="savingStop" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import PageHeader from '@/components/ui/PageHeader.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import SaveToListDialog from '@/components/lists/SaveToListDialog.vue'
import { t as i18nT } from '@/i18n'
import { searchStops } from '@/api/discoverApi'
import { DiscoverStop } from '@/models'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { escapeHtml } from '@/utils/html'
import { formatDateRange, dateInputToIso } from '@/utils/date'
import { STOP_TYPE_ORDER, stopTypeMeta } from '@/utils/stopTypes'
import { addBaseTiles, observeMapSize, pinIcon } from '@/utils/leaflet'

const BBOX_ZOOM = 6
const route = useRoute()
const router = useRouter()
const saveOpen = ref(false)
const savingStop = ref(null)
const toast = useToastStore()

const mapRef = ref(null)
const loading = ref(false)
const error = ref('')
const stopCount = ref(0)
const locating = ref(false)

function filtersFromQuery(q) {
  const str = (v) => (typeof v === 'string' ? v : '')
  return {
    country: str(q.country),
    userName: str(q.user),
    from: str(q.from),
    to: str(q.to),
    types: str(q.types).split(',').filter((t) => STOP_TYPE_ORDER.includes(t)),
  }
}

function filtersToQuery(f) {
  const query = {}
  if (f.country.trim()) query.country = f.country.trim()
  if (f.userName.trim()) query.user = f.userName.trim()
  if (f.from) query.from = f.from
  if (f.to) query.to = f.to
  if (f.types.length) query.types = f.types.join(',')
  return query
}

const filters = reactive(filtersFromQuery(route.query))

const hasFilters = computed(() => !!(filters.country || filters.userName || filters.from || filters.to || filters.types.length))

let map = null
let cluster = null
let stopObserving = () => {}
let debounceTimer = null
let requestSeq = 0
let wasZoomedIn = false

function popupHtml(stop) {
  const meta = stopTypeMeta(stop.type)
  return `<div style="min-width:200px">
    <div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${meta.color}">${escapeHtml(meta.singular)}</div>
    <div style="font-weight:800;font-size:14px;color:rgb(var(--c-ink));margin-top:2px">${escapeHtml(stop.name)}</div>
    <div style="color:rgb(var(--c-body));font-size:12px;margin-top:2px">${escapeHtml(stop.tripTitle)}</div>
    <div style="color:rgb(var(--c-muted));font-size:12px;margin-top:2px">${escapeHtml(stop.ownerDisplayName)} · ${escapeHtml(formatDateRange(stop.tripStartDate, stop.tripEndDate))}</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">
      <a href="/trips/${encodeURIComponent(stop.tripId)}" data-nav="/trips/${escapeHtml(stop.tripId)}" style="font-weight:800;color:rgb(var(--c-accent-700));text-decoration:none">${escapeHtml(i18nT('discover.viewTrip'))} →</a>
      <a href="/places/${encodeURIComponent(stop.stopId)}" data-nav="/places/${escapeHtml(stop.stopId)}" style="font-weight:800;color:rgb(var(--c-accent-700));text-decoration:none">${escapeHtml(i18nT('places.view'))}</a>
      <a href="#" data-save="1" style="font-weight:800;color:rgb(var(--c-muted));text-decoration:none">${escapeHtml(i18nT('places.save'))}</a>
    </div>
  </div>`
}

function render(stops) {
  cluster.clearLayers()
  const markers = stops.map((stop) => {
    const m = L.marker([stop.latitude, stop.longitude], { icon: pinIcon(stop.type), title: stop.name })
    m.bindPopup(() => popupHtml(stop))
    m.on('popupopen', (e) => {
      const el = e.popup.getElement()
      el?.querySelectorAll('[data-nav]').forEach((link) => link.addEventListener('click', (ev) => {
        ev.preventDefault()
        router.push(link.getAttribute('data-nav'))
      }, { once: true }))
      el?.querySelector('[data-save]')?.addEventListener('click', (ev) => {
        ev.preventDefault()
        savingStop.value = { id: stop.stopId, name: stop.name }
        saveOpen.value = true
      })
    })
    return m
  })
  cluster.addLayers(markers)
  stopCount.value = stops.length
}

function buildParams() {
  const params = {}
  if (filters.country.trim()) params.country = filters.country.trim()
  if (filters.userName.trim()) params.userName = filters.userName.trim().replace(/^@/, '')
  if (filters.from) params.from = dateInputToIso(filters.from)
  if (filters.to) params.to = dateInputToIso(filters.to)
  if (filters.types.length) params.types = filters.types
  if (map && map.getZoom() >= BBOX_ZOOM) {
    const b = map.getBounds()
    Object.assign(params, { minLat: b.getSouth(), maxLat: b.getNorth(), minLon: b.getWest(), maxLon: b.getEast() })
  }
  return params
}

async function fetchStops() {
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  try {
    const data = await searchStops(buildParams())
    if (seq !== requestSeq) return
    render(DiscoverStop.fromApiList(data))
  } catch (e) {
    if (seq !== requestSeq) return
    error.value = errorMessage(e, i18nT('discover.loadFailed'))
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function syncUrl() {
  router.replace({ query: filtersToQuery(filters) })
}

// Terug/vooruit in de browser: filters opnieuw uit de URL lezen als ze verschillen.
watch(() => route.query, (q) => {
  if (route.name !== 'discover') return
  const next = filtersFromQuery(q)
  if (JSON.stringify(filtersToQuery(next)) === JSON.stringify(filtersToQuery(filters))) return
  Object.assign(filters, next)
  fetchStops()
})

function onFiltersChanged(debounced = false) {
  clearTimeout(debounceTimer)
  const run = () => {
    syncUrl()
    fetchStops()
  }
  if (debounced) debounceTimer = setTimeout(run, 400)
  else run()
}

function toggleType(t) {
  filters.types = filters.types.includes(t) ? filters.types.filter((x) => x !== t) : [...filters.types, t]
  onFiltersChanged()
}

function resetFilters() {
  Object.assign(filters, { country: '', userName: '', from: '', to: '', types: [] })
  onFiltersChanged()
}

function onMoveEnd() {
  const zoomedIn = map.getZoom() >= BBOX_ZOOM
  // Uitgezoomd hoeft niet opnieuw op te halen, behalve als we net uit een uitsnede komen.
  if (!zoomedIn && !wasZoomedIn) return
  wasZoomedIn = zoomedIn
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchStops, 400)
}

function locateMe() {
  if (!navigator.geolocation) {
    toast.error(i18nT('discover.noGeolocation'))
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false
      map.flyTo([pos.coords.latitude, pos.coords.longitude], 9, { duration: 0.8 })
    },
    () => {
      locating.value = false
      toast.error(i18nT('discover.locateFailed'))
    },
    { timeout: 10000 }
  )
}

onMounted(() => {
  map = L.map(mapRef.value, { worldCopyJump: true, scrollWheelZoom: true }).setView([25, 10], 2)
  addBaseTiles(map)
  cluster = L.markerClusterGroup({
    maxClusterRadius: 50,
    showCoverageOnHover: false,
    iconCreateFunction: (c) => {
      const n = c.getChildCount()
      const size = n < 10 ? 34 : n < 100 ? 40 : 46
      return L.divIcon({
        html: `<span style="display:flex;width:${size}px;height:${size}px;align-items:center;justify-content:center;border-radius:9999px;background:#111827;color:#fff;font-weight:800;font-size:13px;border:3px solid #fff;box-shadow:0 4px 12px rgba(17,24,39,.25)">${n}</span>`,
        className: 'stop-pin',
        iconSize: [size, size],
      })
    },
  })
  map.addLayer(cluster)
  map.on('moveend', onMoveEnd)
  stopObserving = observeMapSize(map, mapRef.value)
  fetchStops()
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  stopObserving()
  map?.remove()
  map = null
})
</script>
