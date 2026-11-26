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
    </header>

    <LoadingState v-if="loading" class="p-4"><div class="space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-10" /></div></LoadingState>
    <p v-else-if="compact && !visibleSections.length" class="px-4 py-4 text-sm font-semibold text-muted sm:px-5">{{ $t('checklist.allDone') }}</p>
    <div v-else class="divide-y divide-line">
      <section v-for="section in visibleSections" :key="section.kind" :aria-labelledby="`checklist-${section.key}-title`">
        <div class="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5" :class="compact ? 'pb-1' : ''">
          <h4 :id="`checklist-${section.key}-title`" class="eyebrow">{{ $t(`checklist.sections.${section.key}`) }}</h4>
          <span v-if="!compact && section.items.length" class="text-xs font-bold tabular-nums text-muted">{{ section.items.filter((i) => i.isDone).length }}/{{ section.items.length }}</span>
        </div>

        <!-- Toevoegen: taken krijgen een eigenaar en optioneel een deadline, de paklijst blijft één regel -->
        <form v-if="!compact" class="space-y-2 border-b border-line px-4 pb-4 pt-3 sm:px-5" @submit.prevent="add(section.kind)">
          <label :for="`checklist-new-${section.key}`" class="sr-only">{{ section.kind === KIND.task ? $t('checklist.tasks.newItem') : $t('checklist.newItem') }}</label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <input
              :id="`checklist-new-${section.key}`"
              v-model="drafts[section.kind].text"
              class="input sm:flex-1"
              maxlength="200"
              :placeholder="section.kind === KIND.task ? $t('checklist.tasks.placeholder') : $t('checklist.placeholder')"
            />
            <template v-if="section.kind === KIND.packing">
              <select v-model="drafts[section.kind].assignee" class="select sm:w-44" :aria-label="$t('checklist.assignTo')">
                <option value="">{{ $t('checklist.nobody') }}</option>
                <option v-for="p in participants" :key="p.userName" :value="p.userName">{{ p.displayName }}</option>
              </select>
              <button type="submit" class="btn btn-dark" :disabled="adding || !drafts[section.kind].text.trim()"><Icon name="plus" :size="16" /> {{ $t('checklist.add') }}</button>
            </template>
          </div>
          <div v-if="section.kind === KIND.task" class="flex flex-wrap gap-2">
            <select v-model="drafts[section.kind].assignee" class="select min-w-[9rem] flex-1" :aria-label="$t('checklist.assignTo')">
              <option value="">{{ $t('checklist.nobody') }}</option>
              <option v-for="p in participants" :key="p.userName" :value="p.userName">{{ p.displayName }}</option>
            </select>
            <label class="flex min-w-[11rem] flex-1 items-center gap-2 text-xs font-semibold text-muted">
              <span class="shrink-0">{{ $t('checklist.due.label') }}</span>
              <input v-model="drafts[section.kind].due" type="date" class="input min-w-0 flex-1" />
            </label>
            <button type="submit" class="btn btn-dark" :disabled="adding || !drafts[section.kind].text.trim()"><Icon name="plus" :size="16" /> {{ $t('checklist.add') }}</button>
          </div>
        </form>

        <PackingSuggestions v-if="!compact && section.kind === KIND.packing" :trip-id="tripId" :item-count="packingItems.length" @added="onSuggestionAdded" />

        <EmptyState
          v-if="!section.visible.length"
          bare
          :icon="section.kind === KIND.task ? 'check' : 'checklist'"
          :title="section.kind === KIND.task ? $t('checklist.tasks.emptyTitle') : $t('checklist.emptyTitle')"
          :text="section.kind === KIND.task ? $t('checklist.tasks.emptyText') : $t('checklist.emptyText')"
        />
        <ul v-else class="divide-y divide-line">
          <li v-for="item in section.visible" :key="item.id" class="flex items-start gap-3 px-4 py-2.5 sm:px-5">
            <button
              type="button"
              class="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition"
              :class="item.isDone ? 'border-accent-700 bg-accent-700 text-white' : 'border-line-strong text-transparent hover:border-accent-700'"
              role="checkbox"
              :aria-checked="item.isDone"
              :aria-label="item.isDone ? $t('checklist.markUndone', { text: item.text }) : $t('checklist.markDone', { text: item.text })"
              @click="toggle(item)"
            >
              <Icon name="check" :size="14" :stroke-width="3" />
            </button>

            <div class="min-w-0 flex-1 py-0.5">
              <p class="break-words text-sm font-semibold" :class="item.isDone ? 'text-muted line-through' : 'text-ink'">{{ item.text }}</p>

              <!-- Deadline: los bewerken met een expliciete knop, zodat typen in het datumveld niet halverwege opslaat -->
              <form v-if="editingDueId === item.id" class="mt-1.5 flex flex-wrap items-center gap-2" @submit.prevent="saveDue(item)">
                <input v-model="dueDraft" type="date" class="input h-9 w-auto min-w-0" :aria-label="$t('checklist.due.editFor', { text: item.text })" />
                <button type="submit" class="btn btn-dark btn-sm" :disabled="savingDue">{{ $t('common.save') }}</button>
                <button v-if="item.dueDate" type="button" class="btn btn-ghost btn-sm" :disabled="savingDue" @click="clearDue(item)">{{ $t('checklist.due.clear') }}</button>
                <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.cancel')" @click="editingDueId = null"><Icon name="x" :size="14" /></button>
              </form>
              <button
                v-else-if="isTask(item) && item.dueDate"
                type="button"
                class="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                :class="dueClass(item)"
                :aria-label="`${$t('checklist.due.change')}: ${dueLabel(item)}`"
                @click="startDueEdit(item)"
              >
                <Icon :name="deadlineState(item) === 'overdue' ? 'alert' : 'calendar'" :size="12" /> {{ dueLabel(item) }}
              </button>
            </div>

            <span v-if="item.assignedToUserName" class="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted" :title="$t('checklist.assignedTo', { name: item.assignedToDisplayName })">
              <Avatar :src="item.assignedToProfilePhotoUrl" :name="item.assignedToDisplayName" size="xs" />
              <span class="hidden sm:inline">{{ firstName(item.assignedToDisplayName) }}</span>
            </span>

            <div v-click-outside="() => (menuFor = menuFor === item.id ? null : menuFor)" class="relative shrink-0">
              <button
                type="button"
                class="btn-icon btn-icon-sm -my-1"
                :aria-label="$t('checklist.actions', { text: item.text })"
                aria-haspopup="menu"
                :aria-expanded="menuFor === item.id"
                @click="menuFor = menuFor === item.id ? null : item.id"
              >
                <Icon name="more" :size="16" />
              </button>
              <div v-if="menuFor === item.id" class="menu right-0 top-full mt-1" role="menu">
                <button v-if="isTask(item)" type="button" class="menu-item" role="menuitem" @click="startDueEdit(item)">
                  <Icon name="calendar" :size="15" /> {{ item.dueDate ? $t('checklist.due.change') : $t('checklist.due.set') }}
                </button>
                <button v-if="isTask(item)" type="button" class="menu-item" role="menuitem" @click="moveTo(item, KIND.packing)">
                  <Icon name="checklist" :size="15" /> {{ $t('checklist.toPacking') }}
                </button>
                <button v-else type="button" class="menu-item" role="menuitem" @click="moveTo(item, KIND.task)">
                  <Icon name="check" :size="15" /> {{ $t('checklist.makeTask') }}
                </button>
                <div class="menu-sep" />
                <button type="button" class="menu-item menu-item-danger" role="menuitem" :aria-label="$t('checklist.remove', { text: item.text })" @click="remove(item)">
                  <Icon name="trash" :size="15" /> {{ $t('common.delete') }}
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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
import { dateInputToIso, formatDate, toDateInput } from '@/utils/date'
import { CHECKLIST_KIND as KIND, deadlineState, isTask, sortPackingItems, sortTasks } from '@/utils/checklist'

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
const adding = ref(false)
// Eén concept per sectie, zodat een half getypte taak niet in de paklijst belandt.
const drafts = reactive({
  [KIND.task]: { text: '', assignee: '', due: '' },
  [KIND.packing]: { text: '', assignee: '' },
})
const menuFor = ref(null)
const editingDueId = ref(null)
const dueDraft = ref('')
const savingDue = ref(false)

