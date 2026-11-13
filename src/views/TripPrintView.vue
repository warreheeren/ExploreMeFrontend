<template>
  <div class="min-h-screen bg-ground print:bg-surface">
    <div class="print-hidden sticky top-0 z-10 border-b border-line bg-surface">
      <div class="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <RouterLink :to="`/trips/${route.params.id}`" class="btn btn-ghost btn-sm -ml-2"><Icon name="chevron-left" :size="16" /> {{ $t('sharedTrip.print.backToTrip') }}</RouterLink>
        <button v-if="trip" type="button" class="btn btn-secondary btn-sm ml-auto" @click="exportIcs"><Icon name="calendar" :size="14" /> {{ $t('sharedTrip.calendar') }}</button>
        <button v-if="trip" type="button" class="btn btn-dark btn-sm" @click="print"><Icon name="printer" :size="14" /> {{ $t('sharedTrip.print.print') }}</button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <p v-else-if="!trip" class="py-20 text-center text-sm text-muted">{{ $t('sharedTrip.print.loadFailed') }}</p>

    <article v-else class="mx-auto max-w-3xl bg-surface px-6 py-10 text-ink sm:my-6 sm:rounded-2xl sm:border sm:border-line sm:px-10 print:my-0 print:border-0 print:p-0">
      <header class="border-b-2 border-ink pb-5">
        <p class="text-xs font-bold uppercase tracking-[0.12em] text-accent-700">{{ trip.country }}</p>
        <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight">{{ trip.title }}</h1>
        <p class="mt-1 text-sm font-semibold text-body">{{ formatDateRange(trip.startDate, trip.endDate) }} · {{ $t('sharedTrip.print.days', days) }} · {{ $t('sharedTrip.print.by', { name: trip.displayName }) }}</p>
        <p v-if="trip.description" class="mt-3 whitespace-pre-line text-sm leading-relaxed text-body">{{ trip.description }}</p>
      </header>

      <!-- Samenvatting -->
      <section class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><p class="text-[11px] font-bold uppercase tracking-wider text-muted">{{ $t('sharedTrip.print.stops') }}</p><p class="text-xl font-extrabold">{{ trip.stops.length }}</p></div>
        <div><p class="text-[11px] font-bold uppercase tracking-wider text-muted">{{ $t('sharedTrip.print.nights') }}</p><p class="text-xl font-extrabold">{{ totalNights }}</p></div>
        <div><p class="text-[11px] font-bold uppercase tracking-wider text-muted">{{ $t('sharedTrip.print.crew') }}</p><p class="text-xl font-extrabold">{{ crew }}</p></div>
        <div><p class="text-[11px] font-bold uppercase tracking-wider text-muted">{{ $t('sharedTrip.print.estimated') }}</p><p class="text-xl font-extrabold">{{ formatCurrency(cost) }}</p></div>
      </section>

      <!-- Overnachtingen -->
      <section v-if="hotels.length" class="mt-8 break-inside-avoid">
        <h2 class="text-sm font-bold uppercase tracking-wider">{{ $t('sharedTrip.print.stays') }}</h2>
        <table class="mt-2 w-full text-sm">
          <thead>
            <tr class="border-b border-line text-left text-xs font-bold text-muted">
              <th class="py-1.5 pr-2 font-bold">{{ $t('sharedTrip.print.stay') }}</th>
              <th class="py-1.5 pr-2 font-bold">{{ $t('sharedTrip.print.date') }}</th>
              <th class="py-1.5 pr-2 text-right font-bold">{{ $t('sharedTrip.print.nights') }}</th>
              <th class="py-1.5 text-right font-bold">{{ $t('sharedTrip.print.total') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in hotels" :key="h.id" class="border-b border-line align-top">
              <td class="py-2 pr-2"><p class="font-bold">{{ h.name }}</p><p v-if="h.address" class="text-xs text-muted">{{ h.address }}</p></td>
              <td class="whitespace-nowrap py-2 pr-2">{{ h.checkInDate ? `${formatDate(h.checkInDate)} – ${formatDate(h.checkOutDate)}` : '—' }}</td>
              <td class="py-2 pr-2 text-right tabular-nums">{{ nightsFor(h) }}</td>
              <td class="py-2 text-right tabular-nums">{{ h.pricePerNight ? formatCurrency(h.pricePerNight * nightsFor(h)) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Dag voor dag -->
      <section class="mt-8">
        <h2 class="text-sm font-bold uppercase tracking-wider">{{ $t('sharedTrip.print.dayByDay') }}</h2>
        <div v-for="day in itinerary" :key="day.dayNumber" class="mt-4 break-inside-avoid">
          <h3 class="border-b border-line pb-1 text-base font-bold">{{ $t('sharedTrip.print.day', { n: day.dayNumber }) }} · {{ formatFullDate(day.date) }}</h3>
          <ol class="mt-2 space-y-2.5">
            <li v-for="s in day.stops" :key="s.id" class="flex gap-3 text-sm">
              <span class="mt-0.5 w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider" :style="{ color: stopTypeMeta(s.type).color }">{{ stopTypeMeta(s.type).singular }}</span>
              <span class="min-w-0">
                <span class="font-bold">{{ s.name }}</span>
                <span v-if="details(s)" class="text-body"> · {{ details(s) }}</span>
                <span v-if="s.address" class="block text-xs text-muted">{{ s.address }}</span>
                <span v-if="s.description" class="block text-xs leading-relaxed text-body">{{ s.description }}</span>
              </span>
            </li>
          </ol>
        </div>
        <p v-if="!itinerary.length" class="mt-2 text-sm text-muted">{{ $t('sharedTrip.print.noStops') }}</p>
      </section>

      <footer class="mt-10 border-t border-line pt-4 text-xs text-muted">
        {{ $t('sharedTrip.print.madeWith') }} · {{ origin }}/trips/{{ trip.id }}
      </footer>
    </article>
  </div>
</template>

<script setup>
import { publicWebOrigin } from '@/services/native'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import * as tripsApi from '@/api/tripsApi'
import { buildItinerary } from '@/utils/itinerary'
import { buildTripIcs, downloadTextFile, safeFileName } from '@/utils/ics'
import { formatCurrency, formatDate, formatDateRange, formatFullDate, tripDays } from '@/utils/date'
import { estimatedCost, nightsFor, stopTypeMeta } from '@/utils/stopTypes'

const { t } = useI18n()
const route = useRoute()
const trip = ref(null)
const loading = ref(true)
// Links/QR-codes naar buiten: in de native app de gehoste webapp i.p.v. https://localhost.
const origin = publicWebOrigin()

const days = computed(() => tripDays(trip.value?.startDate, trip.value?.endDate))
const itinerary = computed(() => (trip.value ? buildItinerary(trip.value) : []))
const hotels = computed(() => (trip.value?.stops || []).filter((s) => s.type === 'Accommodation').sort((a, b) => String(a.checkInDate).localeCompare(String(b.checkInDate))))
const totalNights = computed(() => hotels.value.reduce((n, h) => n + nightsFor(h), 0))
const cost = computed(() => estimatedCost(trip.value?.stops || []))
const crew = computed(() => 1 + (trip.value?.collaborators || []).filter((c) => c.status === 'Accepted').length)

function details(s) {
  if (s.type === 'Accommodation') return [s.checkInDate ? `${formatDate(s.checkInDate)} – ${formatDate(s.checkOutDate)}` : '', s.pricePerNight ? t('sharedTrip.print.perNight', { price: formatCurrency(s.pricePerNight) }) : ''].filter(Boolean).join(' · ')
  if (s.type === 'FoodSpot') return [s.rating ? `${s.rating}/5` : '', s.cuisineType, s.priceLevel ? '€'.repeat(s.priceLevel) : ''].filter(Boolean).join(' · ')
  if (s.type === 'Activity') return [s.duration, s.cost ? formatCurrency(s.cost) : t('sharedTrip.print.free')].filter(Boolean).join(' · ')
  return ''
}

function print() {
  window.print()
}

function exportIcs() {
  const ics = buildTripIcs(trip.value, { url: `${origin}/trips/${trip.value.id}` })
  downloadTextFile(`${safeFileName(trip.value.title)}.ics`, ics, 'text/calendar')
}

onMounted(async () => {
  try {
    trip.value = await tripsApi.getTripById(route.params.id)
    document.title = `${trip.value.title} · ${t('sharedTrip.print.documentTitle')}`
    if (route.query.auto) nextTick(() => setTimeout(print, 300))
  } catch {
    trip.value = null
  } finally {
    loading.value = false
  }
})
</script>
