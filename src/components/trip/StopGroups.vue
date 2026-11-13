<template>
  <div class="space-y-4">
    <section v-for="group in groups" :key="group.type" class="card card-pad">
      <header class="mb-2 flex items-center gap-2.5">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg" :class="group.meta.soft"><Icon :name="group.meta.icon" :size="16" /></span>
        <h3 class="card-title">{{ group.meta.label }}</h3>
        <span class="text-sm font-bold text-muted">{{ group.stops.length }}</span>
      </header>
      <div class="-mx-2.5 space-y-0.5">
        <template v-for="stop in group.stops" :key="stop.id">
          <div class="group flex items-start">
            <StopRow
              class="min-w-0 flex-1"
              :stop="stop"
              :number="numberOf(stop)"
              :selected="stop.id === selectedStopId"
              :badge="stop.id === topFoodId ? $t('planning.stop.topPick') : ''"
              :show-added-by="showAddedBy"
              @select="$emit('select', $event)"
            />
            <StopActions
              v-if="actions"
              :stop="stop"
              :trip-id="tripId"
              :can-edit="canEdit"
              :trip-start-date="tripStartDate"
              :trip-end-date="tripEndDate"
              :base-currency="baseCurrency"
              @save="$emit('save', $event)"
              @stops-added="$emit('stops-added', $event)"
            />
          </div>
          <!-- Uitklapdetail van een geselecteerde vliegtuig-stop: vluchtstatus (of alleen de tracker-link). -->
          <FlightStatusCard v-if="tripId && stop.flightNumber && stop.id === selectedStopId" :trip-id="tripId" :stop="stop" class="mx-2.5 mb-2" />
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import Icon from '../ui/Icon.vue'
import StopRow from './StopRow.vue'
import StopActions from './StopActions.vue'
import { STOP_TYPE_ORDER, stopTypeMeta } from '@/utils/stopTypes'

// Lazy: alleen nodig als een stop met vluchtnummer geselecteerd is.
const FlightStatusCard = defineAsyncComponent(() => import('./FlightStatusCard.vue'))

const props = defineProps({
  stops: { type: Array, default: () => [] },
  selectedStopId: { type: String, default: null },
  showAddedBy: { type: Boolean, default: false },
  /** Knoppen voor plekpagina en bewaren tonen. */
  actions: { type: Boolean, default: false },
  /** Voor de "Wat te doen"-knop in StopActions; zonder tripId geen knop. */
  tripId: { type: String, default: null },
  canEdit: { type: Boolean, default: false },
  tripStartDate: { type: String, default: null },
  tripEndDate: { type: String, default: null },
  baseCurrency: { type: String, default: 'EUR' },
})
defineEmits(['select', 'save', 'stops-added'])

const ordered = computed(() => [...props.stops].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)))

const groups = computed(() =>
  STOP_TYPE_ORDER
    .map((type) => ({ type, meta: stopTypeMeta(type), stops: ordered.value.filter((s) => s.type === type) }))
    .filter((g) => g.stops.length > 0)
)

const topFoodId = computed(() => {
  const rated = props.stops.filter((s) => s.type === 'FoodSpot' && s.rating)
  if (rated.length < 2) return null
  return rated.reduce((best, s) => (s.rating > best.rating ? s : best)).id
})

function numberOf(stop) {
  return ordered.value.findIndex((s) => s.id === stop.id) + 1
}
</script>