const doneCount = computed(() => items.value.filter((i) => i.isDone).length)
const progress = computed(() => (items.value.length ? Math.round((doneCount.value / items.value.length) * 100) : 0))

// Sorteren gebeurt afgeleid, zodat afvinken, verplaatsen en realtime-herladen vanzelf goed staan.
const taskItems = computed(() => sortTasks(items.value.filter(isTask)))
const packingItems = computed(() => sortPackingItems(items.value.filter((i) => !isTask(i))))

const visibleSections = computed(() => {
  const sections = [
    { kind: KIND.task, key: 'tasks', items: taskItems.value },
    { kind: KIND.packing, key: 'packing', items: packingItems.value },
  ].map((s) => ({ ...s, visible: props.compact ? s.items.filter((i) => !i.isDone) : s.items }))
  // Vandaag-modus toont alleen secties met nog iets open; de volledige weergave altijd beide.
  return props.compact ? sections.filter((s) => s.visible.length) : sections
})

const firstName = (name) => String(name || '').split(' ')[0]

const DUE_CLASSES = { overdue: 'text-red-600', today: 'text-rating-text', tomorrow: 'text-rating-text' }
const dueClass = (item) => DUE_CLASSES[deadlineState(item)] || 'text-muted'

function dueLabel(item) {
  const date = formatDate(item.dueDate)
  switch (deadlineState(item)) {
    case 'overdue':
      return t('checklist.due.overdue', { date })
    case 'today':
      return t('checklist.due.today')
    case 'tomorrow':
      return t('checklist.due.tomorrow')
    default:
      return t('checklist.due.until', { date })
  }
}

