<template>
  <section class="card card-pad sm:p-6">
    <LoadingState v-if="loading"><div class="skeleton h-24 rounded-xl" /></LoadingState>

    <!-- Geen open prikker: starten (met eventueel de uitkomst van de vorige) -->
    <template v-else-if="!isOpen">
      <p v-if="poll?.status === 'Decided'" class="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-700">
        <Icon name="check" :size="16" /> {{ $t('datePoll.decided', { range: formatDateRange(poll.decidedStart, decidedEnd) }) }}
      </p>
      <p v-else-if="poll?.status === 'Closed'" class="mb-3 text-sm font-semibold text-muted">{{ $t('datePoll.closedState') }}</p>

      <button v-if="!composing" type="button" class="flex w-full items-center gap-3 text-left" @click="startCompose">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-800"><Icon name="calendar" :size="18" /></span>
        <span class="flex-1">
          <span class="block text-sm font-extrabold text-ink">{{ poll ? $t('datePoll.again') : $t('datePoll.start') }}</span>
          <span class="block text-xs text-muted">{{ $t('datePoll.newHint') }}</span>
        </span>
        <Icon name="plus" :size="18" class="text-muted" />
      </button>

      <form v-else class="space-y-4" @submit.prevent="open">
        <h3 class="text-base font-extrabold text-ink">{{ $t('datePoll.title') }}</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label for="dp-from" class="label">{{ $t('datePoll.form.from') }}</label>
            <input id="dp-from" ref="fromRef" v-model="form.from" type="date" class="input" :min="todayKey" required />
          </div>
          <div>
            <label for="dp-to" class="label">{{ $t('datePoll.form.to') }}</label>
            <input id="dp-to" v-model="form.to" type="date" class="input" :min="form.from || todayKey" :max="maxTo" required />
          </div>
          <div>
            <label for="dp-length" class="label">{{ $t('datePoll.form.length') }}</label>
            <input id="dp-length" v-model.number="form.length" type="number" class="input" min="1" max="60" required />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" @click="composing = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn btn-dark" :disabled="saving">{{ $t('datePoll.form.submit') }}</button>
        </div>
      </form>
    </template>

    <!-- Open prikker -->
    <template v-else>
      <header class="mb-4 flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-800"><Icon name="calendar" :size="18" /></span>
        <div class="min-w-0 flex-1">
          <h3 class="text-base font-extrabold text-ink">{{ $t('datePoll.title') }} · {{ $t('datePoll.lengthDays', poll.lengthDays) }}</h3>
          <p class="mt-0.5 text-xs font-semibold text-muted">
            {{ $t('datePoll.between', { range: formatDateRange(poll.rangeStart, poll.rangeEnd) }) }}
            · {{ $t('datePoll.byLine', { name: poll.createdByDisplayName }) }}
            · {{ $t('datePoll.voted', { n: votedCount, total: poll.participants.length }) }}
          </p>
        </div>
        <div v-if="poll.canClose" v-click-outside="() => (menuOpen = false)" class="relative">
          <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.more')" @click="menuOpen = !menuOpen"><Icon name="more" :size="16" /></button>
          <div v-if="menuOpen" class="menu right-0 top-full mt-1" role="menu">
            <button type="button" class="menu-item" role="menuitem" @click="close"><Icon name="lock" :size="15" /> {{ $t('datePoll.close') }}</button>
          </div>
        </div>
      </header>

      <div class="mb-3 flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-full border border-line p-0.5" role="tablist">
          <button
            v-for="m in ['mine', 'heatmap']"
            :key="m"
            type="button"
            role="tab"
            class="rounded-full px-3 py-1 text-xs font-bold transition"
            :class="mode === m ? 'bg-ink text-surface' : 'text-muted hover:text-ink'"
            :aria-selected="mode === m"
            @click="mode = m"
          >{{ $t(`datePoll.modes.${m}`) }}</button>
        </div>
        <span class="ml-auto text-xs font-semibold text-muted" aria-live="polite">
          <template v-if="savingVotes">{{ $t('datePoll.saving') }}</template>
          <template v-else-if="savedOnce">{{ $t('datePoll.saved') }}</template>
        </span>
      </div>

      <p class="mb-3 text-xs text-muted">{{ mode === 'mine' ? $t('datePoll.hint') : $t('datePoll.heatHint') }}</p>

      <!-- Legenda -->
      <ul v-if="mode === 'mine'" class="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-body" role="list">
        <li v-for="a in ['Yes', 'Maybe', 'No']" :key="a" class="inline-flex items-center gap-1.5">
          <span class="flex h-4 w-4 items-center justify-center rounded text-[10px] font-extrabold" :class="CELL[a]">{{ SYMBOL[a] }}</span>
          {{ $t(`datePoll.legend.${LEGEND[a]}`) }}
        </li>
      </ul>

      <!-- Kalender -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2" :class="{ 'select-none': mode === 'mine' }">
        <div v-for="month in months" :key="month.key">
          <p class="mb-1.5 text-sm font-extrabold capitalize text-ink">{{ monthLabel(month) }}</p>
          <div class="grid grid-cols-7 gap-1 text-center">
            <span v-for="(w, i) in weekdays" :key="`w${i}`" class="text-[10px] font-bold uppercase text-muted" aria-hidden="true">{{ w }}</span>
            <template v-for="(cell, i) in month.cells" :key="cell?.key || `pad${i}`">
              <span v-if="!cell" aria-hidden="true" />
              <span v-else-if="!cell.inRange" class="flex aspect-square items-center justify-center text-xs text-muted/50" aria-hidden="true">{{ cell.day }}</span>
              <button
                v-else-if="mode === 'mine'"
                type="button"
                :data-day="cell.key"
                class="relative flex aspect-square touch-pan-y items-center justify-center rounded-lg border text-xs font-bold transition"
                :class="myDays[cell.key] ? CELL[myDays[cell.key]] : 'border-line bg-surface text-body hover:border-line-strong'"
                :aria-label="$t('datePoll.dayAria', { date: formatLongDate(cell.key), state: stateLabel(myDays[cell.key]) })"
                @pointerdown="onPointerDown($event, cell.key)"
                @keydown.enter.prevent="tap(cell.key)"
                @keydown.space.prevent="tap(cell.key)"
              >
                {{ cell.day }}
                <span v-if="myDays[cell.key]" class="absolute right-0.5 top-0 text-[9px] font-extrabold" aria-hidden="true">{{ SYMBOL[myDays[cell.key]] }}</span>
              </button>
              <span
                v-else
                class="flex aspect-square items-center justify-center rounded-lg border border-line text-xs font-bold"
                :class="(stats[cell.key]?.ratio || 0) > 0.55 ? 'text-white' : 'text-body'"
                :style="heatStyle(cell.key)"
                :title="heatTitle(cell.key)"
                role="img"
                :aria-label="heatTitle(cell.key)"
              >{{ cell.day }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Voorstellen -->
      <div class="mt-6 border-t border-line pt-4">
        <h4 class="mb-3 text-sm font-extrabold text-ink">{{ $t('datePoll.suggestions.title') }}</h4>
        <p v-if="!poll.suggestions.length" class="text-sm text-muted">{{ $t('datePoll.suggestions.empty') }}</p>
        <ol v-else class="space-y-3" role="list">
          <li v-for="(s, i) in poll.suggestions" :key="s.start" class="rounded-xl border border-line p-3.5" :class="{ 'border-accent-700': i === 0 }">
            <div class="flex flex-wrap items-center gap-2">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-extrabold text-ink">{{ i + 1 }}</span>
              <span class="text-sm font-extrabold text-ink">{{ formatDateRange(s.start, s.end) }}</span>
              <span class="text-xs font-semibold text-muted">{{ $t('datePoll.suggestions.score', { score: s.score, max: s.maxScore }) }}</span>
              <button v-if="poll.canDecide" type="button" class="btn btn-dark btn-sm ml-auto" :disabled="saving" @click="decide(s)">{{ $t('datePoll.suggestions.choose') }}</button>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
              <div class="h-full rounded-full bg-accent-700" :style="{ width: `${Math.round((s.score / Math.max(1, s.maxScore)) * 100)}%` }" />
            </div>
            <dl class="mt-2.5 space-y-1 text-xs">
              <div v-for="group in suggestionGroups(s)" :key="group.key" class="flex items-center gap-2">
                <dt class="flex w-20 shrink-0 items-center gap-1 font-bold" :class="group.text">
                  <span class="flex h-4 w-4 items-center justify-center rounded text-[10px] font-extrabold" :class="CELL[group.key]">{{ SYMBOL[group.key] }}</span>
                  {{ $t(`datePoll.legend.${LEGEND[group.key]}`) }}
                </dt>
                <dd class="flex min-w-0 flex-wrap items-center gap-1.5 text-body">
                  <span v-for="p in group.people" :key="p.userName" class="inline-flex items-center gap-1">
                    <Avatar :src="p.profilePhotoUrl" :name="p.displayName" :size="18" />
                    <span class="font-semibold">{{ p.displayName }}</span>
                  </span>
                </dd>
              </div>
            </dl>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import * as tripsApi from '@/api/tripsApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { useDebounceFn } from '@/composables/useDebounce'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { formatDateRange, formatLongDate, toDateInput, todayDateOnly, tripDays } from '@/utils/date'
import { addDaysToKey, buildMonths, dayKey, dayStats, nextAvailability, toVotePayload } from '@/utils/datePoll'
import { localeTag } from '@/i18n'

const props = defineProps({
  tripId: { type: String, required: true },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
})
const emit = defineEmits(['decided'])

const CELL = {
  Yes: 'border-emerald-600 bg-emerald-50 text-emerald-700',
  Maybe: 'border-amber-500 bg-amber-50 text-amber-800',
  No: 'border-red-600 bg-red-50 text-red-700',
}
const SYMBOL = { Yes: '✓', Maybe: '?', No: '✗' }
const LEGEND = { Yes: 'yes', Maybe: 'maybe', No: 'no' }

const { t } = useI18n()
const toast = useToastStore()

const poll = ref(null)
const loading = ref(true)
const saving = ref(false)
const composing = ref(false)
const menuOpen = ref(false)
const mode = ref('mine')
const fromRef = ref(null)
const form = reactive({ from: '', to: '', length: 7 })

// Eigen stemmen, lokaal bijgewerkt tijdens tikken/slepen en daarna in één keer bewaard.
const myDays = reactive({})
const dirty = ref(false)
const savingVotes = ref(false)
const savedOnce = ref(false)

const todayKey = toDateInput(todayDateOnly())
const maxTo = computed(() => (form.from ? addDaysToKey(form.from, 119) : ''))
const isOpen = computed(() => poll.value?.status === 'Open')
const decidedEnd = computed(() => (poll.value?.decidedStart ? addDaysToKey(dayKey(poll.value.decidedStart), poll.value.lengthDays - 1) : ''))
const months = computed(() => (poll.value ? buildMonths(poll.value.rangeStart, poll.value.rangeEnd) : []))
const stats = computed(() => dayStats(poll.value?.participants))
const votedCount = computed(() => (poll.value?.participants || []).filter((p) => Object.keys(p.days || {}).length > 0).length)

// Weekdagen vanaf maandag (1 januari 2024 was een maandag).
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(localeTag(), { weekday: 'narrow', timeZone: 'UTC' })),
)

