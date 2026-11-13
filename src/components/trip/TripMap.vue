<template>
  <div ref="containerRef" class="w-full" :class="heightClass" role="region" :aria-label="ariaLabel || $t('planning.map.aria')" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { addBaseTiles, observeMapSize, pinIcon, stopPopupHtml } from '@/utils/leaflet'
import { liveLocationIcon, livePopupHtml } from '@/utils/liveMap'
import { TRACK_COLOR, trackLatLngs, trackPopupHtml } from '@/utils/tracks'

const props = defineProps({
  stops: { type: Array, default: () => [] },
  selectedStopId: { type: String, default: null },
  heightClass: { type: String, default: 'h-[420px]' },
  numbered: { type: Boolean, default: true },
  /** Lijn tussen de stops tekenen (uit voor lijsten en plekken). */
  showRoute: { type: Boolean, default: true },
  /** Echte route als [[lat, lon], …]; zonder geometrie wordt een gestippelde lijn getekend. */
  routeGeometry: { type: Array, default: null },
  /**
   * Route per stuk ({ kind: 'road' | 'straight' | 'air' | 'sea' | 'rail' | 'bus', points }); gaat voor op routeGeometry.
   * Vlucht-, boot- en OV-stukken worden gestreept getekend.
   */
  routeSegments: { type: Array, default: null },
  ariaLabel: { type: String, default: '' },
  /** "Live" posities van reisgenoten (uit stories met locatie), als pulserende avatars. */
  liveLocations: { type: Array, default: () => [] },
  /** Middelpunt { lat, lng, zoom? } wanneer er geen stops zijn; anders wereldbeeld. */
  emptyCenter: { type: Object, default: null },
  // Fase 6 (GPX-import)
  /** Geïmporteerde tracks ({ id, name, kind: 'Track'|'Route', points, distanceMeters, … }) als eigen lijnen. */
  tracks: { type: Array, default: () => [] },
  /** Uit voor minikaartjes (dagboek): niet slepen, zoomen of klikken. */
  interactive: { type: Boolean, default: true },
})
const emit = defineEmits(['select'])

const containerRef = ref(null)
let map = null
let layer = null
let stopObserving = () => {}
let dimmed = false
const markers = new Map()

/** Route vaag tekenen (voor de route-replay, die zijn eigen lijn erover tekent). */
function setDimmed(value) {
  if (dimmed === value) return
  dimmed = value
  render({ fit: false })
}

function sortedStops() {
  return [...props.stops].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
}

function routeColor(token = '--c-accent-700') {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim().split(/\s+/).join(',')
}

/**
 * Eén routestuk: echte weg = doorgetrokken, schatting = stippellijn, vlucht/boot = streepjes in de accentkleur,
 * OV (trein/bus) = gestreept in de OV-kleur (--c-transit).
 */
