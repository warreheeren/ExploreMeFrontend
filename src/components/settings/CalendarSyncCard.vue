<template>
  <section v-if="available.length" class="card card-pad mb-5 space-y-4 sm:p-6" aria-labelledby="settings-calendar-sync">
    <div>
      <h2 id="settings-calendar-sync" class="card-title">{{ $t('calendarSync.title') }}</h2>
      <p class="mt-0.5 text-sm text-muted">{{ $t('calendarSync.text') }}</p>
    </div>

    <div v-if="loading" class="space-y-2"><div v-for="p in available" :key="p" class="skeleton h-14 rounded-xl" /></div>

    <ul v-else class="divide-y divide-line">
      <li v-for="p in providers" :key="p.provider" class="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center" :data-provider="p.provider">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-ink"><Icon name="calendar" :size="18" /></span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-ink">{{ $t(`calendarSync.providers.${p.provider}`) }}</p>
          <p class="truncate text-xs text-muted">{{ statusLine(p) }}</p>
          <p v-if="p.error === 'reauth'" class="mt-1 flex items-start gap-1 text-xs font-semibold text-red-600" role="alert">
            <Icon name="alert" :size="13" class="mt-px shrink-0" /> {{ $t('calendarSync.reauth') }}
          </p>
          <p v-else-if="p.error === 'failed'" class="mt-1 flex items-start gap-1 text-xs font-semibold text-rating-text">
            <Icon name="alert" :size="13" class="mt-px shrink-0" /> {{ $t('calendarSync.syncFailed') }}
          </p>
          <p v-else-if="p.connected && p.pending" class="mt-1 text-xs text-muted">{{ $t('calendarSync.pending') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-if="!p.connected" type="button" class="btn btn-primary btn-sm" :disabled="!!busy" @click="connect(p.provider)">
            <Icon name="link" :size="14" /> {{ $t(`calendarSync.connect.${p.provider}`) }}
          </button>
          <template v-else>
            <button v-if="p.error === 'reauth'" type="button" class="btn btn-primary btn-sm" :disabled="!!busy" @click="connect(p.provider)">
              <Icon name="link" :size="14" /> {{ $t('calendarSync.reconnect') }}
            </button>
            <button v-else type="button" class="btn btn-secondary btn-sm" :disabled="!!busy" @click="syncNow(p.provider)">
              <Icon name="refresh" :size="14" /> {{ busy === `sync:${p.provider}` ? $t('calendarSync.syncing') : $t('calendarSync.syncNow') }}
            </button>
            <button type="button" class="btn btn-danger-ghost btn-sm" :disabled="!!busy" @click="askDisconnect(p.provider)">
              <Icon name="x" :size="14" /> {{ $t('calendarSync.disconnect') }}
            </button>
          </template>
        </div>
      </li>
    </ul>

    <p class="hint">{{ $t('calendarSync.note') }}</p>

    <!-- Ontkoppelen: twee keuzes (events laten staan of verwijderen), dus een eigen dialoog in plaats van useConfirm. -->
    <Modal v-model="disconnectOpen" :title="$t('calendarSync.disconnectTitle', { provider: disconnectName })" size="sm">
      <p class="text-sm text-body">{{ $t('calendarSync.disconnectText') }}</p>
      <label class="mt-4 flex items-start gap-3 text-sm font-semibold text-ink">
        <input v-model="removeEvents" type="checkbox" class="checkbox mt-0.5 h-5 w-5" />
        <span>{{ $t('calendarSync.removeEvents') }}</span>
      </label>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="disconnectOpen = false">{{ $t('common.cancel') }}</button>
        <button type="button" class="btn btn-danger" :disabled="!!busy" @click="disconnect">{{ $t('calendarSync.disconnect') }}</button>
      </template>
    </Modal>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Modal from '@/components/ui/Modal.vue'
import * as calendarSyncApi from '@/api/calendarSyncApi'
import { useIntegrations } from '@/composables/useIntegrations'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { timeAgo } from '@/utils/date'

// "Agenda koppelen" in Instellingen → Account: eenrichtings-sync naar Google Agenda / Outlook. Alleen zichtbaar
// voor providers met een client-id op de server (status.calendarGoogle / calendarMicrosoft).
const { t } = useI18n()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()
const { status: integrations, load: loadIntegrations } = useIntegrations()

const providers = ref([])
const loading = ref(true)
/** '' | 'connect:<p>' | 'sync:<p>' | 'disconnect:<p>' */
const busy = ref('')
const disconnectOpen = ref(false)
const disconnectProvider = ref('')
const removeEvents = ref(false)

const available = computed(() => [
  integrations.value.calendarGoogle && 'google',
  integrations.value.calendarMicrosoft && 'microsoft',
].filter(Boolean))

const disconnectName = computed(() => (disconnectProvider.value ? t(`calendarSync.providers.${disconnectProvider.value}`) : ''))

function statusLine(p) {
  if (!p.connected) return t('calendarSync.notConnected')
  const who = p.accountEmail ? t('calendarSync.connectedAs', { email: p.accountEmail }) : t('calendarSync.connected')
  const when = p.lastSyncedAtUtc ? t('calendarSync.lastSynced', { time: timeAgo(p.lastSyncedAtUtc) }) : t('calendarSync.notSyncedYet')
  return `${who} · ${when}`
}

function replaceProvider(updated) {
  providers.value = providers.value.map((p) => (p.provider === updated.provider ? updated : p))
}

async function load() {
  loading.value = true
  try {
    providers.value = await calendarSyncApi.getCalendarSyncStatus()
  } catch {
    providers.value = available.value.map((provider) => ({ provider, connected: false }))
  } finally {
    loading.value = false
  }
}

async function connect(provider) {
  busy.value = `connect:${provider}`
  try {
    // Volledige navigatie naar het toestemmingsscherm; de API stuurt daarna terug naar /settings?…#calendar.
    window.location.assign(await calendarSyncApi.connectCalendar(provider))
  } catch (e) {
    toast.error(errorMessage(e, t('calendarSync.failed')))
    busy.value = ''
  }
}

async function syncNow(provider) {
  busy.value = `sync:${provider}`
  try {
    const updated = await calendarSyncApi.syncCalendarNow(provider)
    replaceProvider(updated)
    if (!updated.error) toast.success(t('calendarSync.synced'))
  } catch (e) {
    toast.error(errorMessage(e, t('calendarSync.failed')))
  } finally {
    busy.value = ''
  }
}

function askDisconnect(provider) {
  disconnectProvider.value = provider
  removeEvents.value = false
  disconnectOpen.value = true
}

async function disconnect() {
  const provider = disconnectProvider.value
  busy.value = `disconnect:${provider}`
  try {
    await calendarSyncApi.disconnectCalendar(provider, removeEvents.value)
    replaceProvider({ provider, connected: false })
    disconnectOpen.value = false
    toast.success(t('calendarSync.disconnected'))
  } catch (e) {
    toast.error(errorMessage(e, t('calendarSync.failed')))
  } finally {
    busy.value = ''
  }
}

/** Terug van de provider (?calendar=connected|error): melding tonen en de query opruimen, het anker blijft. */
function handleCallbackResult() {
  const result = route.query.calendar
  if (result !== 'connected' && result !== 'error') return
  if (result === 'connected') toast.success(t('calendarSync.connectedToast'))
  else toast.error(t('calendarSync.connectError'))
  const query = { ...route.query }
  delete query.calendar
  router.replace({ query, hash: route.hash })
}

/** /settings#calendar (melding "agenda-sync mislukt", terugkeer van OAuth): naar de agendakaarten scrollen. */
async function scrollToAnchor() {
  if (route.hash !== '#calendar') return
  await nextTick()
  document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(async () => {
  handleCallbackResult()
  await loadIntegrations()
  if (available.value.length) await load()
  else loading.value = false
  scrollToAnchor()
})
</script>
