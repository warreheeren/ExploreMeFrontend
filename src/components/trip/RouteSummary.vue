<template>
  <section class="card" :aria-label="$t('planning.route.title')">
    <button type="button" class="flex w-full items-center gap-3 p-4 text-left" :aria-expanded="open" @click="open = !open">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-800"><Icon :name="headerIcon" :size="18" /></span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-extrabold text-ink">
          <template v-if="route">{{ formatDistance(route.distanceMeters) }} · {{ formatDuration(route.durationSeconds) }} {{ onlyCar ? $t('planning.route.driving') : $t('planning.route.travelling') }}</template>
          <template v-else>{{ $t('planning.route.loading') }}</template>
        </span>
        <span class="block text-xs text-muted">{{ route?.source === 'estimate' ? $t('planning.route.estimate') : $t('planning.route.legs', { n: route?.legs.length || 0 }) }}</span>
      </span>
      <Icon :name="open ? 'chevron-up' : 'chevron-down'" :size="18" class="text-muted" />
    </button>
    <ol v-if="open && route" class="border-t border-line px-4 py-2">
      <li v-for="leg in route.legs" :key="leg.fromIndex" class="py-2 text-sm">
        <div class="flex items-center gap-3">
          <span class="flex shrink-0 items-center gap-1 text-xs font-extrabold text-muted">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-ink">{{ leg.fromIndex + 1 }}</span>
            <Icon :name="travelModeMeta(leg.mode).icon" :size="13" /><span class="sr-only">{{ travelModeMeta(leg.mode).label }}</span>
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-ink">{{ leg.toIndex + 1 }}</span>
          </span>
          <span class="min-w-0 flex-1 truncate font-semibold text-body">{{ stops[leg.toIndex]?.name }}</span>
          <span class="shrink-0 text-xs font-bold tabular-nums text-muted" :title="leg.isEstimated ? $t('planning.route.estimatedLeg') : null">
            <template v-if="leg.isEstimated">≈ </template>{{ formatDistance(leg.distanceMeters) }} · {{ formatDuration(leg.durationSeconds) }}
          </span>
        </div>

        <!-- OV-been: echte reis (Transitous) en altijd deeplinks naar de planners. -->
        <div v-if="isTransitLeg(leg)" class="ml-[4.25rem] mt-1.5 space-y-1.5">
          <template v-if="leg.transit">
            <p class="text-xs text-muted">
              {{ $t('planning.route.transit.connection', { dep: formatClock(leg.transit.departureUtc), arr: formatClock(leg.transit.arrivalUtc) }) }}
              <span>({{ $t('planning.route.transit.yourTime') }})</span>
              · {{ $t('planning.route.transit.transfers', leg.transit.transfers) }}
            </p>
            <ul v-if="rideParts(leg).length" class="flex flex-wrap items-center gap-1" :aria-label="$t('planning.route.transit.lines')">
              <li
                v-for="(part, i) in rideParts(leg)"
                :key="i"
                class="inline-flex max-w-[12rem] items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-extrabold"
                :class="part.color ? '' : 'bg-transit text-surface'"
                :style="chipStyle(part.color)"
                :title="$t('planning.route.transit.partTitle', { from: part.from, to: part.to })"
              >
                {{ part.line || $t(`planning.route.transit.modes.${modeGroup(part.mode)}`) }}
              </li>
            </ul>
          </template>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span class="font-bold text-muted">{{ $t('planning.route.transit.planWith') }}</span>
            <a
              v-for="link in linksFor(leg)"
              :key="link.key"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link inline-flex items-center gap-1"
              :aria-label="$t('planning.route.transit.openAria', { site: $t(`planning.route.transit.sites.${link.key}`), to: stops[leg.toIndex]?.name || '' })"
            >
              {{ $t(`planning.route.transit.sites.${link.key}`) }} <Icon name="external" :size="12" />
            </a>
          </div>
        </div>

        <!-- Autorit: één huurauto-link per reeks opeenvolgende autolegs (ophalen hier, inleveren bij de laatste stop). -->
        <div v-if="rentalLinkFor(leg)" class="ml-[4.25rem] mt-1.5 text-xs">
          <PartnerLink :href="rentalLinkFor(leg).url" icon="car">{{ $t('integrations.rentCarIn', { place: rentalLinkFor(leg).place }) }}</PartnerLink>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import PartnerLink from '@/components/ui/PartnerLink.vue'
