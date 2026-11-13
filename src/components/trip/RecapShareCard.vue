<template>
  <!-- Vaste 1080×1920-kaart (Stories-formaat) die html-to-image naar PNG omzet. -->
  <div class="flex h-[1920px] w-[1080px] flex-col bg-ink font-sans text-surface">
    <div class="relative h-[860px] w-full overflow-hidden bg-gray-800">
      <img v-if="coverSrc" :src="coverSrc" alt="" class="h-full w-full object-cover" crossorigin="anonymous" />
    </div>
    <div class="flex flex-1 flex-col px-[88px] pb-[96px] pt-[72px]">
      <p class="text-[30px] font-extrabold uppercase tracking-[0.14em] text-accent-400">{{ eyebrow }}</p>
      <h1 class="mt-[20px] line-clamp-2 text-[84px] font-extrabold leading-[1.05] tracking-tight">{{ recap.title }}</h1>
      <p class="mt-[20px] text-[34px] font-semibold opacity-75">{{ formatDateRange(recap.startDate, recap.endDate) }}</p>

      <div class="mt-[64px] grid grid-cols-2 gap-[28px]">
        <div v-for="s in stats" :key="s.label" class="rounded-[36px] border-2 border-surface/20 p-[36px]">
          <p class="text-[76px] font-extrabold leading-none tabular-nums">{{ s.value }}</p>
          <p class="mt-[12px] text-[28px] font-bold uppercase tracking-[0.1em] opacity-70">{{ s.label }}</p>
        </div>
      </div>

      <p v-if="recap.weather" class="mt-[48px] text-[34px] font-semibold opacity-85">
        {{ $t('tripExtras.recap.shareWeather', { temp: Math.round(recap.weather.warmest.tempMax), place: recap.weather.warmest.locationName }) }}
      </p>

      <div class="mt-auto flex items-center justify-between">
        <span class="text-[40px] font-extrabold tracking-tight">ExploreMe</span>
        <span class="text-[28px] font-bold opacity-70">{{ recap.ownerDisplayName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateRange } from '@/utils/date'
import { formatDistance } from '@/utils/format'

const props = defineProps({
  recap: { type: Object, required: true },
  coverSrc: { type: String, default: '' },
})

const { t } = useI18n()

const eyebrow = computed(() => [props.recap.countries?.join(' · '), t('tripExtras.recap.wrapped')].filter(Boolean).join(' — '))

const stats = computed(() => [
  { value: props.recap.days, label: t('tripExtras.recap.daysLabel', props.recap.days) },
  { value: props.recap.stopCount, label: t('tripExtras.recap.stopsLabel', props.recap.stopCount) },
  { value: props.recap.distanceMeters ? formatDistance(props.recap.distanceMeters) : '—', label: t('tripExtras.recap.distanceLabel') },
  { value: props.recap.photos?.length || 0, label: t('tripExtras.recap.photosLabel', props.recap.photos?.length || 0) },
])
</script>
