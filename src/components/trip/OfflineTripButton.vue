<template>
  <button
    type="button"
    :class="[variant === 'menu' ? 'menu-item disabled:opacity-50' : 'btn btn-secondary btn-sm', saved ? (variant === 'menu' ? 'text-accent-700' : 'border-accent-700 text-accent-700') : '']"
    :role="variant === 'menu' ? 'menuitemcheckbox' : undefined"
    :aria-checked="variant === 'menu' ? saved : undefined"
    :aria-pressed="variant === 'menu' ? undefined : saved"
    :disabled="busy || (!saved && !online)"
    :title="saved ? $t('tripExtras.offline.savedAt', { date: savedAtLabel }) : $t('tripExtras.offline.hint')"
    @click="saved ? remove() : save()"
  >
    <Icon :name="saved ? 'check' : 'download'" :size="16" />
    <template v-if="busy">{{ $t('tripExtras.offline.saving', { percent }) }}</template>
    <template v-else-if="saved">{{ $t('tripExtras.offline.saved') }}</template>
    <template v-else>{{ $t('tripExtras.offline.make') }}</template>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useOfflineTrips } from '@/composables/useOfflineTrips'
import { confirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { offlineSupported, serviceWorkerActive } from '@/services/offlineTrip'
import { parseTimestamp, timeAgo } from '@/utils/date'

const props = defineProps({
  trip: { type: Object, required: true },
  // 'menu': als regel in een uitklapmenu (reispagina) in plaats van als losse knop.
  variant: { type: String, default: 'button' },
})

const { t } = useI18n()
const toast = useToastStore()
const offline = useOfflineTrips()
const busy = ref(false)
const percent = ref(0)

const online = offline.online
const entry = computed(() => offline.trips.value.find((x) => x.id === props.trip.id) || null)
const saved = computed(() => !!entry.value)
const savedAtLabel = computed(() => (entry.value ? timeAgo(parseTimestamp(entry.value.savedAt)) : ''))

async function save() {
  if (!offlineSupported()) {
    toast.error(t('tripExtras.offline.unsupported'))
    return
  }
  busy.value = true
  percent.value = 0
  try {
    const result = await offline.save(props.trip, (done, total) => { percent.value = total ? Math.round((done / total) * 100) : 0 })
    // Zonder service worker (dev-server of eerste bezoek) staat alles al klaar, maar serveert niemand het nog offline.
    const note = serviceWorkerActive() ? '' : ` ${t('tripExtras.offline.noServiceWorker')}`
    const tiles = result.tiles ? '' : ` ${t('tripExtras.offline.tilesViewedOnly')}`
    toast.success(`${t('tripExtras.offline.done')}${tiles}${note}`, { timeout: 7000 })
  } catch {
    toast.error(t('tripExtras.offline.failed'))
  } finally {
    busy.value = false
  }
}

async function remove() {
  const ok = await confirm({
    title: t('tripExtras.offline.removeTitle'),
    message: t('tripExtras.offline.removeText', { title: props.trip.title }),
    confirmLabel: t('tripExtras.offline.remove'),
  })
  if (!ok) return
  await offline.remove(props.trip)
  toast.success(t('tripExtras.offline.removed'))
}
</script>
