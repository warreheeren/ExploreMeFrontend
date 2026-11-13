<template>
  <section v-if="visible" class="card card-pad" aria-labelledby="stays-title">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 id="stays-title" class="card-title">{{ $t('stays.title') }}</h2>
        <p class="mt-1 text-sm text-muted">
          {{ copied ? $t('stays.introCopied') : $t('stays.intro', { adults: $t('stays.adults', adults || participantCount) }) }}
        </p>
      </div>
      <label v-if="stays.length" class="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted">
        {{ $t('stays.adultsLabel') }}
        <select v-model.number="adults" class="select h-9 w-20 py-0 text-sm" @change="load">
          <option v-for="n in MAX_ADULTS" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading && !stays.length" class="space-y-2" aria-busy="true" :aria-label="$t('stays.loading')">
      <div v-for="i in 2" :key="i" class="skeleton h-20 rounded-2xl" />
    </div>

    <ul v-else class="space-y-2">
      <li v-for="s in stays" :key="s.stopId" class="rounded-2xl border border-line bg-surface p-3">
        <div class="flex items-start gap-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" :class="accommodation.soft" aria-hidden="true">
            <Icon :name="accommodation.icon" :size="18" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-ink">{{ s.name }}</p>
            <p class="text-xs text-muted">
              {{ formatDateRange(s.checkInDate, s.checkOutDate) }} · {{ $t('stays.nights', s.nights) }}
              <template v-if="s.address"> · <span class="break-words">{{ s.address }}</span></template>
            </p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <a
            :href="bookingUrl(s, { adults, affiliateId: integrations.bookingAffiliateId })"
            target="_blank"
            rel="noopener noreferrer sponsored"
            class="btn btn-secondary btn-sm"
            :aria-label="$t('stays.openAria', { name: s.name, site: $t('stays.booking') })"
          >
            {{ $t('stays.booking') }} <Icon name="external" :size="14" />
          </a>
          <a
            :href="googleHotelsUrl(s, { adults })"
            target="_blank"
            rel="noopener noreferrer sponsored"
            class="btn btn-secondary btn-sm"
            :aria-label="$t('stays.openAria', { name: s.name, site: $t('stays.googleHotels') })"
          >
            {{ $t('stays.googleHotels') }} <Icon name="external" :size="14" />
          </a>
        </div>

        <div v-if="s.quote" class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
          <p class="text-sm text-body">
            <component
              :is="s.quote.deepLinkUrl ? 'a' : 'span'"
              v-bind="s.quote.deepLinkUrl ? { href: s.quote.deepLinkUrl, target: '_blank', rel: 'noopener noreferrer sponsored' } : {}"
              class="font-bold text-ink"
              :class="s.quote.deepLinkUrl ? 'hover:underline' : ''"
            >{{ $t('stays.priceFrom', { price: formatCurrency(s.quote.pricePerNight, s.quote.currency) }) }}</component>
            <span class="text-muted"> · {{ $t('stays.via', { provider: s.quote.provider }) }} · {{ timeAgo(s.quote.fetchedAtUtc) }}</span>
          </p>
          <button
            v-if="canUseQuote(s)"
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="savingStopId === s.stopId"
            @click="useQuote(s)"
          >
            <Icon name="wallet" :size="14" /> {{ $t('stays.useInBudget') }}
          </button>
        </div>
        <p v-else-if="s.currentPricePerNight" class="mt-2 text-xs text-muted">
          {{ $t('stays.current', { price: formatCurrency(s.currentPricePerNight, currency) }) }}
        </p>
      </li>

      <li v-for="s in undated" :key="s.id" class="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line-strong p-3">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" :class="accommodation.soft" aria-hidden="true">
          <Icon :name="accommodation.icon" :size="18" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-ink">{{ s.name }}</p>
          <p class="text-xs text-muted">{{ $t('stays.noDates') }}</p>
        </div>
        <RouterLink :to="`/trips/${trip.id}/edit`" class="btn btn-ghost btn-sm"><Icon name="edit" :size="14" /> {{ $t('stays.addDates') }}</RouterLink>
      </li>
    </ul>

    <p v-if="stays.length" class="mt-3 text-xs text-muted">{{ $t('stays.affiliateNote') }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import * as staysApi from '@/api/staysApi'
import { useIntegrations } from '@/composables/useIntegrations'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { diffDays, formatCurrency, formatDateRange, timeAgo, todayDateOnly } from '@/utils/date'
import { nightsFor, stopTypeMeta } from '@/utils/stopTypes'
import { bookingUrl, clampAdults, googleHotelsUrl, MAX_ADULTS } from '@/utils/stayLinks'

const props = defineProps({
  /** TripDto (stops, collaborators, canEdit, baseCurrency). */
  trip: { type: Object, required: true },
  /** Kaart na het kopiëren van een reis: andere intro. */
  copied: { type: Boolean, default: false },
})
const emit = defineEmits(['updated'])

const { t } = useI18n()
const toast = useToastStore()
const { status: integrations, load: loadIntegrations } = useIntegrations()
const accommodation = stopTypeMeta('Accommodation')

const data = ref(null)
const loading = ref(false)
const adults = ref(null)
const savingStopId = ref(null)

const isAccommodation = (s) => s.type === 'Accommodation'
const participantCount = computed(() => 1 + (props.trip.collaborators || []).filter((c) => c.status === 'Accepted').length)

/**
 * Zelfde selectie als de backend (check-in vanaf vandaag, check-out erna): fallback wanneer de API faalt,
 * zodat de deeplinks altijd werken.
 */
const localStays = computed(() => (props.trip.stops || [])
  .filter((s) => isAccommodation(s) && s.checkInDate && s.checkOutDate
    && diffDays(todayDateOnly(), s.checkInDate) >= 0 && diffDays(s.checkInDate, s.checkOutDate) > 0)
  .sort((a, b) => diffDays(b.checkInDate, a.checkInDate))
  .map((s) => ({
    stopId: s.id,
    name: s.name,
    address: s.address,
    checkInDate: s.checkInDate,
    checkOutDate: s.checkOutDate,
    nights: nightsFor(s),
    currentPricePerNight: s.pricePerNight,
    quote: null,
  })))

const stays = computed(() => data.value?.stays ?? localStays.value)
const currency = computed(() => data.value?.currency || props.trip.baseCurrency || 'EUR')

/** Verblijven zonder data: alleen nuttig voor wie ze kan invullen. */
const undated = computed(() => (props.trip.canEdit
  ? (props.trip.stops || []).filter((s) => isAccommodation(s) && (!s.checkInDate || !s.checkOutDate))
  : []))

// Verborgen zonder toekomstige verblijven (en zonder verblijven die nog data nodig hebben).
const visible = computed(() => stays.value.length > 0 || undated.value.length > 0)

function canUseQuote(s) {
  if (!props.trip.canEdit || !s.quote || s.quote.currency !== currency.value) return false
  return Number(s.quote.pricePerNight) !== Number(s.currentPricePerNight || 0)
}

async function load() {
  loading.value = true
  try {
    const result = await staysApi.getStays(props.trip.id, { adults: adults.value || undefined })
    data.value = result
    adults.value = result.adults
  } catch {
    // Geen prijzen, wel deeplinks op basis van de reis zelf.
    data.value = null
    adults.value = clampAdults(adults.value || participantCount.value)
  } finally {
    loading.value = false
  }
}

async function useQuote(s) {
  savingStopId.value = s.stopId
  try {
    const updated = await staysApi.setPricePerNight(props.trip.id, s.stopId, s.quote.pricePerNight)
    s.currentPricePerNight = s.quote.pricePerNight
    toast.success(t('stays.usedInBudget', { name: s.name }))
    emit('updated', updated)
  } catch (e) {
    toast.error(errorMessage(e, t('stays.useFailed')))
  } finally {
    savingStopId.value = null
  }
}

// Opnieuw laden wanneer verblijven of hun data wijzigen (niet bij een prijswijziging: die zetten we lokaal).
const staysKey = computed(() => (props.trip.stops || [])
  .filter(isAccommodation)
  .map((s) => `${s.id}:${s.name}:${s.checkInDate}:${s.checkOutDate}`)
  .join(';'))

watch(() => [props.trip.id, staysKey.value], (next, prev) => {
  if (prev && next[0] === prev[0] && next[1] === prev[1]) return
  if (next[0] !== prev?.[0]) adults.value = null
  load()
})

onMounted(() => {
  loadIntegrations()
  if (props.trip.stops?.some(isAccommodation)) load()
})
</script>
