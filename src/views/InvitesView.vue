<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="$t('misc.invites.title')" :subtitle="$t('misc.invites.subtitle')" />

    <div v-if="loading" class="space-y-3"><div v-for="i in 2" :key="i" class="skeleton h-28 rounded-2xl" /></div>

    <EmptyState v-else-if="!invites.length" icon="mail" :title="$t('misc.invites.emptyTitle')" :text="$t('misc.invites.emptyText')">
      <RouterLink to="/trips" class="btn btn-secondary btn-sm">{{ $t('misc.invites.discoverTrips') }}</RouterLink>
    </EmptyState>

    <ul v-else class="space-y-3">
      <li v-for="inv in invites" :key="inv.tripId" class="card flex flex-col gap-4 overflow-hidden p-4 sm:flex-row sm:items-center">
        <RouterLink :to="`/trips/${inv.tripId}`" class="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-20 sm:w-28">
          <CoverImage :src="thumbUrl(inv.tripCoverImageUrl)" :seed="inv.tripId" />
        </RouterLink>
        <div class="min-w-0 flex-1">
          <RouterLink :to="`/trips/${inv.tripId}`" class="block truncate text-base font-extrabold text-ink hover:underline">{{ inv.tripTitle }}</RouterLink>
          <p class="mt-1 flex items-center gap-2 text-sm text-body">
            <Avatar :src="inv.ownerProfilePhotoUrl" :name="inv.ownerDisplayName" size="xs" />
            <span><span class="font-bold">{{ inv.ownerDisplayName }}</span> {{ $t('misc.invites.invitesYou') }}</span>
          </p>
          <p class="mt-0.5 text-xs font-semibold text-muted">{{ timeAgo(inv.invitedAtUtc) }}</p>
        </div>
        <div class="flex gap-2 sm:flex-col">
          <button type="button" class="btn btn-primary btn-sm flex-1" :disabled="!!pending[inv.tripId]" @click="respond(inv, true)">
            {{ pending[inv.tripId] === 'accept' ? $t('misc.invites.busy') : $t('misc.invites.accept') }}
          </button>
          <button type="button" class="btn btn-secondary btn-sm flex-1" :disabled="!!pending[inv.tripId]" @click="respond(inv, false)">
            {{ pending[inv.tripId] === 'decline' ? $t('misc.invites.busy') : $t('misc.invites.decline') }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Avatar from '@/components/ui/Avatar.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'
import { useCountsStore } from '@/stores/counts'
import { useToastStore } from '@/stores/toast'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { timeAgo } from '@/utils/date'
import { thumbUrl } from '@/utils/media'

const counts = useCountsStore()
const toast = useToastStore()
const { t } = useI18n()

const invites = ref([])
const loading = ref(true)
const pending = reactive({})

async function load() {
  try {
    invites.value = await collaboratorsApi.getMyInvites()
    counts.apply({ invites: invites.value.length })
  } catch (e) {
    toast.error(errorMessage(e, t('misc.invites.loadFailed')))
  } finally {
    loading.value = false
  }
}

async function respond(inv, accept) {
  pending[inv.tripId] = accept ? 'accept' : 'decline'
  try {
    await collaboratorsApi.respondToInvite(inv.tripId, accept)
    invites.value = invites.value.filter((i) => i.tripId !== inv.tripId)
    counts.apply({ invites: invites.value.length })
    if (accept) toast.success(t('misc.invites.joined', { name: inv.ownerDisplayName }), { action: { label: t('misc.invites.viewTrip'), to: `/trips/${inv.tripId}` } })
    else toast.info(t('misc.invites.declined'))
  } catch (e) {
    toast.error(errorMessage(e, t('misc.invites.failed')))
  } finally {
    delete pending[inv.tripId]
  }
}

let off = () => {}
onMounted(() => {
  load()
  off = onRealtime('notification', (n) => { if (n?.type === 'trip_invite') load() })
  window.addEventListener('app-refresh', load)
})
onBeforeUnmount(() => {
  off()
  window.removeEventListener('app-refresh', load)
})
</script>