function monthLabel(month) {
  return new Date(Date.UTC(month.year, month.month, 1)).toLocaleDateString(localeTag(), { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function stateLabel(a) {
  return t(`datePoll.legend.${a ? LEGEND[a] : 'none'}`)
}

function heatStyle(key) {
  const ratio = stats.value[key]?.ratio || 0
  if (!ratio) return {}
  return { backgroundColor: `rgb(var(--c-accent-700) / ${(0.12 + ratio * 0.88).toFixed(2)})`, borderColor: 'transparent' }
}

function heatTitle(key) {
  const s = stats.value[key] || { yes: 0, maybe: 0, no: 0 }
  return t('datePoll.dayTitle', { date: formatLongDate(key), yes: s.yes, maybe: s.maybe, no: s.no })
}

function suggestionGroups(s) {
  return [
    { key: 'Yes', text: 'text-emerald-700', people: s.available },
    { key: 'Maybe', text: 'text-amber-800', people: s.maybe },
    { key: 'No', text: 'text-red-700', people: s.unavailable },
  ].filter((g) => g.people.length)
}

function syncMyDays() {
  for (const k of Object.keys(myDays)) delete myDays[k]
  const me = poll.value?.participants?.find((p) => p.isMe)
  Object.assign(myDays, me?.days || {})
}

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const wasOpen = isOpen.value
    poll.value = await tripsApi.getDatePoll(props.tripId)
    if (!dirty.value) syncMyDays()
    if (wasOpen && poll.value?.status === 'Decided') emit('decided')
  } catch (e) {
    if (!silent) toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

// ---------- stemmen: tikken en slepen ----------

let drag = null

function apply(key, value) {
  if (value) myDays[key] = value
  else delete myDays[key]
  dirty.value = true
}

function tap(key) {
  apply(key, nextAvailability(myDays[key]))
  saveSoon()
}

// Muis/pen: de dag wisselt meteen. Touch: pas bij loslaten of horizontaal slepen, want een verticale
// veeg is scrollen (touch-action: pan-y → pointercancel) en mag geen dag omzetten.
function onPointerDown(e, key) {
  if (e.button !== undefined && e.button !== 0) return
  e.preventDefault()
  drag = { value: nextAvailability(myDays[key]), startKey: key, pending: e.pointerType === 'touch', changed: false }
  if (!drag.pending) paint(key)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', cancelDrag)
}

function paint(key) {
  if (myDays[key] === drag.value || (!drag.value && !myDays[key])) return
  apply(key, drag.value)
  drag.changed = true
}

function onPointerMove(e) {
  if (!drag) return
  const key = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-day]')?.dataset.day
  if (!key) return
  if (drag.pending && key !== drag.startKey) {
    drag.pending = false
    paint(drag.startKey)
  }
  if (!drag.pending) paint(key)
}

function removeDragListeners() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', cancelDrag)
}

function endDrag() {
  removeDragListeners()
  if (!drag) return
  if (drag.pending) paint(drag.startKey)
  const changed = drag.changed
  drag = null
  if (changed) saveSoon()
}

/** De browser nam het gebaar over (scrollen): wat al geschilderd is blijft staan. */
function cancelDrag() {
  removeDragListeners()
  if (!drag) return
  const changed = drag.changed
  drag = null
  if (changed) saveSoon()
}

const saveSoon = useDebounceFn(saveVotes, 600)

async function saveVotes() {
  if (!isOpen.value) return
  dirty.value = false
  savingVotes.value = true
  try {
    const updated = await tripsApi.voteDatePoll(props.tripId, toVotePayload(myDays))
    poll.value = updated
    // Tijdens het bewaren verder getikt? Dan blijven de lokale stemmen leidend.
    if (!dirty.value) syncMyDays()
    savedOnce.value = true
  } catch (e) {
    toast.error(errorMessage(e))
    await load({ silent: true })
  } finally {
    savingVotes.value = false
  }
}

// ---------- openen, kiezen, sluiten ----------

function startCompose() {
  const future = props.startDate && props.startDate.slice(0, 10) >= todayKey
  const from = future ? props.startDate.slice(0, 10) : todayKey
  const length = props.startDate && props.endDate ? Math.min(60, tripDays(props.startDate, props.endDate)) : 7
  Object.assign(form, { from, to: addDaysToKey(from, 59), length })
  composing.value = true
  nextTick(() => fromRef.value?.focus())
}

async function open() {
  saving.value = true
  try {
    poll.value = await tripsApi.openDatePoll(props.tripId, {
      rangeStart: `${form.from}T00:00:00.000Z`,
      rangeEnd: `${form.to}T00:00:00.000Z`,
      lengthDays: form.length,
    })
    syncMyDays()
    composing.value = false
    mode.value = 'mine'
    toast.success(t('datePoll.opened'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function decide(s) {
  const range = formatDateRange(s.start, s.end)
  const ok = await confirm({
    title: t('datePoll.suggestions.chooseTitle'),
    message: t('datePoll.suggestions.chooseMessage', { range }),
    confirmLabel: t('datePoll.suggestions.choose'),
  })
  if (!ok) return
  saving.value = true
  try {
    poll.value = await tripsApi.decideDatePoll(props.tripId, s.start)
    toast.success(t('datePoll.suggestions.chosen'))
    emit('decided')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function close() {
  menuOpen.value = false
  const ok = await confirm({ title: t('datePoll.closeTitle'), message: t('datePoll.closeMessage'), confirmLabel: t('datePoll.close'), variant: 'danger' })
  if (!ok) return
  try {
    poll.value = await tripsApi.closeDatePoll(props.tripId)
    toast.success(t('datePoll.closed'))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

const off = onRealtime('tripChanged', (p) => {
  if (p?.tripId === props.tripId && p.area === 'datePoll') load({ silent: true })
})
onMounted(load)
onBeforeUnmount(() => {
  off()
  cancelDrag()
  // Nog niet bewaarde stemmen niet verliezen bij het wisselen van tab.
  if (dirty.value) {
    saveSoon.cancel()
    saveVotes()
  }
})
</script>
