<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <section
      class="card card-pad border-dashed transition sm:p-6"
      :class="dragging ? 'border-accent-700 bg-accent-50' : ''"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <div class="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-body"><Icon name="paperclip" :size="22" /></span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-extrabold text-ink">{{ $t('planning.files.uploadTitle') }}</p>
          <p class="text-xs text-muted">{{ $t('planning.files.uploadHint') }}</p>
        </div>
        <label class="btn btn-dark btn-sm cursor-pointer">
          <Icon name="upload" :size="14" /> {{ $t('planning.files.choose') }}
          <input type="file" class="sr-only" :accept="accept" multiple @change="onPick" />
        </label>
      </div>

      <div v-if="pending.length" class="mt-4 space-y-3 border-t border-line pt-4">
        <div v-for="p in pending" :key="p.key" class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span class="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-ink"><Icon name="file" :size="16" class="text-muted" /> <span class="truncate">{{ p.file.name }}</span> <span class="shrink-0 text-xs font-semibold text-muted">{{ formatFileSize(p.file.size) }}</span></span>
          <select v-model="p.tripStopId" class="select h-9 sm:w-48" :aria-label="$t('planning.files.linkStop')" :disabled="p.progress > 0">
            <option :value="null">{{ $t('planning.files.noStop') }}</option>
            <option v-for="s in stops" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <input v-model="p.note" class="input h-9 sm:w-48" maxlength="300" :placeholder="$t('planning.files.note')" :disabled="p.progress > 0" />
          <span v-if="p.progress > 0" class="w-12 text-right text-xs font-extrabold text-muted">{{ p.progress }}%</span>
          <button v-else type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.cancel')" @click="pending = pending.filter((x) => x !== p)"><Icon name="x" :size="15" /></button>
        </div>
        <div class="flex justify-end">
          <button type="button" class="btn btn-primary btn-sm" :disabled="uploading" @click="uploadAll">{{ uploading ? $t('planning.files.uploading') : $t('planning.files.upload', { n: pending.length }) }}</button>
        </div>
      </div>
    </section>

    <LoadingState v-if="loading"><div class="space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-16 rounded-2xl" /></div></LoadingState>
    <EmptyState v-else-if="!items.length" icon="file" :title="$t('planning.files.emptyTitle')" :text="$t('planning.files.emptyText')" />

    <ul v-else class="card divide-y divide-line">
      <li v-for="a in items" :key="a.id" class="flex items-center gap-3 p-3.5">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold uppercase" :class="badgeClass(a)">{{ extension(a.fileName) }}</span>
        <div class="min-w-0 flex-1">
          <button type="button" class="block max-w-full truncate text-left text-sm font-extrabold text-ink hover:underline" @click="open(a)">{{ a.fileName }}</button>
          <p class="truncate text-xs text-muted">
            {{ formatFileSize(a.sizeBytes) }} · {{ a.uploadedByDisplayName }} · {{ timeAgo(a.createdAtUtc) }}
            <template v-if="a.tripStopName"> · <Icon name="pin" :size="11" class="inline" /> {{ a.tripStopName }}</template>
          </p>
          <p v-if="a.note" class="truncate text-xs text-body">{{ a.note }}</p>
        </div>
        <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('planning.files.download', { name: a.fileName })" @click="download(a)"><Icon name="download" :size="16" /></button>
        <button v-if="a.canDelete" type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('planning.files.delete', { name: a.fileName })" @click="remove(a)"><Icon name="trash" :size="16" /></button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import * as tripsApi from '@/api/tripsApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { timeAgo } from '@/utils/date'
import { formatFileSize, saveBlob } from '@/utils/format'

const props = defineProps({
  tripId: { type: String, required: true },
  stops: { type: Array, default: () => [] },
})

const MAX_BYTES = 20 * 1024 * 1024
const EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'odt', 'ics', 'pkpass', 'gpx', 'eml']
const accept = EXTENSIONS.map((e) => `.${e}`).join(',')

const { t } = useI18n()
const toast = useToastStore()
const items = ref([])
const loading = ref(true)
const pending = ref([])
const uploading = ref(false)
const dragging = ref(false)
let keySeq = 0

function extension(name) {
  const ext = String(name).split('.').pop() || ''
  return ext.length <= 5 ? ext : 'file'
}

function badgeClass(a) {
  if (a.contentType === 'application/pdf') return 'bg-red-50 text-red-700'
  if (a.contentType.startsWith('image/')) return 'bg-blue-50 text-blue-700'
  if (/sheet|excel/.test(a.contentType)) return 'bg-emerald-50 text-emerald-700'
  return 'bg-gray-100 text-body'
}

function addFiles(files) {
  for (const file of files) {
    const ext = extension(file.name).toLowerCase()
    if (!EXTENSIONS.includes(ext)) {
      toast.error(t('planning.files.badType', { name: file.name }))
      continue
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('planning.files.tooBig', { name: file.name }))
      continue
    }
    pending.value.push({ key: ++keySeq, file, tripStopId: null, note: '', progress: 0 })
  }
}

function onPick(e) {
  addFiles([...(e.target.files || [])])
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  addFiles([...(e.dataTransfer?.files || [])])
}

async function uploadAll() {
  uploading.value = true
  for (const p of [...pending.value]) {
    try {
      p.progress = 1
      const saved = await tripsApi.uploadAttachment(props.tripId, p.file, { tripStopId: p.tripStopId, note: p.note }, (pct) => { p.progress = Math.max(1, pct) })
      items.value.unshift(saved)
      pending.value = pending.value.filter((x) => x !== p)
    } catch (e) {
      p.progress = 0
      toast.error(errorMessage(e))
    }
  }
  uploading.value = false
}

async function fetchBlob(a) {
  try {
    return await tripsApi.downloadAttachment(props.tripId, a.id)
  } catch (e) {
    toast.error(errorMessage(e))
    return null
  }
}

async function download(a) {
  const blob = await fetchBlob(a)
  if (blob) saveBlob(blob, a.fileName)
}

/** PDF's en foto's openen in een nieuw tabblad; andere bestanden worden gedownload. */
async function open(a) {
  if (!(a.contentType === 'application/pdf' || a.contentType.startsWith('image/'))) return download(a)
  const win = window.open('', '_blank')
  const blob = await fetchBlob(a)
  if (!blob) {
    win?.close()
    return
  }
  const url = URL.createObjectURL(new Blob([blob], { type: a.contentType }))
  if (win) win.location.href = url
  else saveBlob(blob, a.fileName)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

async function remove(a) {
  const ok = await confirm({ title: t('planning.files.deleteTitle'), message: a.fileName, confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await tripsApi.deleteAttachment(props.tripId, a.id)
    items.value = items.value.filter((x) => x.id !== a.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    items.value = await tripsApi.getAttachments(props.tripId)
  } catch (e) {
    if (!silent) toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

const off = onRealtime('tripChanged', (p) => {
  if (p?.tripId === props.tripId && p.area === 'attachments') load({ silent: true })
})
onMounted(load)
onBeforeUnmount(off)
</script>