import { useIntegrations } from '@/composables/useIntegrations'
import { formatTime } from '@/utils/date'
import { formatDistance, formatDuration } from '@/utils/format'
import { buildItinerary } from '@/utils/itinerary'
import { placeFromAddress } from '@/utils/stayLinks'
import { travelModeMeta } from '@/utils/travelModes'
import { transitLinks } from '@/utils/transitLinks'
import { carRentalRuns, discoverCarsUrl } from '@/utils/travelLinks'

const props = defineProps({
  route: { type: Object, default: null },
  /** Stops van de reis (worden op orderIndex gesorteerd, zoals de route). */
  tripStops: { type: Array, default: () => [] },
  /** Optioneel: de reis zelf, voor de ophaal-/inleverdatum van de huurauto-link (dag van de stop). */
  trip: { type: Object, default: null },
})

const { status: integrations, load: loadIntegrations } = useIntegrations()
onMounted(loadIntegrations)

const open = ref(false)
const stops = computed(() => [...props.tripStops].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)))
const onlyCar = computed(() => (props.route?.legs || []).every((l) => !l.mode || l.mode === 'Car'))
/** Icoon van de vervoerswijze met de langste afstand. */
const headerIcon = computed(() => {
  const longest = [...(props.route?.legs || [])].sort((a, b) => b.distanceMeters - a.distanceMeters)[0]
  return travelModeMeta(longest?.mode).icon
})

const isTransitLeg = (leg) => leg.mode === 'Train' || leg.mode === 'Bus'
const linksFor = (leg) => transitLinks(stops.value[leg.fromIndex], stops.value[leg.toIndex])
/** De OV-delen (zonder looptrajecten) voor de lijn-chips. */
const rideParts = (leg) => (leg.transit?.parts || []).filter((p) => p.mode !== 'walk')
/** Kloktijd in de tijdzone van de browser; de OV-reis is een voorbeeldverbinding, geen boeking. */
const formatClock = (value) => formatTime(value)

/** Kalenderdatum per stop-id volgens het dagschema; leeg zonder reis of startdatum. */
const dateByStop = computed(() => {
  if (!props.trip?.startDate) return {}
  const map = {}
  for (const day of buildItinerary(props.trip)) for (const stop of day.stops) map[stop.id] = day.date
  return map
})

/** Per eerste leg van een autoreeks: { url, place } voor DiscoverCars; null voor de andere legs. */
const rentalLinks = computed(() => {
  const links = {}
  for (const [from, to] of Object.entries(carRentalRuns(props.route?.legs || []))) {
    const pickupStop = stops.value[from]
    const place = placeFromAddress(pickupStop?.address, pickupStop?.name) || pickupStop?.name || ''
    const url = discoverCarsUrl({
      place,
      pickup: dateByStop.value[pickupStop?.id],
      dropoff: dateByStop.value[stops.value[to]?.id],
      affiliateId: integrations.value.discoverCarsAffiliateId,
    })
    if (url) links[from] = { url, place }
  }
  return links
})
const rentalLinkFor = (leg) => rentalLinks.value[leg.fromIndex] || null

const RAIL_MODES = new Set(['rail', 'highspeed_rail', 'long_distance', 'night_rail', 'regional_fast_rail', 'regional_rail', 'suburban'])
/** MOTIS-modus → label-groep voor chips zonder lijnnaam. */
function modeGroup(mode) {
  if (RAIL_MODES.has(mode)) return 'rail'
  if (mode === 'bus' || mode === 'coach') return 'bus'
  if (mode === 'tram') return 'tram'
  if (mode === 'subway' || mode === 'metro') return 'subway'
  if (mode === 'ferry') return 'ferry'
  return 'other'
}

/** Lijnkleur van de vervoerder als achtergrond, met leesbare tekst (donker op lichte kleuren). */
function chipStyle(color) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color || '')) return null
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
  return { backgroundColor: color, color: light ? '#111827' : '#FFFFFF' }
}
</script>
