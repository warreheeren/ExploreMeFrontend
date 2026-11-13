<template>
  <!-- Alleen inline elementen: staat ook binnen de klikbare StopRow-knop. -->
  <span v-if="sun.polar" class="inline-flex items-center gap-1 text-xs font-semibold text-muted" :aria-label="$t('sun.aria')">
    <Icon :name="sun.polar === 'day' ? 'sun' : 'moon'" :size="12" />
    {{ $t(sun.polar === 'day' ? 'sun.polarDay' : 'sun.polarNight') }}
  </span>
  <span v-else-if="sun.sunrise" class="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-muted" :aria-label="$t('sun.aria')">
    <span class="inline-flex items-center gap-1" :title="$t('sun.sunrise', { time: rise })"><Icon name="sunrise" :size="12" /> {{ rise }}</span>
    <span aria-hidden="true">·</span>
    <span class="inline-flex items-center gap-1" :title="$t('sun.sunset', { time: set })"><Icon name="sunset" :size="12" /> {{ set }}</span>
    <template v-if="goldenStart">
      <span aria-hidden="true">·</span>
      <span class="inline-flex items-center gap-1 text-amber-700" :title="$t('sun.goldenTitle')"><Icon name="sparkle" :size="12" /> {{ $t('sun.golden') }} {{ goldenStart }}–{{ set }}</span>
    </template>
    <span v-if="!timezone" class="font-normal">{{ $t('sun.yourTime') }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '../ui/Icon.vue'
import { localeTag } from '@/i18n'
import { formatClock, getSunTimes } from '@/utils/sun'

const props = defineProps({
  /** Kalenderdag in de lokale tijd van de plek. */
  date: { type: [String, Date], required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  /** IANA-tijdzone van de plek; zonder zone tonen we de tijd van de browser. */
  timezone: { type: String, default: null },
})

const sun = computed(() => getSunTimes(props.date, props.lat, props.lng))
const clock = (value) => formatClock(value, props.timezone, localeTag())
const rise = computed(() => clock(sun.value.sunrise))
const set = computed(() => clock(sun.value.sunset))
const goldenStart = computed(() => clock(sun.value.goldenEveningStart))
</script>
