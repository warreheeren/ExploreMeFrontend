<template>
  <div class="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
    <button type="button" class="btn btn-dark btn-sm" :aria-label="playing ? $t('tripExtras.replay.pause') : $t('tripExtras.replay.play')" @click="toggle">
      <Icon :name="playing ? 'pause' : 'play'" :size="14" :filled="!playing" />
      {{ playing ? $t('tripExtras.replay.pause') : started ? $t('tripExtras.replay.resume') : $t('tripExtras.replay.play') }}
    </button>
    <button v-if="started" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('tripExtras.replay.restart')" @click="restart"><Icon name="refresh" :size="15" /></button>
    <div class="flex items-center gap-1" role="group" :aria-label="$t('tripExtras.replay.speed')">
      <button
        v-for="s in SPEEDS"
        :key="s"
        type="button"
        class="chip-toggle h-7 px-2.5"
        :class="speed === s ? 'chip-toggle-active' : ''"
        :aria-pressed="speed === s"
        @click="speed = s"
      >{{ s }}×</button>
    </div>
    <p class="min-w-0 flex-1 truncate text-xs font-semibold text-muted" aria-live="polite">{{ status }}</p>
    <button v-if="started" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('tripExtras.replay.close')" @click="stop"><Icon name="x" :size="15" /></button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import Icon from '../ui/Icon.vue'
import * as tripExtrasApi from '@/api/tripExtrasApi'
import { escapeHtml } from '@/utils/html'
import { resolveMediaUrl, thumbUrl } from '@/utils/media'
import { dayNumberByStop, partialLeg, photosByStop, splitRouteIntoLegs } from '@/utils/routeReplay'

const props = defineProps({
  trip: { type: Object, required: true },
  /** Routegeometrie [[lat, lon], …]; zonder geometrie rechte lijnen. */
  routeGeometry: { type: Array, default: null },
  /** TripMap-componentinstantie (exposeert getMap en setDimmed). */
  map: { type: Object, default: null },
})

const SPEEDS = [1, 2, 4]
const LEG_MS = 2200 // tekenduur per etappe op 1×
const CARD_MS = 1800 // fotokaart per stop op 1×
const REDUCED_CARD_MS = 2800 // bij reduced motion springen we van stop naar stop

const { t } = useI18n()
const playing = ref(false)
const started = ref(false)
const speed = ref(1)
const cardStop = ref(0)

let layer = null
let popup = null
let line = null
let border = null
let finished = false
let frame = 0
let lastTime = 0
// Toestandsmachine: eerst de fotokaart van stop `cardStop`, dan etappe `legIndex` tekenen, enzovoort.
let phase = 'card'
let legIndex = 0
let progress = 0
let elapsed = 0
let photos = null

const stops = computed(() => [...props.trip.stops].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)))
const legs = computed(() => splitRouteIntoLegs(props.routeGeometry, stops.value))
const days = computed(() => dayNumberByStop(props.trip))

const status = computed(() => {
  if (!started.value) return t('tripExtras.replay.hint')
  const stop = stops.value[cardStop.value]
  if (!stop) return ''
  const day = days.value[stop.id]
  return day ? t('tripExtras.replay.dayAt', { day, place: stop.name }) : stop.name
})

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const leafletMap = () => props.map?.getMap?.() || null

function accent() {
  return `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--c-accent-700').trim().split(/\s+/).join(',')})`
}

function cardHtml(stop) {
  const list = (photos?.[stop.id] || []).slice(0, 3)
  const day = days.value[stop.id]
  const imgs = list.map((p) => `<img src="${escapeHtml(thumbUrl(resolveMediaUrl(p.imageUrl)))}" alt="" style="width:${list.length === 1 ? 200 : 64}px;height:${list.length === 1 ? 120 : 64}px;object-fit:cover;border-radius:10px" />`).join('')
  return [
    '<div style="max-width:220px">',
    day ? `<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgb(var(--c-accent-700))">${escapeHtml(t('tripExtras.replay.day', { day }))}</div>` : '',
    `<div style="font-weight:800;font-size:14px;color:rgb(var(--c-ink));margin:2px 0 ${imgs ? 8 : 0}px">${escapeHtml(stop.name)}</div>`,
    imgs ? `<div style="display:flex;gap:6px">${imgs}</div>` : '',
    '</div>',
  ].join('')
}

