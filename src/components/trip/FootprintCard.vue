<template>
  <section class="card p-4 sm:p-5" aria-labelledby="footprint-title">
    <header class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-800"><Icon name="leaf" :size="18" /></span>
      <div class="min-w-0 flex-1">
        <h2 id="footprint-title" class="card-title flex flex-wrap items-center gap-2">
          {{ $t('footprint.title') }}
          <span class="chip">{{ $t('footprint.estimate') }}</span>
        </h2>
        <p v-if="footprint && footprint.legs.length" class="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span class="text-2xl font-extrabold tabular-nums text-ink">{{ formatCo2(footprint.totalKg) }}</span>
          <span class="text-xs font-semibold text-muted">{{ $t('footprint.unit') }} · {{ formatDistance(footprint.distanceKm * 1000) }}</span>
        </p>
        <p v-if="versusCarText" class="text-xs font-bold" :class="versusCar > 0 ? 'text-accent-800' : 'text-muted'">{{ versusCarText }}</p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-sm shrink-0"
        :aria-expanded="showInfo"
        aria-controls="footprint-info"
        :aria-label="$t('footprint.infoLabel')"
        :title="$t('footprint.infoLabel')"
        @click="showInfo = !showInfo"
      >
        <Icon name="info" :size="16" />
      </button>
    </header>

    <div v-if="showInfo" id="footprint-info" class="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-body">
      <p>{{ $t('footprint.info', { source: footprint?.source || 'DEFRA', n: footprint?.travellersInCar || 1 }) }}</p>
      <p v-if="footprint?.routeSource === 'estimate'" class="mt-1 text-muted">{{ $t('footprint.infoRoadEstimate') }}</p>
    </div>

    <LoadingState v-if="loading && !footprint" center class="mt-4" />
    <p v-else-if="failed" class="mt-3 text-sm text-muted">{{ $t('footprint.unavailable') }}</p>
    <p v-else-if="!footprint || !footprint.legs.length" class="mt-3 text-sm text-muted">{{ $t('footprint.empty') }}</p>

    <template v-else>
      <h3 class="eyebrow mt-4">{{ $t('footprint.byMode') }}</h3>
      <ul class="mt-2 space-y-2">
        <li v-for="m in footprint.byMode" :key="m.mode" class="grid grid-cols-[1.25rem_4.5rem_minmax(0,1fr)_auto] items-center sm:grid-cols-[1.25rem_5.5rem_minmax(0,1fr)_8.5rem] gap-2 text-sm">
          <Icon :name="travelModeMeta(m.mode).icon" :size="16" class="text-muted" />
          <span class="truncate font-semibold text-body">{{ travelModeMeta(m.mode).label }}</span>
          <span class="h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
            <span class="block h-full rounded-full bg-accent-600" :style="{ width: barWidth(m.kgCo2e) }" />
          </span>
          <span class="text-right text-xs font-bold tabular-nums text-muted">{{ formatCo2(m.kgCo2e) }}<span class="hidden sm:inline"> · {{ formatDistance(m.distanceKm * 1000) }}</span></span>
        </li>
      </ul>

      <h3 class="eyebrow mt-4">{{ $t('footprint.compare') }}</h3>
      <ul class="mt-2 grid grid-cols-3 gap-2">
        <li v-for="a in footprint.alternatives" :key="a.mode" class="rounded-xl border border-line px-2.5 py-2">
          <span class="flex items-center gap-1.5 text-xs font-semibold text-muted"><Icon :name="travelModeMeta(a.mode).icon" :size="14" /> {{ travelModeMeta(a.mode).label }}</span>
          <span class="mt-0.5 block text-sm font-extrabold tabular-nums text-ink">{{ formatCo2(a.kgCo2e) }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import LoadingState from '@/components/ui/LoadingState.vue'
import { formatDistance } from '@/utils/format'
import { formatCo2, savingPercent } from '@/utils/footprint'
import { travelModeMeta } from '@/utils/travelModes'

const props = defineProps({
  /** TripFootprintDto van de API; null tijdens het laden of zonder route. */
  footprint: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
})

const { t } = useI18n()
const showInfo = ref(false)

const maxKg = computed(() => Math.max(0, ...(props.footprint?.byMode || []).map((m) => m.kgCo2e)))
function barWidth(kg) {
  if (!maxKg.value) return '0%'
  // Altijd een stipje zichtbaar, ook bij 0 kg (fiets/wandelen).
  return `${Math.max(3, Math.round((kg / maxKg.value) * 100))}%`
}

const versusCar = computed(() => {
  const car = props.footprint?.alternatives?.find((a) => a.mode === 'Car')
  // Een reis die al helemaal met de auto gaat, heeft niets om mee te vergelijken.
  if (!car || props.footprint.byMode.every((m) => m.mode === 'Car')) return null
  return savingPercent(props.footprint.totalKg, car.kgCo2e)
})
const versusCarText = computed(() => {
  const pct = versusCar.value
  if (pct === null) return ''
  if (Math.abs(pct) < 5) return t('footprint.versusCarSame')
  return pct > 0 ? t('footprint.versusCar', { pct }) : t('footprint.versusCarMore', { pct: -pct })
})
</script>