function drawSegment(segment, o) {
  const points = segment?.points
  if (!points || points.length < 2) return
  if (segment.kind === 'rail' || segment.kind === 'bus') {
    L.polyline(points, { color: '#FFFFFF', weight: 8, opacity: 0.85 * o }).addTo(layer)
    L.polyline(points, {
      color: `rgb(${routeColor('--c-transit')})`,
      weight: 4,
      opacity: 0.9 * o,
      dashArray: segment.kind === 'rail' ? '12 6' : '6 6',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer)
  } else if (segment.kind === 'road') {
    L.polyline(points, { color: '#FFFFFF', weight: 8, opacity: 0.85 * o }).addTo(layer)
    L.polyline(points, { color: `rgb(${routeColor()})`, weight: 4, opacity: 0.9 * o, lineJoin: 'round' }).addTo(layer)
  } else if (segment.kind === 'air' || segment.kind === 'sea') {
    L.polyline(points, { color: '#FFFFFF', weight: 6, opacity: 0.8 * o }).addTo(layer)
    L.polyline(points, {
      color: `rgb(${routeColor()})`,
      weight: 3,
      opacity: 0.9 * o,
      dashArray: segment.kind === 'air' ? '10 8' : '4 7',
      lineCap: 'round',
    }).addTo(layer)
  } else {
    L.polyline(points, { color: '#FFFFFF', weight: 7, opacity: 0.9 * o }).addTo(layer)
    L.polyline(points, { color: '#111827', weight: 3, opacity: 0.7 * o, dashArray: '2 8', lineCap: 'round' }).addTo(layer)
  }
}

function render({ fit = true } = {}) {
  if (!map) return
  layer?.clearLayers()
  markers.clear()
  const stops = sortedStops()
  if (!stops.length) {
    if (fit && fitTracks()) return
    const c = props.emptyCenter
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) map.setView([c.lat, c.lng], c.zoom ?? 11)
    else map.setView([30, 10], 2)
    return
  }

  if (props.showRoute) {
    // Tijdens de route-replay blijft de volledige route zichtbaar als vage onderlaag.
    const o = dimmed ? 0.25 : 1
    if (props.routeSegments?.length) {
      for (const segment of props.routeSegments) drawSegment(segment, o)
    } else if (props.routeGeometry?.length >= 2) {
      drawSegment({ kind: 'road', points: props.routeGeometry }, o)
    } else if (stops.length >= 2) {
      drawSegment({ kind: 'straight', points: stops.map((s) => [s.latitude, s.longitude]) }, o)
    }
  }

  stops.forEach((stop, index) => {
    const selected = stop.id === props.selectedStopId
    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: pinIcon(stop.type, { label: props.numbered ? index + 1 : '', selected }),
      title: stop.name,
      zIndexOffset: selected ? 1000 : 0,
      keyboard: true,
    })
    marker.bindPopup(stopPopupHtml(stop))
    marker.on('click', () => emit('select', stop))
    marker.addTo(layer)
    markers.set(stop.id, marker)
  })

  if (fit) {
    const bounds = L.latLngBounds(stops.map((s) => [s.latitude, s.longitude]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }
}

// Live posities in een eigen laag, zodat ze los van de stops (en de route-replay) ververst worden.
let liveLayer = null
function renderLive() {
  if (!map) return
  liveLayer?.clearLayers()
  for (const loc of props.liveLocations || []) {
    L.marker([loc.latitude, loc.longitude], { icon: liveLocationIcon(loc), title: loc.displayName, zIndexOffset: 2000, keyboard: true })
      .bindPopup(livePopupHtml(loc))
      .addTo(liveLayer)
  }
}

// Fase 6 (GPX-import): tracks in een eigen laag (onder de stops), los van route en replay.
let trackLayer = null
const trackLines = new Map()

function renderTracks() {
  if (!map) return
  trackLayer?.clearLayers()
  trackLines.clear()
  for (const track of props.tracks || []) {
    const points = trackLatLngs(track)
    if (points.length < 2) continue
    const dashArray = track.kind === 'Route' ? '8 7' : null
    L.polyline(points, { color: '#FFFFFF', weight: 7, opacity: 0.85, interactive: false }).addTo(trackLayer)
    const line = L.polyline(points, { color: TRACK_COLOR, weight: 4, opacity: 0.95, dashArray, lineCap: 'round', lineJoin: 'round', interactive: props.interactive })
    if (props.interactive) line.bindPopup(trackPopupHtml(track))
    line.addTo(trackLayer)
    trackLines.set(track.id, line)
  }
}

/** Kaart op de tracks richten (wanneer er geen stops zijn); false als er niets te tonen is. */
function fitTracks() {
  const lines = [...trackLines.values()]
  if (!map || !lines.length) return false
  const bounds = L.latLngBounds([])
  for (const line of lines) bounds.extend(line.getBounds())
  map.fitBounds(bounds, { padding: props.interactive ? [40, 40] : [12, 12], maxZoom: 15 })
  return true
}

function focusTrack(track) {
  const line = track && trackLines.get(track.id)
  if (!map || !line) return
  map.flyToBounds(line.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.6 })
  line.openPopup()
}

function focusStop(stop) {
  if (!map || !stop) return
  map.flyTo([stop.latitude, stop.longitude], Math.max(map.getZoom(), 13), { duration: 0.6 })
  markers.get(stop.id)?.openPopup()
}

onMounted(() => {
  const staticMap = props.interactive ? {} : { dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false }
  map = L.map(containerRef.value, { scrollWheelZoom: false, zoomControl: props.interactive, ...staticMap })
  addBaseTiles(map)
  trackLayer = L.layerGroup().addTo(map)
  layer = L.layerGroup().addTo(map)
  liveLayer = L.layerGroup().addTo(map)
  renderTracks()
  render()
  renderLive()
  stopObserving = observeMapSize(map, containerRef.value)
})

onBeforeUnmount(() => {
  stopObserving()
  map?.remove()
  map = null
})

watch(() => props.stops, () => render(), { deep: true })
watch(() => [props.routeGeometry, props.routeSegments], () => render({ fit: false }))
watch(() => props.liveLocations, renderLive, { deep: true })
watch(() => props.tracks, () => {
  renderTracks()
  // Zonder stops bepalen de tracks het beeld; met stops blijft de kaart waar ze is.
  if (!props.stops.length) render()
}, { deep: true })
watch(() => props.selectedStopId, (id) => {
  render({ fit: false })
  const stop = props.stops.find((s) => s.id === id)
  if (stop) focusStop(stop)
})

defineExpose({ focusStop, focusTrack, setDimmed, getMap: () => map })
</script>
