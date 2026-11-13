<template>
  <div>
    <PageHeader
      :title="$t('nearby.title')"
      :subtitle="placeName ? $t('nearby.subtitle', { name: placeName }) : $t('nearby.subtitleNoName')"
    >
      <template #actions>
        <label for="nearby-radius" class="sr-only">{{ $t('nearby.radius') }}</label>
        <select id="nearby-radius" v-model.number="radiusKm" class="select h-10 w-32 rounded-full" @change="load">
          <option v-for="r in RADII" :key="r" :value="r">{{ $t('nearby.radiusKm', { n: r }) }}</option>
        </select>
      </template>
    </PageHeader>

    <EmptyState v-if="!hasLocation" icon="locate" :title="$t('nearby.missingLocation')">
      <RouterLink to="/discover" class="btn btn-secondary btn-sm">{{ $t('places.toDiscover') }}</RouterLink>
    </EmptyState>

    <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div class="mx-auto w-full max-w-md">
        <div v-if="loading" class="skeleton aspect-[3/4] w-full rounded-3xl" aria-busy="true" />

        <EmptyState v-else-if="loadError" icon="alert" :title="$t('nearby.loadFailed')">
          <button type="button" class="btn btn-secondary btn-sm" @click="load">{{ $t('common.retry') }}</button>
        </EmptyState>

        <EmptyState v-else-if="!current" icon="compass" :title="places.length ? $t('nearby.doneTitle') : $t('nearby.noneTitle')" :text="places.length ? $t('nearby.doneText') : $t('nearby.noneText')">
          <button v-if="skipped.length" type="button" class="btn btn-secondary btn-sm" @click="resetSkipped">{{ $t('nearby.resetSkipped') }}</button>
        </EmptyState>

        <template v-else>
          <!-- Kaartenstapel: de volgende kaart ligt zichtbaar onder de huidige -->
          <div class="relative aspect-[3/4] w-full select-none">
            <div v-if="next" class="card absolute inset-0 scale-[0.96] overflow-hidden opacity-60" aria-hidden="true">
              <img v-if="next.imageUrl" :src="thumbUrl(next.imageUrl)" alt="" class="h-3/5 w-full object-cover" />
            </div>

            <article
              :key="current.stopId"
              class="card absolute inset-0 flex touch-pan-y flex-col overflow-hidden"
              :class="dragging ? '' : 'transition-transform duration-300 ease-out'"
              :style="{ transform: cardStyle }"
              :aria-label="current.name"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="cancelDrag"
            >
              <div class="relative h-3/5 shrink-0 bg-gray-100">
                <img v-if="current.imageUrl" :src="thumbUrl(current.imageUrl, 900)" alt="" class="h-full w-full object-cover" draggable="false" />
                <div v-else class="flex h-full w-full items-center justify-center" :class="stopTypeMeta(current.type).soft"><Icon :name="stopTypeMeta(current.type).icon" :size="40" /></div>
                <span class="chip absolute left-3 top-3" :class="stopTypeMeta(current.type).chip"><Icon :name="stopTypeMeta(current.type).icon" :size="13" /> {{ stopTypeMeta(current.type).singular }}</span>
                <!-- Veeghint -->
                <span v-if="dragDirection === 'right'" class="chip absolute right-3 top-3 bg-accent-700 text-white" :style="{ opacity: hintOpacity }">{{ $t('nearby.hintSave') }}</span>
                <span v-else-if="dragDirection === 'left'" class="chip absolute right-3 top-3 bg-ink text-surface" :style="{ opacity: hintOpacity }">{{ $t('nearby.hintSkip') }}</span>
              </div>
              <div class="flex min-h-0 flex-1 flex-col p-4">
                <h2 class="text-lg font-extrabold leading-tight text-ink">{{ current.name }}</h2>
                <p class="mt-0.5 text-xs font-semibold text-muted">
                  {{ $t('nearby.away', { distance: formatDistance(current.distanceMeters) }) }}
                  <template v-if="current.address"> · {{ current.address }}</template>
                </p>
                <p v-if="current.description" class="mt-2 line-clamp-2 text-sm text-body">{{ current.description }}</p>
                <p class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-body">
                  <span v-if="current.saveCount" class="inline-flex items-center gap-1"><Icon name="bookmark" :size="12" /> {{ $t('nearby.saves', { n: current.saveCount }) }}</span>
                  <span v-if="current.postCount" class="inline-flex items-center gap-1"><Icon name="image" :size="12" /> {{ $t('nearby.posts', current.postCount) }}</span>
                  <span class="inline-flex items-center gap-1"><Icon name="users" :size="12" /> {{ $t('nearby.visits', current.visitCount) }}</span>
                  <span v-if="current.avgRating" class="inline-flex items-center gap-1"><Icon name="star" :size="12" filled :stroke-width="0" class="text-rating" /> {{ current.avgRating.toLocaleString(localeTag()) }}</span>
                </p>
                <div class="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span class="flex min-w-0 items-center gap-2">
                    <Avatar :src="current.ownerProfilePhotoUrl" :name="current.ownerDisplayName" size="xs" />
                    <span class="truncate text-xs text-muted">{{ $t('nearby.from', { trip: current.tripTitle, name: current.ownerDisplayName }) }}</span>
                  </span>
                  <RouterLink :to="`/places/${current.stopId}`" class="link shrink-0 text-xs">{{ $t('nearby.viewPlace') }}</RouterLink>
                </div>
              </div>
            </article>
          </div>

          <div class="mt-4 flex items-center justify-center gap-4">
            <button type="button" class="btn btn-secondary btn-lg w-36" :aria-label="$t('nearby.skipAria', { name: current.name })" @click="decide('left')">
              <Icon name="x" :size="18" /> {{ $t('nearby.skip') }}
            </button>
            <button type="button" class="btn btn-primary btn-lg w-36" :aria-label="$t('nearby.saveAria', { name: current.name })" @click="decide('right')">
              <Icon name="bookmark" :size="18" /> {{ $t('nearby.save') }}
            </button>
          </div>
          <p class="mt-3 text-center text-xs text-muted">{{ $t('nearby.remaining', remaining) }} · {{ $t('nearby.keyboardHint') }}</p>
        </template>
      </div>

      <div class="card overflow-hidden lg:sticky lg:top-24 lg:self-start">
        <TripMap
          :stops="mapStops"
          :selected-stop-id="current?.stopId || null"
          :numbered="false"
          :show-route="false"
          :empty-center="hasLocation ? { lat, lng, zoom: 11 } : null"
          :aria-label="$t('nearby.mapAria')"
          height-class="h-[200px] sm:h-[280px] lg:h-[calc(100vh-9rem)]"
        />
      </div>
    </div>

    <SaveToListDialog v-model="saveOpen" :stop="savingStop" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import TripMap from '@/components/trip/TripMap.vue'
