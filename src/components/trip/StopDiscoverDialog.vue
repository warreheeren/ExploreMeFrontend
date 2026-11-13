<template>
  <Modal :model-value="modelValue" :title="$t('stopDiscover.title', { name: stop.name })" :subtitle="periodLabel" size="lg" :padded="false" @update:model-value="$emit('update:modelValue', $event)">
    <nav class="tabs px-5" role="tablist" :aria-label="$t('stopDiscover.openFor', { name: stop.name })">
      <button
        v-for="tb in tabs"
        :key="tb.id"
        type="button"
        role="tab"
        class="tab"
        :class="tab === tb.id ? 'tab-active' : ''"
        :aria-selected="tab === tb.id"
        @click="tab = tb.id"
      >
        <Icon :name="tb.icon" :size="16" /> {{ tb.label }}
      </button>
    </nav>

    <div class="p-5">
      <!-- Events (alleen met event-provider) -->
      <section v-if="tab === 'events'" role="tabpanel" class="space-y-3">
        <LoadingState v-if="eventsLoading" :text="$t('stopDiscover.events.loading')">
          <div class="space-y-3"><div v-for="i in 3" :key="i" class="skeleton h-24 rounded-2xl" /></div>
        </LoadingState>
        <EmptyState v-else-if="eventsFailed" icon="alert" :title="$t('stopDiscover.events.failed')">
          <button type="button" class="btn btn-secondary btn-sm" @click="loadEvents">{{ $t('stopDiscover.events.retry') }}</button>
        </EmptyState>
        <EmptyState v-else-if="!events.length" icon="ticket" :title="$t('stopDiscover.events.empty')" :text="$t('stopDiscover.events.emptyText')" />
        <template v-else>
          <!-- Eventafbeeldingen komen van de CDN van de eventdienst (externe inhoud): pas na toestemming laden. -->
          <div v-if="!imagesAllowed && events.some((e) => e.imageUrl)" class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3.5 py-2.5">
            <p class="text-xs text-muted">{{ $t('consent.gate.externalHint', { source: 'Ticketmaster' }) }}</p>
            <button type="button" class="btn btn-secondary btn-sm" @click="consent.grant('functional')"><Icon name="image" :size="14" /> {{ $t('consent.gate.loadImages') }}</button>
          </div>
          <article v-for="e in events" :key="e.id" class="flex gap-3 rounded-2xl border border-line bg-surface p-3">
            <img
              v-if="e.imageUrl && imagesAllowed && !brokenImages.has(e.id)"
              :src="e.imageUrl"
              alt=""
              loading="lazy"
              referrerpolicy="no-referrer"
              class="h-20 w-28 shrink-0 rounded-xl bg-gray-100 object-cover sm:w-36"
              @error="brokenImages.add(e.id)"
            />
            <span v-else class="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-muted" aria-hidden="true">
              <Icon name="ticket" :size="22" />
            </span>
            <div class="min-w-0 flex-1">
              <p v-if="e.category" class="eyebrow">{{ e.category }}</p>
              <h3 class="line-clamp-2 text-sm font-extrabold text-ink">{{ e.name }}</h3>
              <p class="mt-0.5 text-xs font-semibold text-muted">
                <span v-if="e.dayNumber">{{ $t('stopDiscover.events.day', { n: e.dayNumber }) }} · </span>{{ eventWhen(e) }}
              </p>
              <p v-if="e.venueName" class="mt-0.5 flex items-center gap-1 truncate text-xs text-muted"><Icon name="pin" :size="12" class="shrink-0" /> {{ e.venueName }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span v-if="e.minPrice != null && e.currency" class="text-xs font-bold text-ink">{{ $t('stopDiscover.events.from', { price: formatCurrency(e.minPrice, e.currency) }) }}</span>
                <a
                  :href="e.url"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  class="btn btn-secondary btn-sm"
                  :aria-label="$t('stopDiscover.events.ticketsFor', { name: e.name })"
                >
                  <Icon name="external" :size="14" /> {{ $t('stopDiscover.events.tickets') }}
                </a>
                <button
                  v-if="canEdit"
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="addingId === e.id || addedIds.has(e.id)"
                  @click="addEvent(e)"
                >
                  <Icon :name="addedIds.has(e.id) ? 'check' : 'plus'" :size="14" />
                  {{ addedIds.has(e.id) ? $t('stopDiscover.events.added') : addingId === e.id ? $t('stopDiscover.events.adding') : $t('stopDiscover.events.add') }}
                </button>
              </div>
            </div>
          </article>
          <p class="text-xs text-muted">{{ $t('stopDiscover.events.source') }}</p>
        </template>
      </section>

      <!-- Tours: alleen deeplinks -->
      <section v-else-if="tab === 'tours'" role="tabpanel" class="space-y-3">
        <p class="text-sm text-body">{{ $t('stopDiscover.tours.intro', { place: tourPlace }) }}</p>
        <a :href="links.getYourGuide" target="_blank" rel="noopener noreferrer sponsored" class="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:bg-gray-50">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Icon name="ticket" :size="20" /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-extrabold text-ink">{{ $t('stopDiscover.tours.getYourGuide') }}</span>
            <span class="block text-xs text-muted">{{ tourDate ? $t('stopDiscover.tours.getYourGuideText', { date: formatDate(tourDate) }) : $t('stopDiscover.tours.getYourGuideTextNoDate') }}</span>
          </span>
          <Icon name="external" :size="16" class="shrink-0 text-muted" />
        </a>
        <a :href="links.viator" target="_blank" rel="noopener noreferrer sponsored" class="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:bg-gray-50">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Icon name="compass" :size="20" /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-extrabold text-ink">{{ $t('stopDiscover.tours.viator') }}</span>
            <span class="block text-xs text-muted">{{ $t('stopDiscover.tours.viatorText') }}</span>
          </span>
          <Icon name="external" :size="16" class="shrink-0 text-muted" />
        </a>
        <p class="text-xs text-muted">{{ $t('stopDiscover.tours.disclaimer') }}</p>
      </section>

      <!-- Info: de plekinfo-kaart (fase 5) regelt zelf laden en de lege toestand. -->
      <section v-else role="tabpanel">
        <PlaceSummaryCard :stop-id="stop.id" />
      </section>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/Modal.vue'
import Icon from '../ui/Icon.vue'
import EmptyState from '../ui/EmptyState.vue'
import LoadingState from '../ui/LoadingState.vue'
import PlaceSummaryCard from './PlaceSummaryCard.vue'
import * as tripsApi from '@/api/tripsApi'
import { getStopEvents } from '@/api/stopDiscoverApi'
import { useIntegrations } from '@/composables/useIntegrations'
import { useToastStore } from '@/stores/toast'
import { useConsentStore } from '@/stores/consent'
import { errorMessage } from '@/utils/errors'
import { addDays, formatCurrency, formatDate, formatDateRange, formatFullDate, parseDateOnly, todayDateOnly } from '@/utils/date'
import { eventToStopPayload, getYourGuideUrl, tourPlaceFor, viatorUrl } from '@/utils/tourLinks'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  stop: { type: Object, required: true },
  tripId: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
  /** Begin- en einddatum van de reis (UTC-middernacht); bepalen de dagen van de stop. */
  tripStartDate: { type: String, default: null },
  tripEndDate: { type: String, default: null },
  /** Basismunt van de reis: een eventprijs wordt alleen in die munt als kosten overgenomen. */
  baseCurrency: { type: String, default: 'EUR' },
})
const emit = defineEmits(['update:modelValue', 'added'])

