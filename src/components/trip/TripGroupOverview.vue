<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div class="min-w-0 space-y-4">
      <!-- Wacht op jou: alleen jouw acties in deze reis -->
      <section class="card card-pad" aria-labelledby="overview-waiting">
        <h2 id="overview-waiting" class="card-title">
          {{ $t('overview.waiting.title') }}
          <span v-if="actions.length" class="font-bold text-muted">{{ actions.length }}</span>
        </h2>
        <div v-if="loading" class="mt-3 space-y-2" aria-busy="true"><div class="skeleton h-9 rounded-xl" /><div class="skeleton h-9 rounded-xl" /></div>
        <ul v-else-if="actions.length" class="mt-2">
          <li v-for="(a, i) in actions" :key="i">
            <button type="button" class="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm font-semibold text-ink transition hover:bg-gray-50" @click="$emit('open-tab', a.tab)">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-body"><Icon :name="a.icon" :size="15" /></span>
              <span class="flex min-w-0 flex-1 items-baseline gap-1">
                <span class="min-w-0 truncate">{{ a.label }}</span>
                <span v-if="a.due" class="shrink-0 whitespace-nowrap text-xs" :class="a.overdue ? 'font-bold text-red-600' : 'font-semibold text-muted'">· {{ a.due }}</span>
              </span>
              <Icon name="chevron-right" :size="16" class="shrink-0 text-muted" />
            </button>
          </li>
        </ul>
        <p v-else class="mt-2 flex items-center gap-2 text-sm font-semibold text-accent-700"><Icon name="check-double" :size="16" /> {{ $t('overview.waiting.none') }}</p>
      </section>

      <!-- Waar staat de groep: vier stappen, de eerstvolgende met een knop -->
      <section class="card card-pad" aria-labelledby="overview-steps">
        <h2 id="overview-steps" class="card-title">{{ $t('overview.steps.title') }}</h2>
        <ol class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <li
            v-for="step in steps"
            :key="step.id"
            class="rounded-2xl border p-3"
            :class="step.state === 'done' ? 'border-accent-100 bg-accent-50' : step.state === 'now' ? 'border-ink ring-1 ring-ink' : 'border-line'"
          >
            <p class="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Icon v-if="step.state === 'done'" name="check" :size="14" class="text-accent-700" />
              {{ $t(`overview.steps.${step.id}.label`) }}
              <span v-if="step.state === 'done'" class="sr-only">{{ $t('overview.steps.doneAria') }}</span>
            </p>
            <p class="mt-0.5 text-xs text-muted">{{ step.text }}</p>
            <button v-if="step.action" type="button" class="mt-1.5 text-left text-xs font-extrabold text-accent-700 hover:underline" @click="step.action.run">
              {{ step.action.label }} ›
            </button>
          </li>
        </ol>
      </section>

      <!-- Laatste activiteit -->
      <section class="card card-pad" aria-labelledby="overview-activity">
        <h2 id="overview-activity" class="card-title">{{ $t('overview.activity.title') }}</h2>
        <div v-if="loading" class="mt-3 space-y-2" aria-busy="true"><div v-for="i in 3" :key="i" class="skeleton h-8 rounded-xl" /></div>
        <ul v-else-if="activity.length" class="mt-1 divide-y divide-line">
          <li v-for="(a, i) in activity" :key="i">
            <button type="button" class="flex w-full items-center gap-2.5 py-2.5 text-left text-sm" @click="$emit('open-tab', a.tab)">
              <Avatar :src="a.actorProfilePhotoUrl || ''" :name="a.actorDisplayName || '?'" size="xs" />
              <span class="min-w-0 flex-1 text-body">{{ a.sentence }}</span>
              <time class="shrink-0 text-xs text-muted" :datetime="a.atUtc">{{ timeAgo(a.atUtc) }}</time>
            </button>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-muted">{{ $t('overview.activity.empty') }}</p>
      </section>
    </div>

    <div class="min-w-0 space-y-4">
      <!-- Aftellen -->
      <section class="card card-pad text-center" :aria-label="$t('overview.countdown.aria')">
        <template v-if="phase === 'active'">
          <p class="text-4xl font-extrabold tabular-nums tracking-tight text-ink">{{ progress.day }}<span class="text-xl text-muted"> / {{ progress.total }}</span></p>
          <p class="mt-1 text-sm font-semibold text-muted">{{ $t('overview.countdown.active') }}</p>
          <RouterLink :to="`/trips/${trip.id}/today`" class="btn btn-dark btn-sm mt-3"><Icon name="sun" :size="15" /> {{ $t('today.button') }}</RouterLink>
        </template>
        <template v-else-if="phase === 'past'">
          <p class="title-display text-2xl text-ink">{{ $t('overview.countdown.past') }}</p>
          <RouterLink :to="`/trips/${trip.id}/photobook`" class="btn btn-dark btn-sm mt-3"><Icon name="book" :size="15" /> {{ $t('photobook.make') }}</RouterLink>
          <RouterLink :to="`/trips/${trip.id}/recap`" class="mt-2 block text-sm font-bold text-accent-700 hover:underline">{{ $t('myTrips.recap') }}</RouterLink>
        </template>
        <template v-else>
          <p class="text-5xl font-extrabold tabular-nums tracking-tight text-ink">{{ daysToGo }}</p>
          <p class="mt-1 text-sm font-semibold text-muted">{{ $t('overview.countdown.upcoming', daysToGo) }}</p>
        </template>
      </section>

      <!-- Reisgenoten (TripCrewCard vanuit de reispagina, die de dialogen beheert) -->
      <slot name="crew" />

      <!-- Geld -->
      <section class="card card-pad" aria-labelledby="overview-money">
        <h2 id="overview-money" class="card-title">{{ $t('overview.money.title') }}</h2>
        <p v-if="hasBalance" class="mt-2 text-sm font-semibold text-body">
          <span class="mr-1.5 text-xl font-extrabold tabular-nums" :class="balance > 0 ? 'text-accent-700' : 'text-red-600'">{{ formatCurrency(Math.abs(balance), currency) }}</span>
          {{ balance > 0 ? $t('myTrips.owedToYou') : $t('myTrips.youOwe') }}
        </p>
        <p class="mt-1.5 text-sm text-muted">
          {{ $t('overview.money.spent', { amount: formatCurrency(overview?.spentTotal || 0, currency) }) }}
          <template v-if="overview?.openPaymentRequests"> · {{ $t('overview.money.openRequests', overview.openPaymentRequests) }}</template>
        </p>
        <button type="button" class="mt-2 text-sm font-bold text-accent-700 hover:underline" @click="$emit('open-tab', 'budget')">{{ $t('overview.money.open') }} ›</button>
      </section>

      <!-- Groepschat -->
      <section class="card card-pad" aria-labelledby="overview-chat">
        <h2 id="overview-chat" class="card-title">
          {{ $t('overview.chat.title') }}
          <span v-if="overview?.chatUnread" class="badge">{{ overview.chatUnread > 99 ? '99+' : overview.chatUnread }}</span>
        </h2>
        <p v-if="overview?.lastMessage" class="mt-2 line-clamp-3 text-sm text-body">
          <span class="font-bold text-ink">{{ overview.lastMessage.senderDisplayName.split(' ')[0] }}:</span> {{ overview.lastMessage.text }}
        </p>
        <p v-else class="mt-2 text-sm text-muted">{{ $t('overview.chat.empty') }}</p>
        <RouterLink :to="`/messages/trip/${trip.id}`" class="mt-2 inline-block text-sm font-bold text-accent-700 hover:underline">{{ $t('overview.chat.open') }} ›</RouterLink>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import * as tripsApi from '@/api/tripsApi'
