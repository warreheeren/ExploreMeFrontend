<template>
  <section class="space-y-5" aria-labelledby="album-title">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        <h2 id="album-title" class="card-title">{{ $t('album.title') }}</h2>
        <p class="mt-0.5 text-sm text-muted">{{ $t('album.subtitle') }}</p>
      </div>
      <template v-if="trip.canEdit">
        <input ref="fileInput" type="file" class="sr-only" :accept="ACCEPT" multiple tabindex="-1" aria-hidden="true" @change="onFiles" />
        <button type="button" class="btn btn-primary btn-sm" :disabled="uploading" @click="fileInput?.click()">
          <Icon name="upload" :size="16" /> {{ $t('album.add') }}
        </button>
      </template>
    </div>

    <!-- Uploadvoortgang -->
    <div v-if="uploading" class="card card-pad" role="status" aria-live="polite">
      <p class="mb-2 text-sm font-bold text-ink">{{ $t('album.uploading', { done: Math.min(progress.done + 1, progress.total), total: progress.total }) }}</p>
      <div class="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-accent-700 transition-[width] duration-200" :style="{ width: `${progressPercent}%` }" />
      </div>
    </div>

    <LoadingState v-if="loading">
      <div class="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6"><div v-for="i in 12" :key="i" class="skeleton aspect-square rounded-xl" /></div>
    </LoadingState>

    <EmptyState v-else-if="loadError" icon="alert" :title="$t('album.loadFailed')">
      <button type="button" class="btn btn-secondary btn-sm" @click="load()">{{ $t('common.retry') }}</button>
    </EmptyState>

    <EmptyState v-else-if="!photos.length" icon="camera" :title="$t('album.emptyTitle')" :text="trip.canEdit ? $t('album.emptyTextEditor') : $t('album.emptyText')">
      <button v-if="trip.canEdit" type="button" class="btn btn-secondary btn-sm" :disabled="uploading" @click="fileInput?.click()">{{ $t('album.add') }}</button>
    </EmptyState>

    <div v-else class="space-y-7">
      <section v-for="group in groups" :key="group.day || 'none'" :aria-label="group.day ? formatFullDate(group.day) : $t('album.noDay')">
        <h3 class="mb-3 text-sm font-extrabold text-ink">{{ group.day ? formatFullDate(group.day) : $t('album.noDay') }}</h3>
        <div class="space-y-4">
          <div v-for="stop in group.stops" :key="stop.stopId || 'none'">
            <p class="mb-2 flex items-center gap-2 text-xs font-bold text-muted">
              <span v-if="stop.stopType" class="h-2 w-2 rounded-full" :class="stopTypeMeta(stop.stopType).dot" aria-hidden="true" />
              <span class="truncate">{{ stop.stopName || $t('album.noStop') }}</span>
              <span class="font-semibold">· {{ $t('album.photoCount', stop.photos.length) }}</span>
            </p>
            <ul class="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
              <li v-for="p in stop.photos" :key="p.id">
                <button
                  type="button"
                  class="block aspect-square w-full overflow-hidden rounded-xl bg-gray-100"
                  :aria-label="$t('album.openPhoto', { name: p.caption || stop.stopName || $t('album.title') })"
                  @click="openPhoto(p)"
                >
                  <img :src="thumbUrl(p.imageUrl)" :alt="p.caption || ''" class="h-full w-full object-cover transition hover:scale-105" loading="lazy" decoding="async" />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <AlbumLightbox
      v-if="lightboxIndex !== null"
      v-model:index="lightboxIndex"
      :trip-id="trip.id"
      :photos="ordered"
      :stops="trip.stops"
      @updated="onUpdated"
      @deleted="onDeleted"
      @close="lightboxIndex = null"
    />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AlbumLightbox from './AlbumLightbox.vue'
import * as albumApi from '@/api/albumApi'
import { onRealtime } from '@/services/realtime'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { flattenAlbum, groupAlbum, readPhotoMeta } from '@/utils/album'
import { formatFullDate } from '@/utils/date'
import { thumbUrl } from '@/utils/media'
import { stopTypeMeta } from '@/utils/stopTypes'

const MAX_MB = 25
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPT = ALLOWED.join(',')

const props = defineProps({
  trip: { type: Object, required: true },
})

const { t } = useI18n()
const toast = useToastStore()

const photos = ref([])
const loading = ref(true)
const loadError = ref(false)
const uploading = ref(false)
const progress = ref({ done: 0, total: 0, current: 0 })
const fileInput = ref(null)
const lightboxIndex = ref(null)

const groups = computed(() => groupAlbum(photos.value))
const ordered = computed(() => flattenAlbum(groups.value))
const progressPercent = computed(() => {
  const { done, total, current } = progress.value
  return total ? Math.round(((done + current) / total) * 100) : 0
})

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  loadError.value = false
  try {
    photos.value = await albumApi.getPhotos(props.trip.id)
  } catch {
    if (!silent) loadError.value = true
  } finally {
    loading.value = false
  }
}

function validate(file) {
  if (!ALLOWED.includes(file.type)) return t('album.invalidType', { name: file.name })
  if (file.size > MAX_MB * 1024 * 1024) return t('album.tooLarge', { name: file.name, mb: MAX_MB })
  return null
}

/** Per foto: EXIF lezen (vóór het uploaden, de server strip metadata), uploaden met voortgang, koppelen. */
async function onFiles(event) {
  const files = [...(event.target.files || [])]
  event.target.value = ''
  if (!files.length) return

  uploading.value = true
  progress.value = { done: 0, total: files.length, current: 0 }
  let added = 0
  for (const file of files) {
    const problem = validate(file)
    if (problem) {
      toast.error(problem)
    } else {
      try {
        const meta = await readPhotoMeta(file)
        const imageUrl = await albumApi.uploadAlbumImage(file, (fraction) => { progress.value.current = fraction })
        const photo = await albumApi.addPhoto(props.trip.id, { imageUrl, ...meta })
        photos.value.push(photo)
        added++
      } catch (e) {
        toast.error(errorMessage(e, t('album.uploadFailed', { name: file.name })))
      }
    }
    progress.value = { ...progress.value, done: progress.value.done + 1, current: 0 }
  }
  uploading.value = false
  // Volgorde opnieuw zoals de server ze sorteert (opnamemoment).
  photos.value.sort((a, b) => String(a.takenAtUtc || a.createdAtUtc).localeCompare(String(b.takenAtUtc || b.createdAtUtc)))
  if (added) toast.success(t('album.uploadDone', added))
}

function openPhoto(photo) {
  lightboxIndex.value = ordered.value.findIndex((p) => p.id === photo.id)
}

function onUpdated(photo) {
  const index = photos.value.findIndex((p) => p.id === photo.id)
  if (index >= 0) photos.value.splice(index, 1, photo)
  // De foto kan naar een andere groep verhuisd zijn: lightbox blijft op dezelfde foto.
  lightboxIndex.value = ordered.value.findIndex((p) => p.id === photo.id)
}

function onDeleted(id) {
  const position = lightboxIndex.value
  photos.value = photos.value.filter((p) => p.id !== id)
  if (!ordered.value.length) lightboxIndex.value = null
  else lightboxIndex.value = Math.min(position ?? 0, ordered.value.length - 1)
}

const off = onRealtime('tripChanged', (p) => {
  // Niet herladen tijdens een eigen upload; de lijst wordt dan lokaal bijgewerkt.
  if (p?.tripId === props.trip.id && p.area === 'photos' && !uploading.value) load({ silent: true })
})
watch(() => props.trip.id, () => load())
onMounted(load)
onBeforeUnmount(off)
</script>
