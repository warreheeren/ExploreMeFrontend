<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader :title="$t('myTrips.title')" :subtitle="subtitle">
      <template #actions>
        <AiPlanLink />
        <!-- Op mobiel doet de plusknop in de tabbalk dit al. -->
        <RouterLink to="/trips/start" class="btn btn-primary hidden md:inline-flex"><Icon name="plus" :size="16" :stroke-width="2.5" /> {{ $t('myTrips.newTrip') }}</RouterLink>
      </template>
    </PageHeader>

    <OfflineTripsPanel />

    <div v-if="loading" class="space-y-4" aria-busy="true">
      <div v-for="i in 3" :key="i" class="card flex overflow-hidden">
        <div class="skeleton hidden w-48 rounded-none sm:block" />
        <div class="flex-1 space-y-2.5 p-5"><div class="skeleton h-5 w-24" /><div class="skeleton h-6 w-2/3" /><div class="skeleton h-3 w-1/2" /></div>
      </div>
    </div>

    <EmptyState v-else-if="error" icon="alert" :title="$t('myTrips.loadFailed')" :text="error">
      <button type="button" class="btn btn-secondary btn-sm" @click="load()">{{ $t('common.retry') }}</button>
    </EmptyState>

    <template v-else>
      <!-- Openstaande uitnodigingen: die wachten ook op jou. -->
      <ul v-if="invites.length" class="mb-5 space-y-2">
        <li v-for="invite in invites" :key="invite.tripId" class="flex items-center gap-3 rounded-2xl border border-accent-100 bg-accent-50 px-3.5 py-3">
          <Avatar :src="invite.ownerProfilePhotoUrl || ''" :name="invite.ownerDisplayName" size="sm" />
          <i18n-t keypath="myTrips.invite" tag="p" class="min-w-0 flex-1 text-sm font-semibold text-accent-800" scope="global">
            <template #name><strong class="font-extrabold">{{ invite.ownerDisplayName }}</strong></template>
            <template #trip><strong class="font-extrabold">{{ invite.tripTitle }}</strong></template>
          </i18n-t>
          <RouterLink to="/invites" class="btn btn-secondary btn-sm shrink-0">{{ $t('myTrips.viewInvite') }}</RouterLink>
        </li>
      </ul>

      <!-- Eerste keer: uitleg in drie stappen. -->
      <section v-if="!items.length" class="card card-pad mx-auto max-w-md text-center">
        <h2 class="title-display text-2xl text-ink">{{ $t('myTrips.empty.title') }}</h2>
        <p class="mx-auto mt-1.5 max-w-xs text-sm text-muted">{{ $t('myTrips.empty.text') }}</p>
        <ol class="mt-5 space-y-3 text-left">
          <li v-for="n in 3" :key="n" class="flex items-start gap-3">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-extrabold text-accent-800">{{ n }}</span>
            <span>
              <span class="block text-sm font-bold text-ink">{{ $t(`myTrips.empty.step${n}`) }}</span>
              <span class="block text-xs text-muted">{{ $t(`myTrips.empty.step${n}Hint`) }}</span>
            </span>
          </li>
        </ol>
        <RouterLink to="/trips/start" class="btn btn-dark btn-lg mt-6 w-full">{{ $t('myTrips.empty.start') }}</RouterLink>
        <p class="mt-3 text-xs text-muted">{{ $t('myTrips.empty.gotLink') }}</p>
      </section>

      <template v-else>
        <section v-for="group in visibleGroups" :key="group.id" class="mb-7" :aria-labelledby="`my-trips-${group.id}`">
          <h2 :id="`my-trips-${group.id}`" class="eyebrow mb-2.5">{{ $t(`myTrips.groups.${group.id}`) }}</h2>
          <div class="space-y-3.5">
            <MyTripCard v-for="item in group.items" :key="item.trip.id" :item="item" />
          </div>
          <p v-if="group.hidden" class="mt-3 text-center">
            <button type="button" class="text-sm font-bold text-accent-700 hover:underline" @click="showAllPast = true">{{ $t('myTrips.showOlder', group.hidden) }}</button>
          </p>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import MyTripCard from '@/components/trip/MyTripCard.vue'
import OfflineTripsPanel from '@/components/trip/OfflineTripsPanel.vue'
import AiPlanLink from '@/components/ai/AiPlanLink.vue'
import * as tripsApi from '@/api/tripsApi'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { PAST_VISIBLE, TRIP_PHASES, groupTrips, waitingCount } from '@/utils/myTrips'

// Startscherm van de groepsreis-app (zonder de vlag `feed`): jouw reizen en wat er op jou wacht.
const { t } = useI18n()

const items = ref([])
const invites = ref([])
const loading = ref(true)
const error = ref('')
const showAllPast = ref(false)

const waiting = computed(() => waitingCount(items.value, invites.value))
const subtitle = computed(() => {
  if (loading.value || error.value || (!items.value.length && !invites.value.length)) return ''
  return waiting.value ? t('myTrips.waitingTotal', waiting.value) : t('myTrips.allDone')
})

const visibleGroups = computed(() => {
  const groups = groupTrips(items.value)
  return TRIP_PHASES
    .map((id) => {
      const all = groups[id]
      const capped = id === 'past' && !showAllPast.value ? all.slice(0, PAST_VISIBLE) : all
      return { id, items: capped, hidden: all.length - capped.length }
    })
    .filter((g) => g.items.length)
})

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    // Uitnodigingen zijn bijzaak: mislukt dat verzoek, dan tonen we gewoon de reizen.
    const [home, pending] = await Promise.all([tripsApi.getTripsHome(), collaboratorsApi.getMyInvites().catch(() => [])])
    items.value = home
    invites.value = pending
    error.value = ''
  } catch (e) {
    if (!silent) error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

const reload = () => load({ silent: true })
let unsubscribers = []

onMounted(() => {
  load()
  // Een reisgenoot start een stemming, wijst een taak toe of nodigt je uit: de lijst hoort mee te bewegen.
  unsubscribers = [
    onRealtime('tripChanged', reload),
    onRealtime('checklistChanged', reload),
    onRealtime('notification', (n) => { if (String(n?.type || '').startsWith('trip_')) reload() }),
  ]
  window.addEventListener('app-refresh', reload)
})

onBeforeUnmount(() => {
  unsubscribers.forEach((off) => off())
  window.removeEventListener('app-refresh', reload)
})
</script>