import SaveToListDialog from '@/components/lists/SaveToListDialog.vue'
import * as nearbyApi from '@/api/nearbyApi'
import { localeTag } from '@/i18n'
import { formatDistance } from '@/utils/format'
import { thumbUrl } from '@/utils/media'
import { stopTypeMeta } from '@/utils/stopTypes'
import { dragTransform, loadSkipped, saveSkipped, swipeDirection, swipeProgress, SWIPE_THRESHOLD } from '@/utils/swipe'

const RADII = [10, 25, 50, 100]
const SKIPPED_KEY = 'nearby.skipped'
const FLY_OUT_PX = 600
const FLY_OUT_MS = 220

const route = useRoute()

const places = ref([])
const index = ref(0)
const loading = ref(false)
const loadError = ref(false)
const radiusKm = ref(25)
const skipped = ref(loadSkipped(SKIPPED_KEY))
const saveOpen = ref(false)
const savingStop = ref(null)

// Slepen
const drag = ref({ x: 0, y: 0 })
const dragging = ref(false)
let pointerStart = null
let busy = false

const lat = computed(() => Number(route.query.lat))
const lng = computed(() => Number(route.query.lng))
const hasLocation = computed(() => Number.isFinite(lat.value) && Number.isFinite(lng.value) && route.query.lat !== '' && route.query.lng !== '')
const placeName = computed(() => (typeof route.query.name === 'string' ? route.query.name.slice(0, 80) : ''))

const current = computed(() => places.value[index.value] || null)
const next = computed(() => places.value[index.value + 1] || null)
const remaining = computed(() => Math.max(0, places.value.length - index.value))
const mapStops = computed(() => places.value.slice(index.value).map((p, i) => ({
  id: p.stopId, name: p.name, type: p.type, latitude: p.latitude, longitude: p.longitude, address: p.address, orderIndex: i,
})))
const cardStyle = computed(() => dragTransform(drag.value.x, drag.value.y))
const dragDirection = computed(() => (Math.abs(drag.value.x) > 10 ? (drag.value.x > 0 ? 'right' : 'left') : null))
const hintOpacity = computed(() => swipeProgress(drag.value.x, SWIPE_THRESHOLD))

async function load() {
  if (!hasLocation.value) return
  loading.value = true
  loadError.value = false
  try {
    const result = await nearbyApi.getNearby(lat.value, lng.value, { radiusKm: radiusKm.value, take: 30, exclude: skipped.value.slice(-200) })
    const skip = new Set(skipped.value)
    places.value = result.filter((p) => !skip.has(p.stopId))
    index.value = 0
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/** 'left' = overslaan (onthouden), 'right' = bewaren in een lijst; daarna de volgende kaart. */
function decide(direction) {
  const place = current.value
  if (!place || busy) return
  busy = true
  drag.value = { x: direction === 'right' ? FLY_OUT_PX : -FLY_OUT_PX, y: drag.value.y }
  setTimeout(() => {
    if (direction === 'left') {
      skipped.value = [...skipped.value, place.stopId]
      saveSkipped(SKIPPED_KEY, skipped.value)
    } else {
      savingStop.value = { id: place.stopId, name: place.name }
      saveOpen.value = true
    }
    index.value += 1
    drag.value = { x: 0, y: 0 }
    busy = false
  }, FLY_OUT_MS)
}

function resetSkipped() {
  skipped.value = []
  saveSkipped(SKIPPED_KEY, [])
  load()
}

function onPointerDown(e) {
  // Links en knoppen in de kaart blijven gewoon klikbaar.
  if (e.target.closest?.('a,button') || busy) return
  pointerStart = { x: e.clientX, y: e.clientY }
  dragging.value = true
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e) {
  if (!pointerStart) return
  drag.value = { x: e.clientX - pointerStart.x, y: e.clientY - pointerStart.y }
}

function onPointerUp() {
  if (!pointerStart) return
  pointerStart = null
  dragging.value = false
  const direction = swipeDirection(drag.value.x, drag.value.y)
  if (direction) decide(direction)
  else drag.value = { x: 0, y: 0 }
}

function cancelDrag() {
  pointerStart = null
  dragging.value = false
  drag.value = { x: 0, y: 0 }
}

function onKey(e) {
  if (saveOpen.value || !current.value) return
  if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    decide('left')
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    decide('right')
  }
}

watch(() => [route.query.lat, route.query.lng], load)
onMounted(() => {
  load()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