const { t } = useI18n()
const toast = useToastStore()
const { status: integrations, load: loadIntegrations } = useIntegrations()

const tabs = computed(() => [
  ...(integrations.value.events ? [{ id: 'events', label: t('stopDiscover.tabs.events'), icon: 'ticket' }] : []),
  { id: 'tours', label: t('stopDiscover.tabs.tours'), icon: 'compass' },
  { id: 'info', label: t('stopDiscover.tabs.info'), icon: 'info' },
])
const tab = ref('tours')

// ---------- dagen van de stop (zelfde regels als StopDiscoverService.PeriodFor) ----------
const period = computed(() => {
  const s = props.stop
  if (s.type === 'Accommodation' && s.checkInDate) {
    const from = parseDateOnly(s.checkInDate)
    const to = parseDateOnly(s.checkOutDate) || from
    return { from, to: to < from ? from : to }
  }
  if (!props.tripStartDate) return null
  if (s.dayNumber >= 1) {
    const day = addDays(props.tripStartDate, s.dayNumber - 1)
    return { from: day, to: day }
  }
  return { from: parseDateOnly(props.tripStartDate), to: parseDateOnly(props.tripEndDate) || parseDateOnly(props.tripStartDate) }
})
const periodLabel = computed(() => (period.value ? formatDateRange(period.value.from, period.value.to) : ''))