function showCard(index) {
  const map = leafletMap()
  const stop = stops.value[index]
  cardStop.value = index
  if (!map || !stop) return
  popup = L.popup({ closeButton: false, autoClose: true, autoPan: true, className: 'replay-card', offset: [0, -30] })
    .setLatLng([stop.latitude, stop.longitude])
    .setContent(cardHtml(stop))
    .openOn(map)
}

function closeCard() {
  popup?.remove()
  popup = null
}

function startLeg(i) {
  const map = leafletMap()
  const points = legs.value[i]
  if (!map || !points) return
  const reduced = reducedMotion()
  // Camera volgt: elke etappe in beeld brengen (zonder animatie bij reduced motion).
  map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 12, animate: !reduced })
  // Witte rand + teal lijn, net als de gewone route.
  border = L.polyline([points[0]], { color: '#FFFFFF', weight: 8, opacity: 0.9 }).addTo(layer)
  line = L.polyline([points[0]], { color: accent(), weight: 5, opacity: 1, lineJoin: 'round' }).addTo(layer)
  progress = reduced ? 1 : 0
  drawProgress()
}

function drawProgress() {
  const points = legs.value[legIndex]
  if (!line || !points) return
  const partial = partialLeg(points, progress)
  line.setLatLngs(partial)
  border?.setLatLngs(partial)
  // Volg de kop van de lijn wanneer die uit beeld dreigt te gaan.
  const map = leafletMap()
  const head = partial[partial.length - 1]
  if (map && head && !map.getBounds().pad(-0.1).contains(head)) map.panTo(head, { animate: !reducedMotion(), duration: 0.4 })
}

function tick(now) {
  frame = 0
  if (!playing.value) return
  const dt = Math.min(100, now - (lastTime || now)) * speed.value
  lastTime = now

  if (phase === 'draw') {
    progress = Math.min(1, progress + dt / LEG_MS)
    drawProgress()
    if (progress >= 1) {
      legIndex++
      phase = 'card'
      elapsed = 0
      showCard(legIndex)
    }
  } else {
    elapsed += dt
    if (elapsed >= (reducedMotion() ? REDUCED_CARD_MS : CARD_MS)) {
      if (legIndex >= legs.value.length) {
        finished = true
        playing.value = false
        return
      }
      closeCard()
      phase = 'draw'
      startLeg(legIndex)
    }
  }
  frame = requestAnimationFrame(tick)
}

async function ensurePhotos() {
  if (photos) return
  try {
    photos = photosByStop(await tripExtrasApi.getStopPhotos(props.trip.id))
  } catch {
    photos = {}
  }
}

function reset() {
  cancelAnimationFrame(frame)
  frame = 0
  closeCard()
  layer?.clearLayers()
  line = null
  border = null
  finished = false
  phase = 'card'
  legIndex = 0
  progress = 0
  elapsed = 0
}

async function play() {
  const map = leafletMap()
  if (!map || stops.value.length < 2) return
  await ensurePhotos()
  if (!layer) layer = L.layerGroup().addTo(map)
  // Eerste keer of na afloop: van voren af aan; anders hervatten waar we pauzeerden.
  if (!started.value || finished) {
    reset()
    started.value = true
    props.map?.setDimmed?.(true)
    map.setView([stops.value[0].latitude, stops.value[0].longitude], Math.max(map.getZoom(), 9), { animate: !reducedMotion() })
    showCard(0)
  }
  playing.value = true
  lastTime = 0
  frame = requestAnimationFrame(tick)
}

function pause() {
  playing.value = false
  cancelAnimationFrame(frame)
  frame = 0
}

function toggle() {
  if (playing.value) pause()
  else play()
}

function restart() {
  pause()
  started.value = false
  play()
}

/** Replay beëindigen: eigen lijnen weg, route weer normaal. */
function stop() {
  pause()
  reset()
  layer?.remove()
  layer = null
  started.value = false
  props.map?.setDimmed?.(false)
}

// Andere stops of route: opnieuw beginnen.
watch(() => [props.routeGeometry, props.trip.stops], () => { if (started.value) stop() })

onBeforeUnmount(stop)
</script>
