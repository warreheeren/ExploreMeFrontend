<template>
  <Teleport to="body">
    <div
      ref="rootRef"
      class="fixed inset-0 z-[105] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('album.title')"
      tabindex="-1"
    >
      <!-- Bovenbalk -->
      <div class="flex shrink-0 items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <span class="text-sm font-bold tabular-nums text-white/80">{{ $t('album.lightbox.counter', { n: index + 1, total: photos.length }) }}</span>
        <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10" :aria-label="$t('album.lightbox.close')" @click="$emit('close')">
          <Icon name="x" :size="22" />
        </button>
      </div>

      <!-- Foto (veegbaar) -->
      <div
        class="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 sm:px-16"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="pointerStart = null"
      >
        <img v-if="photo" :key="photo.id" :src="photo.imageUrl" :alt="photo.caption || ''" class="max-h-full max-w-full select-none rounded-lg object-contain" draggable="false" />
        <button
          v-if="index > 0"
          type="button"
          class="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:inline-flex"
          :aria-label="$t('album.lightbox.prev')"
          @click="go(-1)"
        >
          <Icon name="chevron-left" :size="22" />
        </button>
        <button
          v-if="index < photos.length - 1"
          type="button"
          class="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:inline-flex"
          :aria-label="$t('album.lightbox.next')"
          @click="go(1)"
        >
          <Icon name="chevron-right" :size="22" />
        </button>
      </div>

      <!-- Info en bewerken -->
      <div v-if="photo" class="shrink-0 px-3 pb-3 pt-2 safe-bottom sm:px-4">
        <div class="mx-auto max-w-2xl rounded-2xl bg-surface p-4 text-ink">
          <div class="flex items-center gap-2.5">
            <Avatar :src="photo.uploadedByProfilePhotoUrl" :name="photo.uploadedByDisplayName" size="sm" />
            <p class="min-w-0 flex-1 text-xs text-muted">
              <span class="font-bold text-ink">{{ $t('album.by', { name: photo.uploadedByDisplayName }) }}</span>
              <template v-if="photo.takenAtUtc"> · {{ $t('album.lightbox.takenAt', { date: formatDate(photo.takenAtUtc, { day: 'numeric', month: 'long', year: 'numeric' }) }) }}</template>
              <template v-if="photo.stopName"> · {{ photo.stopName }}</template>
            </p>
            <RouterLink v-if="features.postcards" :to="postcardLink" class="btn btn-secondary btn-sm shrink-0"><Icon name="send" :size="14" /> {{ $t('postcards.fromAlbum') }}</RouterLink>
          </div>

          <form v-if="photo.canEdit" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)]" @submit.prevent="save">
            <div>
              <label :for="`${uid}-caption`" class="label">{{ $t('album.lightbox.caption') }}</label>
              <input :id="`${uid}-caption`" v-model="caption" class="input" maxlength="500" :placeholder="$t('album.lightbox.captionPlaceholder')" />
            </div>
            <div>
              <label :for="`${uid}-stop`" class="label">{{ $t('album.lightbox.stop') }}</label>
              <select :id="`${uid}-stop`" v-model="stopId" class="select">
                <option :value="null">{{ $t('album.lightbox.noStop') }}</option>
                <option v-for="s in sortedStops" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
              <button type="button" class="btn btn-danger-ghost btn-sm" :disabled="busy" @click="remove"><Icon name="trash" :size="14" /> {{ $t('album.lightbox.delete') }}</button>
              <button type="submit" class="btn btn-primary btn-sm" :disabled="busy || !dirty">{{ $t('album.lightbox.save') }}</button>
            </div>
          </form>
          <p v-else-if="photo.caption" class="mt-3 whitespace-pre-line text-sm text-body">{{ photo.caption }}</p>
          <p class="mt-3 hidden text-[11px] text-muted sm:block">{{ $t('album.lightbox.hint') }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { features } from '@/config/features'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import * as albumApi from '@/api/albumApi'
import { confirm, confirmState } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { formatDate } from '@/utils/date'
import { lockScroll, unlockScroll } from '@/utils/scrollLock'
import { swipeDirection } from '@/utils/swipe'

/** Kleinere drempel dan bij de kaarten: bladeren moet licht aanvoelen. */
const LIGHTBOX_SWIPE_PX = 50

const props = defineProps({
  tripId: { type: String, required: true },
  photos: { type: Array, required: true },
  index: { type: Number, required: true },
  stops: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:index', 'close', 'updated', 'deleted'])

const { t } = useI18n()
const toast = useToastStore()
const rootRef = ref(null)
const uid = `lb-${Math.random().toString(36).slice(2, 9)}`
const caption = ref('')
const stopId = ref(null)
const busy = ref(false)
const pointerStart = ref(null)

const photo = computed(() => props.photos[props.index] || null)
/** Opent de composer op /postcards met deze foto (en stop) vooraf ingevuld. */
const postcardLink = computed(() => ({
  path: '/postcards',
  query: { compose: '1', tripId: props.tripId, photo: photo.value?.imageUrl, ...(photo.value?.tripStopId ? { stopId: photo.value.tripStopId } : {}) },
}))
const sortedStops = computed(() => [...props.stops].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)))
const dirty = computed(() => !!photo.value
  && ((caption.value || '').trim() !== (photo.value.caption || '') || (stopId.value || null) !== (photo.value.tripStopId || null)))

function resetForm() {
  caption.value = photo.value?.caption || ''
  stopId.value = photo.value?.tripStopId || null
}

function go(step) {
  const next = props.index + step
  if (next >= 0 && next < props.photos.length) emit('update:index', next)
}

function isTyping(target) {
  return target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
}

function onKey(e) {
  // De bevestigingsdialoog (boven de lightbox) handelt zijn eigen toetsen af.
  if (confirmState.open) return
  if (e.key === 'Escape') {
    emit('close')
  } else if (!isTyping(e.target) && e.key === 'ArrowLeft') {
    go(-1)
  } else if (!isTyping(e.target) && e.key === 'ArrowRight') {
    go(1)
  }
}

function onPointerDown(e) {
  if (e.target.closest?.('button')) return
  pointerStart.value = { x: e.clientX, y: e.clientY }
}

function onPointerUp(e) {
  if (!pointerStart.value) return
  const direction = swipeDirection(e.clientX - pointerStart.value.x, e.clientY - pointerStart.value.y, LIGHTBOX_SWIPE_PX)
  pointerStart.value = null
  if (direction === 'left') go(1)
  else if (direction === 'right') go(-1)
}

async function save() {
  busy.value = true
  try {
    const updated = await albumApi.updatePhoto(props.tripId, photo.value.id, { caption: caption.value.trim() || null, tripStopId: stopId.value })
    emit('updated', updated)
    toast.success(t('album.lightbox.saved'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function remove() {
  const ok = await confirm({
    title: t('album.lightbox.deleteTitle'),
    message: t('album.lightbox.deleteText'),
    confirmLabel: t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  busy.value = true
  try {
    const id = photo.value.id
    await albumApi.deletePhoto(props.tripId, id)
    emit('deleted', id)
    toast.success(t('album.lightbox.deleted'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

watch(photo, resetForm, { immediate: true })

onMounted(() => {
  lockScroll()
  document.addEventListener('keydown', onKey)
  nextTick(() => rootRef.value?.focus())
})
onBeforeUnmount(() => {
  unlockScroll()
  document.removeEventListener('keydown', onKey)
})
</script>