async function load() {
  try {
    items.value = await tripsApi.getChecklist(props.tripId)
  } catch (e) {
    toast.error(errorMessage(e, t('checklist.loadFailed')))
  } finally {
    loading.value = false
  }
}

/** Voegt toe zonder dubbel te tonen als de realtime-herlaadbeurt het item al binnenhaalde. */
function upsert(item) {
  const existing = items.value.find((i) => i.id === item.id)
  if (existing) Object.assign(existing, item)
  else items.value.push(item)
}

async function add(kind) {
  const draft = drafts[kind]
  const text = draft.text.trim()
  if (!text || adding.value) return
  adding.value = true
  try {
    const payload = { text, assignedToUserName: draft.assignee || null, kind }
    if (kind === KIND.task && draft.due) payload.dueDate = dateInputToIso(draft.due)
    upsert(await tripsApi.addChecklistItem(props.tripId, payload))
    // De toegewezen persoon blijft staan: vaak voeg je een paar dingen voor dezelfde reisgenoot toe.
    draft.text = ''
    if (kind === KIND.task) draft.due = ''
  } catch (e) {
    toast.error(errorMessage(e, t('checklist.addFailed')))
  } finally {
    adding.value = false
  }
}

function onSuggestionAdded(item) {
  if (items.value.some((i) => i.id === item.id)) return
  items.value.push(item)
}

/** Optimistisch bijwerken; bij een fout de vorige waarden terugzetten. */
async function update(item, changes, payload) {
  const previous = Object.fromEntries(Object.keys(changes).map((k) => [k, item[k]]))
  Object.assign(item, changes)
  try {
    Object.assign(item, await tripsApi.updateChecklistItem(props.tripId, item.id, payload))
    return true
  } catch (e) {
    Object.assign(item, previous)
    toast.error(errorMessage(e, t('checklist.updateFailed')))
    return false
  }
}

function toggle(item) {
  const isDone = !item.isDone
  update(item, { isDone }, { isDone })
}

function moveTo(item, kind) {
  menuFor.value = null
  if (editingDueId.value === item.id) editingDueId.value = null
  update(item, { kind }, { kind })
}

function startDueEdit(item) {
  menuFor.value = null
  dueDraft.value = toDateInput(item.dueDate)
  editingDueId.value = item.id
}

async function saveDue(item) {
  const iso = dateInputToIso(dueDraft.value)
  if (!iso) return clearDue(item)
  if (iso === dateInputToIso(toDateInput(item.dueDate))) {
    editingDueId.value = null
    return
  }
  savingDue.value = true
  if (await update(item, { dueDate: iso }, { dueDate: iso })) editingDueId.value = null
  savingDue.value = false
}

async function clearDue(item) {
  if (!item.dueDate) {
    editingDueId.value = null
    return
  }
  savingDue.value = true
  if (await update(item, { dueDate: null }, { clearDueDate: true })) editingDueId.value = null
  savingDue.value = false
}

async function remove(item) {
  menuFor.value = null
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
