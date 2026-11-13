<template>
  <section class="card card-pad">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="flex items-center gap-2 text-sm font-bold text-ink"><Icon name="route" :size="16" class="text-muted" /> {{ $t('tracks.title') }}</h2>
        <p v-if="canImport" class="text-xs text-muted">{{ $t('tracks.hint') }}</p>
      </div>
      <TrackImportButton v-if="canImport" :trip-id="tripId" @imported="(e) => emit('imported', e)" />
    </header>

    <p v-if="!tracks.length" class="mt-3 text-xs text-muted">{{ $t('tracks.empty') }}</p>

    <ul v-else class="mt-3 divide-y divide-line">
      <li v-for="tr in tracks" :key="tr.id" class="flex items-center gap-3 py-2.5">
        <span class="h-1 w-6 shrink-0 rounded-full" :style="lineStyle(tr)" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <form v-if="editingId === tr.id" class="flex items-center gap-2" @submit.prevent="saveName(tr)">
            <input
              ref="nameInput"
              v-model="editName"
              class="input h-8 text-sm"
              maxlength="120"
              :aria-label="$t('tracks.renameLabel')"
              @keydown.esc.prevent="editingId = null"
            />
            <button type="submit" class="btn-icon btn-icon-sm" :disabled="!editName.trim() || saving" :aria-label="$t('common.save')"><Icon name="check" :size="15" /></button>
            <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.cancel')" @click="editingId = null"><Icon name="x" :size="15" /></button>
          </form>
          <template v-else>
            <button type="button" class="block max-w-full truncate text-left text-sm font-bold text-ink hover:underline" :aria-label="$t('tracks.showOnMap', { name: tr.name })" @click="emit('select', tr)">{{ tr.name }}</button>
            <p class="truncate text-xs text-muted">
              {{ formatDate(tr.startedAtUtc || tr.createdAtUtc) }} · {{ trackStats(tr) }}
              <template v-if="tr.kind === 'Route'"> · {{ $t('tracks.kind.route') }}</template>
              · {{ $t('tracks.uploadedBy', { name: tr.uploadedByUserName }) }}
            </p>
          </template>
        </div>
        <div v-if="tr.canManage && editingId !== tr.id" class="flex shrink-0">
          <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('tracks.rename', { name: tr.name })" @click="startRename(tr)"><Icon name="edit" :size="15" /></button>
          <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('tracks.delete', { name: tr.name })" @click="remove(tr)"><Icon name="trash" :size="15" /></button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import TrackImportButton from './TrackImportButton.vue'
import * as tracksApi from '@/api/tracksApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'
import { formatDate } from '@/utils/date'
import { TRACK_COLOR, trackStats } from '@/utils/tracks'

const props = defineProps({
  tripId: { type: String, required: true },
  tracks: { type: Array, default: () => [] },
  /** Deelnemers die mogen bewerken krijgen de importknop. */
  canImport: { type: Boolean, default: false },
})
const emit = defineEmits(['imported', 'renamed', 'deleted', 'select'])

const { t } = useI18n()
const toast = useToastStore()
const editingId = ref(null)
const editName = ref('')
const saving = ref(false)
const nameInput = ref(null)

/** Mini-legende: doorgetrokken voor tracks, gestreept voor geplande routes (zoals op de kaart). */
function lineStyle(track) {
  return track.kind === 'Route'
    ? { backgroundImage: `repeating-linear-gradient(90deg, ${TRACK_COLOR} 0 5px, transparent 5px 8px)` }
    : { backgroundColor: TRACK_COLOR }
}

function startRename(track) {
  editingId.value = track.id
  editName.value = track.name
  nextTick(() => {
    const el = Array.isArray(nameInput.value) ? nameInput.value[0] : nameInput.value
    el?.focus()
    el?.select()
  })
}

async function saveName(track) {
  const name = editName.value.trim()
  if (!name || name === track.name) {
    editingId.value = null
    return
  }
  saving.value = true
  try {
    const updated = await tracksApi.renameTrack(props.tripId, track.id, name)
    emit('renamed', updated)
    editingId.value = null
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function remove(track) {
  const ok = await confirm({
    title: t('tracks.deleteTitle'),
    message: t('tracks.deleteMessage', { name: track.name }),
    confirmLabel: t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  try {
    await tracksApi.deleteTrack(props.tripId, track.id)
    emit('deleted', track.id)
    toast.success(t('tracks.deleted'))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>
