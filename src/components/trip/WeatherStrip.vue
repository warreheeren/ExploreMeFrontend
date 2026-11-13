<template>
  <section class="card" :aria-label="$t('planning.weather.title')">
    <header class="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
      <h2 class="card-title flex items-center gap-2"><Icon name="cloud-sun" :size="18" /> {{ $t('planning.weather.title') }}</h2>
      <p v-if="kindNote" class="text-xs font-semibold text-muted">{{ kindNote }}</p>
    </header>

    <LoadingState v-if="loading" :text="$t('planning.weather.loading')" class="p-4"><div class="flex gap-2 overflow-hidden"><div v-for="i in 6" :key="i" class="skeleton h-28 w-24 shrink-0 rounded-xl" /></div></LoadingState>
    <p v-else-if="!data?.available || !days.length" class="px-4 pb-4 pt-2 text-sm text-muted">{{ data?.message || $t('planning.weather.unavailable') }}</p>
    <!-- tabindex: horizontaal scrollbare strook moet ook met het toetsenbord te scrollen zijn (WCAG 2.1.1). -->
    <ol v-else class="flex gap-2 overflow-x-auto rounded-b-2xl px-4 pb-4 pt-3 scrollbar-thin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500" role="list" tabindex="0" :aria-label="$t('planning.weather.title')">
      <li
        v-for="d in days"
        :key="d.date"
        class="flex w-[104px] shrink-0 flex-col rounded-xl border p-2.5"
        :class="isToday(d.date) ? 'border-accent-700 bg-accent-50' : 'border-line'"
        :title="`${d.locationName} · ${$t(`planning.weather.codes.${weatherInfo(d.weatherCode).key}`)}`"
      >
        <span class="text-[11px] font-bold uppercase tracking-wide text-muted">{{ formatDate(d.date, { weekday: 'short', day: 'numeric' }) }}</span>
        <Icon :name="weatherInfo(d.weatherCode).icon" :size="26" class="my-1.5 text-ink" />
        <span class="text-sm font-bold tabular-nums text-ink">{{ Math.round(d.tempMax) }}° <span class="font-bold text-muted">{{ Math.round(d.tempMin) }}°</span></span>
        <span class="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-muted">
          <Icon name="drop" :size="11" />
          <template v-if="d.precipitationProbability != null">{{ d.precipitationProbability }}%</template>
          <template v-else-if="d.precipitationSum != null">{{ d.precipitationSum }} mm</template>
          <template v-else>–</template>
        </span>
        <span class="mt-1 truncate text-[11px] text-muted">{{ d.locationName }}</span>
        <span v-if="d.kind !== 'forecast'" class="mt-1 self-start rounded-full bg-gray-100 px-1.5 text-[10px] font-bold text-muted">{{ $t(`planning.weather.kinds.${d.kind}`) }}</span>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import * as tripsApi from '@/api/tripsApi'
import { formatDate, toDateInput } from '@/utils/date'
import { weatherInfo } from '@/utils/weather'

const props = defineProps({
  tripId: { type: String, required: true },
  /** Verandert wanneer stops of datums wijzigen, zodat het weer opnieuw geladen wordt. */
  version: { type: [String, Number], default: '' },
  /** Alleen deze dag tonen ('YYYY-MM-DD'), bv. in de Vandaag-modus. */
  onlyDate: { type: String, default: null },
})
/** `loaded` geeft de weerdata door (o.a. de tijdzone per dag voor de zonstijden). */
const emit = defineEmits(['loaded'])

const { t } = useI18n()
const data = ref(null)
const loading = ref(true)
const today = toDateInput(new Date())

const days = computed(() => (data.value?.days || []).filter((d) => !props.onlyDate || toDateInput(d.date) === props.onlyDate))

const kindNote = computed(() => {
  const kinds = new Set((data.value?.days || []).map((d) => d.kind))
  if (kinds.has('lastYear')) return t('planning.weather.lastYearNote')
  if (kinds.size === 1 && kinds.has('observed')) return t('planning.weather.observedNote')
  return ''
})

function isToday(date) {
  return toDateInput(date) === today
}

async function load() {
  loading.value = true
  try {
    data.value = await tripsApi.getWeather(props.tripId)
    emit('loaded', data.value)
  } catch {
    data.value = { available: false, days: [], message: null }
  } finally {
    loading.value = false
  }
}

watch(() => [props.tripId, props.version], load)
onMounted(load)
</script>
