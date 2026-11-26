<template>
  <article class="card flex flex-col overflow-hidden sm:flex-row">
    <RouterLink :to="tripLink" class="block h-24 shrink-0 bg-gray-100 sm:h-auto sm:w-48" tabindex="-1" aria-hidden="true">
      <CoverImage :src="thumbUrl(trip.coverImageUrl)" :alt="''" :seed="trip.id" img-class="h-full w-full object-cover" />
    </RouterLink>

    <div class="min-w-0 flex-1 p-4 sm:p-5">
      <div class="flex flex-wrap items-center gap-2">
        <span class="chip" :class="phaseChipClass">{{ phaseLabel }}</span>
        <span v-if="item.isOwner" class="chip">{{ $t('myTrips.owner') }}</span>
      </div>

      <h3 class="title-display mt-2 text-xl leading-snug">
        <RouterLink :to="tripLink" class="hover:underline">{{ trip.title }}</RouterLink>
      </h3>

      <div class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-muted">
        <span>{{ phase === 'undated' ? $t('myTrips.datePollRunning') : formatDateRange(trip.startDate, trip.endDate) }}</span>
        <span aria-hidden="true">·</span>
        <span class="inline-flex items-center gap-2">
          <span v-if="item.participants.length > 1" class="flex -space-x-1.5" aria-hidden="true">
            <Avatar v-for="(p, i) in item.participants" :key="i" :src="p.profilePhotoUrl || ''" :name="p.displayName" size="xs" ring />
          </span>
          {{ $t('myTrips.people', item.participantCount) }}
        </span>
      </div>

      <!-- Wat er op jou wacht: alleen jouw acties, niet die van de rest van de groep. -->
      <div v-if="actions.length" class="mt-3 border-t border-line pt-2.5">
        <p v-if="item.actionCount" class="mb-1 text-xs font-extrabold text-rating-text">{{ $t('myTrips.waiting', item.actionCount) }}</p>
        <ul>
          <li v-for="(a, i) in actions" :key="i">
            <RouterLink :to="a.to" class="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink transition hover:bg-gray-50">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-body"><Icon :name="a.icon" :size="15" /></span>
              <span class="flex min-w-0 flex-1 items-baseline gap-1">
                <span class="min-w-0 truncate">{{ a.label }}</span>
                <span v-if="a.due" class="shrink-0 whitespace-nowrap text-xs" :class="a.overdue ? 'font-bold text-red-600' : 'font-semibold text-muted'">· {{ a.due }}</span>
              </span>
              <Icon name="chevron-right" :size="16" class="shrink-0 text-muted" />
            </RouterLink>
          </li>
        </ul>
        <RouterLink v-if="hiddenActions > 0" :to="tripLink" class="mt-1 inline-block text-xs font-bold text-accent-700 hover:underline">{{ $t('myTrips.moreActions', hiddenActions) }}</RouterLink>
      </div>

      <!-- Geld: pas vanaf vertrek, en alleen als er iets openstaat. -->
      <div v-if="hasBalance" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
        <p class="min-w-0 flex-1 text-sm font-semibold text-body">
          <span class="mr-1.5 text-base font-extrabold tabular-nums" :class="item.myBalance > 0 ? 'text-accent-700' : 'text-red-600'">{{ formatCurrency(Math.abs(item.myBalance), item.baseCurrency) }}</span>
          {{ item.myBalance > 0 ? $t('myTrips.owedToYou') : $t('myTrips.youOwe') }}
        </p>
        <RouterLink :to="{ path: tripLink, query: { tab: 'budget' } }" class="btn btn-secondary btn-sm">{{ $t('myTrips.settle') }}</RouterLink>
      </div>
      <!-- Afgelopen en afgehandeld: terugblikken, of dezelfde groep opnieuw op pad sturen. -->
      <p v-else-if="phase === 'past' && !actions.length" class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-sm">
        <RouterLink :to="`${tripLink}/recap`" class="font-bold text-accent-700 hover:underline">{{ $t('myTrips.recap') }}</RouterLink>
        <RouterLink :to="`${tripLink}/photobook`" class="font-bold text-accent-700 hover:underline">{{ $t('photobook.make') }}</RouterLink>
        <RouterLink v-if="item.participantCount > 1" :to="{ name: 'trip-start', query: { again: trip.id } }" class="font-bold text-accent-700 hover:underline">{{ $t('myTrips.again') }}</RouterLink>
      </p>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import Icon from '@/components/ui/Icon.vue'
import { thumbUrl } from '@/utils/media'
import { daysUntil, formatCurrency, formatDateRange } from '@/utils/date'
import { tripDayProgress, tripPhase } from '@/utils/myTrips'
import { describeActions } from '@/utils/tripActions'

// Eén reis op het startscherm "Mijn reizen": waar staat de reis, en wat moet ík nog doen.
const props = defineProps({
  /** TripHomeItemDto: { trip, isOwner, participantCount, participants, hasOpenDatePoll, actionCount, actions, myBalance, baseCurrency } */
  item: { type: Object, required: true },
})

const { t } = useI18n()
const trip = computed(() => props.item.trip)
const tripLink = computed(() => `/trips/${trip.value.id}`)
const phase = computed(() => tripPhase(props.item))

const phaseLabel = computed(() => {
  if (phase.value === 'active') return t('myTrips.phase.active', tripDayProgress(trip.value))
  if (phase.value === 'past') return t('myTrips.phase.past')
  if (phase.value === 'undated') return t('myTrips.phase.undated')
  return t('myTrips.phase.upcoming', daysUntil(trip.value.startDate))
})
const phaseChipClass = computed(() => (phase.value === 'active' ? 'bg-ink text-surface' : phase.value === 'upcoming' ? 'chip-accent' : ''))

const actions = computed(() => {
  const list = describeActions(props.item.actions).map((a) => ({ ...a, to: { path: tripLink.value, query: { tab: a.tab } } }))
  // Onderweg is het dagschema van vandaag altijd de eerste stap.
  if (phase.value === 'active') list.unshift({ icon: 'calendar', label: t('myTrips.actions.today'), to: `${tripLink.value}/today` })
  return list
})
const hiddenActions = computed(() => Math.max(0, (props.item.actionCount || 0) - (props.item.actions || []).length))
const hasBalance = computed(() => typeof props.item.myBalance === 'number' && Math.abs(props.item.myBalance) >= 0.005)
</script>
