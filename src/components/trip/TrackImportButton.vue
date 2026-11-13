<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <label class="btn btn-secondary btn-sm cursor-pointer" :class="busy ? 'pointer-events-none opacity-60' : ''">
      <Spinner v-if="busy" :size="14" :label="$t('tracks.importing')" />
      <Icon v-else name="route" :size="14" />
      {{ busy ? $t('tracks.importing') : $t('tracks.import') }}
      <input type="file" class="sr-only" :accept="GPX_ACCEPT" :disabled="busy" @change="onPick" />
    </label>
    <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-body">
      <input v-model="createJournal" type="checkbox" class="checkbox" :disabled="busy" />
      {{ $t('tracks.createJournal') }}
    </label>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import * as tracksApi from '@/api/tracksApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { GPX_ACCEPT, MAX_GPX_BYTES, isGpxFile } from '@/utils/tracks'

const props = defineProps({
  tripId: { type: String, required: true },
  /** Startwaarde van "Maak dagboekentry" (aan in het dagboek, uit op het overzicht). */
  journalDefault: { type: Boolean, default: false },
})
const emit = defineEmits(['imported'])

const { t } = useI18n()
const toast = useToastStore()
const busy = ref(false)
const createJournal = ref(props.journalDefault)

async function onPick(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  // Snelle controles vooraf; de server controleert opnieuw.
  if (!isGpxFile(file)) return toast.error(t('tracks.badType'))
  if (file.size > MAX_GPX_BYTES) return toast.error(t('tracks.tooBig'))

  busy.value = true
  try {
    const tracks = await tracksApi.importTrack(props.tripId, file, { createJournal: createJournal.value })
    const n = tracks.length
    toast.success(createJournal.value ? t('tracks.importedWithJournal', { n }, n) : t('tracks.imported', { n }, n))
    emit('imported', { tracks, createJournal: createJournal.value })
  } catch (err) {
    toast.error(errorMessage(err))
  } finally {
    busy.value = false
  }
}
</script>