import { onRealtime } from '@/services/realtime'
import { formatCurrency, formatDateRange, daysUntil, timeAgo } from '@/utils/date'
import { tripDayProgress } from '@/utils/myTrips'
import { describeActions } from '@/utils/tripActions'
import { groupSteps } from '@/utils/tripOverview'

// Tabblad "Overzicht" van een reis (alleen deelnemers): wat wacht op jou, waar staat de groep, wat gebeurde er.
// Laadt zijn eigen gegevens (GET /trips/{id}/overview) en meldt ze aan de reispagina voor de bolletjes op de tabs.
const props = defineProps({
  /** TripDto van de reispagina (titel, data, stops, collaborators, isOwner). */
  trip: { type: Object, required: true },
})
const emit = defineEmits(['open-tab', 'invite-link', 'loaded'])

const { t } = useI18n()
const router = useRouter()

const overview = ref(null)
const loading = ref(true)

const item = computed(() => overview.value?.item || null)
const currency = computed(() => item.value?.baseCurrency || props.trip.baseCurrency || 'EUR')
const balance = computed(() => item.value?.myBalance ?? null)
const hasBalance = computed(() => typeof balance.value === 'number' && Math.abs(balance.value) >= 0.005)
const actions = computed(() => describeActions(item.value?.actions))

