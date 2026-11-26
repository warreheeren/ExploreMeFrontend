<template>
  <div class="flex shrink-0 flex-col items-center gap-0.5 pt-2 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
    <!-- Plekpagina's horen bij ontdekken, bewaren in een lijst bij lijsten. -->
    <RouterLink v-if="features.discover" :to="`/places/${stop.id}`" class="btn-icon btn-icon-sm" :aria-label="$t('planning.stop.viewPlace', { name: stop.name })" :title="$t('places.view')">
      <Icon name="compass" :size="16" />
    </RouterLink>
    <button v-if="features.lists" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('planning.stop.save', { name: stop.name })" :title="$t('places.save')" @click="$emit('save', stop)">
      <Icon name="bookmark" :size="16" />
    </button>
    <RouterLink
      v-if="features.nearby"
      :to="{ name: 'nearby', query: { lat: stop.latitude, lng: stop.longitude, name: stop.name } }"
      class="btn-icon btn-icon-sm"
      :aria-label="$t('nearby.openFor', { name: stop.name })"
      :title="$t('nearby.open')"
    >
      <Icon name="locate" :size="16" />
    </RouterLink>
    <!-- Wat te doen (events, tours, info): alleen binnen een reis. De dialoog wordt pas bij de eerste klik gemount. -->
    <button
      v-if="tripId"
      type="button"
      class="btn-icon btn-icon-sm"
      :aria-label="$t('stopDiscover.openFor', { name: stop.name })"
      :title="$t('stopDiscover.open')"
      @click="openDiscover"
    >
      <Icon name="ticket" :size="16" />
    </button>
    <StopDiscoverDialog
      v-if="tripId && discoverMounted"
      v-model="discoverOpen"
      :stop="stop"
      :trip-id="tripId"
      :can-edit="canEdit"
      :trip-start-date="tripStartDate"
      :trip-end-date="tripEndDate"
      :base-currency="baseCurrency"
      @added="$emit('stops-added', $event)"
    />
  </div>
</template>

<script setup>
import { features } from '@/config/features'
import { defineAsyncComponent, ref } from 'vue'
import Icon from '../ui/Icon.vue'

// Lazy: de dialoog (en de plekinfo-kaart) wordt pas geladen als iemand hem opent.
const StopDiscoverDialog = defineAsyncComponent(() => import('./StopDiscoverDialog.vue'))

defineProps({
  stop: { type: Object, required: true },
  /** Id van de reis; zonder id (bv. buiten een reis) geen "Wat te doen"-knop. */
  tripId: { type: String, default: null },
  canEdit: { type: Boolean, default: false },
  tripStartDate: { type: String, default: null },
  tripEndDate: { type: String, default: null },
  baseCurrency: { type: String, default: 'EUR' },
})
defineEmits(['save', 'stops-added'])

const discoverOpen = ref(false)
const discoverMounted = ref(false)

function openDiscover() {
  discoverMounted.value = true
  discoverOpen.value = true
}
</script>
