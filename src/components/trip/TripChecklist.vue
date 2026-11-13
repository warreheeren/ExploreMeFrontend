<template>
  <section class="card">
    <header class="border-b border-line px-4 py-4 sm:px-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="card-title">{{ $t('checklist.title') }}</h3>
          <p class="text-xs font-semibold text-muted">{{ $t('checklist.subtitle') }}</p>
        </div>
        <span class="text-sm font-bold tabular-nums text-ink">{{ doneCount }}/{{ items.length }}</span>
      </div>
      <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="$t('checklist.progress')">
        <div class="h-full rounded-full bg-accent-700 transition-all" :style="{ width: `${progress}%` }" />
      </div>

      <form v-if="!compact" class="mt-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="add">
        <label for="checklist-new" class="sr-only">{{ $t('checklist.newItem') }}</label>
        <input id="checklist-new" v-model="newText" class="input sm:flex-1" maxlength="200" :placeholder="$t('checklist.placeholder')" />
        <select v-model="newAssignee" class="select sm:w-44" :aria-label="$t('checklist.assignTo')">
          <option value="">{{ $t('checklist.nobody') }}</option>
          <option v-for="p in participants" :key="p.userName" :value="p.userName">{{ p.displayName }}</option>
        </select>
        <button type="submit" class="btn btn-dark" :disabled="adding || !newText.trim()"><Icon name="plus" :size="16" /> {{ $t('checklist.add') }}</button>
      </form>
    </header>

    <PackingSuggestions v-if="!compact" :trip-id="tripId" :item-count="items.length" @added="onSuggestionAdded" />

    <LoadingState v-if="loading" class="p-4"><div class="space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-10" /></div></LoadingState>
    <p v-else-if="compact && !visibleItems.length" class="px-4 py-4 text-sm font-semibold text-muted sm:px-5">{{ $t('checklist.allDone') }}</p>
    <EmptyState v-else-if="!visibleItems.length" bare icon="checklist" :title="$t('checklist.emptyTitle')" :text="$t('checklist.emptyText')" />
    <ul v-else class="divide-y divide-line">
      <li v-for="item in visibleItems" :key="item.id" class="group flex items-center gap-3 px-4 py-2.5 sm:px-5">
        <button
          type="button"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition"
          :class="item.isDone ? 'border-accent-700 bg-accent-700 text-white' : 'border-line-strong text-transparent hover:border-accent-700'"
          role="checkbox"
          :aria-checked="item.isDone"
          :aria-label="item.isDone ? $t('checklist.markUndone', { text: item.text }) : $t('checklist.markDone', { text: item.text })"
          @click="toggle(item)"
        >
          <Icon name="check" :size="14" :stroke-width="3" />
        </button>
        <span class="min-w-0 flex-1 text-sm font-semibold" :class="item.isDone ? 'text-muted line-through' : 'text-ink'">{{ item.text }}</span>
        <span v-if="item.assignedToUserName" class="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted" :title="$t('checklist.assignedTo', { name: item.assignedToDisplayName })">
          <Avatar :src="item.assignedToProfilePhotoUrl" :name="item.assignedToDisplayName" size="xs" />
          <span class="hidden sm:inline">{{ firstName(item.assignedToDisplayName) }}</span>
        </span>
        <button type="button" class="btn-icon btn-icon-sm shrink-0 opacity-100 hover:text-red-600 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100" :aria-label="$t('checklist.remove', { text: item.text })" @click="remove(item)">
          <Icon name="trash" :size="15" />
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Avatar from '../ui/Avatar.vue'
import Icon from '../ui/Icon.vue'
import EmptyState from '../ui/EmptyState.vue'
import PackingSuggestions from './PackingSuggestions.vue'
import * as tripsApi from '@/api/tripsApi'
import { useToastStore } from '@/stores/toast'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  tripId: { type: String, required: true },
  participants: { type: Array, default: () => [] }, // [{ userName, displayName }]
  /** Alleen de open items, zonder toevoegformulier en suggesties (Vandaag-modus). */
  compact: { type: Boolean, default: false },
})

const toast = useToastStore()
const { t } = useI18n()
const items = ref([])
const loading = ref(true)
const newText = ref('')
const newAssignee = ref('')
const adding = ref(false)

const doneCount = computed(() => items.value.filter((i) => i.isDone).length)
const visibleItems = computed(() => (props.compact ? items.value.filter((i) => !i.isDone) : items.value))
const progress = computed(() => (items.value.length ? Math.round((doneCount.value / items.value.length) * 100) : 0))

const firstName = (name) => String(name || '').split(' ')[0]

function sortItems() {
  items.value.sort((a, b) => Number(a.isDone) - Number(b.isDone) || a.orderIndex - b.orderIndex)
}

async function load() {
  try {
    items.value = await tripsApi.getChecklist(props.tripId)
    sortItems()
  } catch (e) {
    toast.error(errorMessage(e, t('checklist.loadFailed')))
  } finally {
    loading.value = false
  }
}

async function add() {
  const text = newText.value.trim()
  if (!text || adding.value) return
  adding.value = true
  try {
    const created = await tripsApi.addChecklistItem(props.tripId, { text, assignedToUserName: newAssignee.value || null })
    items.value.push(created)
    sortItems()
    newText.value = ''
  } catch (e) {
    toast.error(errorMessage(e, t('checklist.addFailed')))
  } finally {
    adding.value = false
  }
}

function onSuggestionAdded(item) {
  if (items.value.some((i) => i.id === item.id)) return
  items.value.push(item)
  sortItems()
}

async function toggle(item) {
  item.isDone = !item.isDone
  sortItems()
  try {
    const updated = await tripsApi.updateChecklistItem(props.tripId, item.id, { isDone: item.isDone })
    Object.assign(item, updated)
  } catch (e) {
    item.isDone = !item.isDone
    sortItems()
    toast.error(errorMessage(e, t('checklist.updateFailed')))
  }
}

async function remove(item) {
  const index = items.value.indexOf(item)
  items.value.splice(index, 1)
  try {
    await tripsApi.deleteChecklistItem(props.tripId, item.id)
  } catch (e) {
    items.value.splice(index, 0, item)
    toast.error(errorMessage(e, t('checklist.removeFailed')))
  }
}

let unsubscribe = () => {}
onMounted(() => {
  load()
  unsubscribe = onRealtime('checklistChanged', (p) => {
    if (p?.tripId === props.tripId) load()
  })
})
onBeforeUnmount(() => unsubscribe())
</script>