const daysToGo = computed(() => Math.max(0, daysUntil(props.trip.startDate)))
const phase = computed(() => (daysUntil(props.trip.endDate) < 0 ? 'past' : daysUntil(props.trip.startDate) <= 0 ? 'active' : 'upcoming'))
const progress = computed(() => tripDayProgress(props.trip))

const participantCount = computed(() => 1 + (props.trip.collaborators || []).filter((c) => c.status === 'Accepted').length)
const stopCount = computed(() => (props.trip.stops || []).length)

const steps = computed(() => {
  const states = groupSteps({
    participantCount: participantCount.value,
    hasOpenDatePoll: !!item.value?.hasOpenDatePoll,
    stopCount: stopCount.value,
    startDate: props.trip.startDate,
    endDate: props.trip.endDate,
    balance: balance.value,
  })
  const openTab = (tab) => () => emit('open-tab', tab)
  const detail = {
    group: {
      text: participantCount.value > 1 ? t('myTrips.people', participantCount.value) : t('overview.steps.group.alone'),
      // Alleen de eigenaar beheert de uitnodigingslink.
      action: props.trip.isOwner ? { label: t('overview.steps.group.action'), run: () => emit('invite-link') } : null,
    },
    dates: {
      text: item.value?.hasOpenDatePoll ? t('myTrips.datePollRunning') : formatDateRange(props.trip.startDate, props.trip.endDate),
      action: { label: t('overview.steps.dates.action'), run: openTab('stemmen') },
      // Data liggen vast maar de groep twijfelt nog: de datumprikker staat één tik verder.
      hint: phase.value === 'upcoming' ? { label: t('overview.steps.dates.unsure'), run: openTab('stemmen') } : null,
    },
    route: {
      text: stopCount.value ? t('overview.steps.route.stops', stopCount.value) : t('overview.steps.route.none'),
      action: { label: t('overview.steps.route.action'), run: () => router.push(`/trips/${props.trip.id}/edit`) },
    },
    settle: {
      text: phase.value !== 'past' ? t('overview.steps.settle.later') : hasBalance.value ? t('overview.steps.settle.open') : t('overview.steps.settle.done'),
      action: { label: t('overview.steps.settle.action'), run: openTab('budget') },
    },
  }
  return states.map((s) => ({
    ...s,
    text: detail[s.id].text,
    action: s.state === 'now' ? detail[s.id].action : s.state === 'done' ? detail[s.id].hint || null : null,
  }))
})

/** Eén zin per gebeurtenis; de API levert het type en de losse gegevens. */
const activity = computed(() => (overview.value?.activity || []).map((a) => {
  const name = a.actorDisplayName ? a.actorDisplayName.split(' ')[0] : t('overview.activity.someone')
  const amount = a.amount != null ? formatCurrency(a.amount, a.currency || currency.value) : ''
  const keys = { expense: 'expense', settlement: 'settlement', paymentRequest: 'paymentRequest', poll: 'poll', taskDone: 'taskDone', journal: a.text ? 'journalTitled' : 'journal', joined: 'joined' }
  const sentence = a.type === 'photos'
    ? t('overview.activity.photos', { name, n: a.count || 1 }, a.count || 1)
    : t(`overview.activity.${keys[a.type] || 'other'}`, { name, text: a.text || '', amount })
  return { ...a, sentence }
}))

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    overview.value = await tripsApi.getTripOverview(props.trip.id)
    emit('loaded', overview.value)
  } catch {
    // Het overzicht is een samenvatting: bij een fout blijven de stappen en reisgenoten bruikbaar.
    if (!silent) overview.value = null
  } finally {
    loading.value = false
  }
}

const reload = () => load({ silent: true })
const forThisTrip = (handler) => (e) => { if (!e?.tripId || e.tripId === props.trip.id) handler() }
let unsubscribers = []

onMounted(() => {
  load()
  unsubscribers = [
    onRealtime('tripChanged', forThisTrip(reload)),
    onRealtime('checklistChanged', forThisTrip(reload)),
    onRealtime('tripMessage', forThisTrip(reload)),
  ]
})
onBeforeUnmount(() => unsubscribers.forEach((off) => off()))

// Een andere reis in dezelfde pagina (navigatie zonder remount).
watch(() => props.trip.id, () => load())

defineExpose({ reload })
</script>
