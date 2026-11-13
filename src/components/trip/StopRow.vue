<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    class="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition"
    :class="[clickable ? 'hover:bg-gray-50' : '', selected ? 'bg-accent-50 ring-1 ring-accent-200' : '']"
    @click="clickable && $emit('select', stop)"
  >
    <span class="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl" :class="stop.imageUrl ? 'bg-gray-100' : meta.soft">
      <img v-if="stop.imageUrl" :src="thumbUrl(stop.imageUrl)" alt="" class="h-full w-full object-cover" loading="lazy" />
      <span v-else class="flex h-full w-full items-center justify-center"><Icon :name="meta.icon" :size="20" /></span>
      <span v-if="number" class="absolute left-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface px-1 text-[10px] font-bold text-ink">{{ number }}</span>
    </span>

    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-center gap-x-2">
        <span class="text-sm font-bold text-ink">{{ stop.name }}</span>
        <span v-if="badge" class="chip h-5 bg-ink px-2 text-[10px] text-surface">{{ badge }}</span>
      </span>
      <span v-if="stop.description" class="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-body">{{ stop.description }}</span>
      <span class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
        <template v-if="stop.type === 'Accommodation'">
          <span v-if="stop.checkInDate">{{ formatDate(stop.checkInDate) }} – {{ formatDate(stop.checkOutDate) }} · {{ $t('trip.stop.nights', nights) }}</span>
          <span v-if="stop.pricePerNight" class="text-violet-700">{{ $t('trip.stop.perNight', { price: formatCurrency(stop.pricePerNight) }) }}</span>
        </template>
        <template v-else-if="stop.type === 'FoodSpot'">
          <StarRating v-if="stop.rating" :model-value="stop.rating" size="xs" />
          <span v-if="stop.cuisineType">{{ stop.cuisineType }}</span>
          <span v-if="stop.priceLevel" class="text-body">{{ '€'.repeat(stop.priceLevel) }}</span>
        </template>
        <template v-else-if="stop.type === 'Activity'">
          <span v-if="stop.duration" class="inline-flex items-center gap-1"><Icon name="clock" :size="12" /> {{ stop.duration }}</span>
          <span class="text-emerald-700">{{ stop.cost ? formatCurrency(stop.cost) : $t('trip.stop.free') }}</span>
        </template>
        <span v-if="stop.flightNumber" class="inline-flex items-center gap-1"><Icon name="plane" :size="12" /> {{ $t('flights.stopChip', { number: stop.flightNumber }) }}</span>
        <span v-if="stop.address" class="inline-flex min-w-0 items-center gap-1"><Icon name="pin" :size="12" /><span class="truncate">{{ stop.address }}</span></span>
        <span v-if="showAddedBy && stop.addedByUserName" class="text-muted">{{ $t('trip.stop.addedBy') }} @{{ stop.addedByUserName }}</span>
      </span>
      <!-- Uitklapdetail: zonstijden op de reisdag van de stop (bij een geselecteerde stop, of altijd als de rij niet klikbaar is). -->
      <span v-if="showSun" class="mt-1 block">
        <SunTimes :date="date" :lat="stop.latitude" :lng="stop.longitude" :timezone="timezone" />
      </span>
    </span>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '../ui/Icon.vue'
import StarRating from '../StarRating.vue'
import SunTimes from './SunTimes.vue'
import { formatCurrency, formatDate } from '@/utils/date'
import { nightsFor, stopTypeMeta } from '@/utils/stopTypes'
import { thumbUrl } from '@/utils/media'

const props = defineProps({
  stop: { type: Object, required: true },
  number: { type: Number, default: null },
  selected: { type: Boolean, default: false },
  clickable: { type: Boolean, default: true },
  badge: { type: String, default: '' },
  showAddedBy: { type: Boolean, default: false },
  /** Reisdag van de stop; alleen dan tonen we de zonstijden. */
  date: { type: [String, Date], default: null },
  /** IANA-tijdzone van de stop (uit het weer); null = browsertijd. */
  timezone: { type: String, default: null },
})
defineEmits(['select'])

const meta = computed(() => stopTypeMeta(props.stop.type))
const showSun = computed(() =>
  !!props.date && Number.isFinite(props.stop.latitude) && Number.isFinite(props.stop.longitude) && (props.selected || !props.clickable))
const nights = computed(() => nightsFor(props.stop))
</script>