/** Eerste dag voor de tour-zoekopdracht: het begin van de stop, of vandaag als dat al voorbij is (zolang de stop loopt). */
const tourDate = computed(() => {
  if (!period.value) return null
  const today = todayDateOnly()
  if (period.value.to < today) return null
  return period.value.from < today ? today : period.value.from
})
const tourPlace = computed(() => tourPlaceFor(props.stop))
const links = computed(() => ({
  getYourGuide: getYourGuideUrl({ place: tourPlace.value, date: tourDate.value, partnerId: integrations.value.getYourGuidePartnerId }),
  viator: viatorUrl({ place: tourPlace.value, partnerId: integrations.value.viatorPartnerId }),
}))

// ---------- events ----------
const events = ref([])
const eventsLoading = ref(false)
const eventsFailed = ref(false)
const brokenImages = ref(new Set())
const consent = useConsentStore()
const imagesAllowed = computed(() => consent.has('functional'))
const addedIds = ref(new Set())
const addingId = ref(null)
let loadedFor = null
let request = 0

async function loadEvents() {
  const current = ++request
  eventsLoading.value = true
  eventsFailed.value = false
  try {
    const data = await getStopEvents(props.tripId, props.stop.id)
    if (current !== request) return
    events.value = data
    loadedFor = props.stop.id
  } catch {
    if (current === request) eventsFailed.value = true
  } finally {
    if (current === request) eventsLoading.value = false
  }
}

function eventWhen(e) {
  const date = formatFullDate(e.localDate || e.startUtc)
  const time = /^(\d{2}:\d{2})/.exec(e.localTime || '')
  return time ? `${date} · ${time[1]}` : date
}

async function addEvent(e) {
  addingId.value = e.id
  try {
    const trip = await tripsApi.addStops(props.tripId, [eventToStopPayload(e, { trip: { baseCurrency: props.baseCurrency }, stop: props.stop })])
    addedIds.value = new Set([...addedIds.value, e.id])
    toast.success(t('stopDiscover.events.addedToast', { name: e.name }))
    emit('added', trip)
  } catch (err) {
    toast.error(errorMessage(err, t('stopDiscover.events.addFailed')))
  } finally {
    addingId.value = null
  }
}

// Bij het eerste openen: status laden en op de eerste tab beginnen (Events als die er is). Daarna blijft de gekozen tab.
let initialized = false
watch(() => props.modelValue, async (open) => {
  if (!open) return
  await loadIntegrations()
  if (!initialized || !tabs.value.some((tb) => tb.id === tab.value)) tab.value = tabs.value[0].id
  initialized = true
}, { immediate: true })

watch(() => [props.modelValue, tab.value, props.stop.id], ([open, current, stopId]) => {
  if (open && current === 'events' && loadedFor !== stopId && !eventsLoading.value) loadEvents()
})
</script>
