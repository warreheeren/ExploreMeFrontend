<template>
  <div class="mx-auto max-w-2xl space-y-5">
    <!-- Nieuwe stemming -->
    <section class="card card-pad sm:p-6">
      <button v-if="!composing" type="button" class="flex w-full items-center gap-3 text-left" @click="startCompose">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-800"><Icon name="vote" :size="18" /></span>
        <span class="flex-1">
          <span class="block text-sm font-bold text-ink">{{ $t('planning.polls.new') }}</span>
          <span class="block text-xs text-muted">{{ $t('planning.polls.newHint') }}</span>
        </span>
        <Icon name="plus" :size="18" class="text-muted" />
      </button>

      <form v-else class="space-y-4" @submit.prevent="create">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold text-muted">{{ $t('planning.polls.templates.label') }}</span>
          <button type="button" class="chip-toggle" @click="applyTemplate('where')"><Icon name="compass" :size="12" /> {{ $t('planning.polls.templates.where') }}</button>
        </div>
        <div>
          <label for="poll-q" class="label">{{ $t('planning.polls.question') }}</label>
          <input id="poll-q" ref="questionRef" v-model.trim="form.question" class="input" maxlength="200" :placeholder="$t('planning.polls.questionPlaceholder')" />
        </div>
        <div class="space-y-2">
          <span class="label">{{ $t('planning.polls.options') }}</span>
          <div v-for="(opt, i) in form.options" :key="i" class="flex gap-2">
            <input :ref="(el) => (optionInputs[i] = el)" v-model="form.options[i]" class="input flex-1" maxlength="100" :placeholder="$t('planning.polls.optionPlaceholder', { n: i + 1 })" :aria-label="$t('planning.polls.optionPlaceholder', { n: i + 1 })" />
            <button v-if="form.options.length > 2" type="button" class="btn-icon" :aria-label="$t('planning.polls.removeOption')" @click="form.options.splice(i, 1)"><Icon name="x" :size="16" /></button>
          </div>
          <button v-if="form.options.length < 10" type="button" class="btn btn-ghost btn-sm" @click="form.options.push('')"><Icon name="plus" :size="14" /> {{ $t('planning.polls.addOption') }}</button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="flex items-center gap-2 text-sm font-semibold text-body">
            <input v-model="form.allowMultiple" type="checkbox" class="checkbox" /> {{ $t('planning.polls.allowMultiple') }}
          </label>
          <div>
            <label for="poll-deadline" class="label">{{ $t('planning.polls.deadline') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
            <input id="poll-deadline" v-model="form.closesAt" type="datetime-local" class="input" :min="nowLocal" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" @click="composing = false">{{ $t('common.cancel') }}</button>
          <button type="submit" class="btn btn-dark" :disabled="!canCreate || saving">{{ $t('planning.polls.create') }}</button>
        </div>
      </form>
    </section>

    <LoadingState v-if="loading"><div class="space-y-3"><div v-for="i in 2" :key="i" class="skeleton h-48 rounded-2xl" /></div></LoadingState>
    <EmptyState v-else-if="!polls.length" icon="vote" :title="$t('planning.polls.emptyTitle')" :text="$t('planning.polls.emptyText')" />

    <article v-for="poll in polls" :key="poll.id" class="card card-pad sm:p-6">
      <header class="mb-3 flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="text-base font-bold text-ink">{{ poll.question }}</h3>
          <p class="mt-0.5 text-xs font-semibold text-muted">
            {{ poll.createdByDisplayName }} · {{ timeAgo(poll.createdAtUtc) }}
            · {{ $t('planning.polls.voted', { n: poll.voterCount, total: poll.participantCount }) }}
            <template v-if="poll.allowMultiple"> · {{ $t('planning.polls.multiple') }}</template>
          </p>
        </div>
        <span v-if="poll.isClosed" class="chip chip-muted h-6">{{ $t('planning.polls.closed') }}</span>
        <span v-else-if="poll.closesAtUtc" class="chip chip-accent h-6"><Icon name="clock" :size="12" /> {{ $t('planning.polls.until', { date: formatDateTime(poll.closesAtUtc) }) }}</span>
        <div v-if="poll.canManage" v-click-outside="() => (menuFor = menuFor === poll.id ? null : menuFor)" class="relative">
          <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.more')" @click="menuFor = menuFor === poll.id ? null : poll.id"><Icon name="more" :size="16" /></button>
          <div v-if="menuFor === poll.id" class="menu right-0 top-full mt-1" role="menu">
            <button v-if="!poll.isClosed" type="button" class="menu-item" role="menuitem" @click="close(poll)"><Icon name="lock" :size="15" /> {{ $t('planning.polls.close') }}</button>
            <button type="button" class="menu-item menu-item-danger" role="menuitem" @click="remove(poll)"><Icon name="trash" :size="15" /> {{ $t('common.delete') }}</button>
          </div>
        </div>
      </header>

      <ul class="space-y-2" role="list">
        <!-- De link staat naast de stemknop (niet erin): openen mag nooit per ongeluk een stem uitbrengen -->
        <li v-for="opt in poll.options" :key="opt.id" class="flex items-center gap-1.5">
          <button
            type="button"
            class="relative min-w-0 flex-1 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition"
            :class="[opt.votedByMe ? 'border-accent-700' : 'border-line', poll.isClosed ? 'cursor-default' : 'hover:border-line-strong']"
            :disabled="poll.isClosed || votingId === poll.id"
            :aria-pressed="opt.votedByMe"
            @click="vote(poll, opt)"
          >
            <span class="absolute inset-y-0 left-0 transition-all" :class="isWinner(poll, opt) ? 'bg-accent-100' : 'bg-gray-100'" :style="{ width: `${percent(poll, opt)}%` }" aria-hidden="true" />
            <span class="relative flex items-center gap-2">
              <span class="flex h-5 w-5 shrink-0 items-center justify-center border-2 transition" :class="[poll.allowMultiple ? 'rounded-md' : 'rounded-full', opt.votedByMe ? 'border-accent-700 bg-accent-700 text-white' : 'border-line-strong bg-surface']">
                <Icon v-if="opt.votedByMe" name="check" :size="12" :stroke-width="3" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block break-words text-sm font-bold text-ink">{{ opt.text }}</span>
                <span v-if="opt.addedByDisplayName" class="block text-xs font-medium text-muted">{{ $t('planning.polls.suggestedBy', { name: opt.addedByDisplayName }) }}</span>
              </span>
              <span class="flex -space-x-1.5">
                <Avatar v-for="v in opt.voters.slice(0, 3)" :key="v.userName" :src="v.profilePhotoUrl" :name="v.displayName" :size="22" ring :title="v.displayName" />
              </span>
              <span class="w-10 text-right text-xs font-bold tabular-nums text-muted">{{ percent(poll, opt) }}%</span>
            </span>
          </button>
          <a
            v-if="isSafeHttpUrl(opt.url)"
            :href="opt.url.trim()"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-icon btn-icon-sm"
            :title="linkHost(opt.url)"
            :aria-label="$t('planning.polls.openLink', { text: opt.text, host: linkHost(opt.url) })"
          >
            <Icon name="external" :size="15" />
          </a>
        </li>
      </ul>

      <!-- Voorstel toevoegen: iedere deelnemer, zolang de stemming open is -->
      <template v-if="!poll.isClosed">
        <form v-if="suggestFor === poll.id" class="mt-3 space-y-2 rounded-xl border border-line p-3" novalidate @submit.prevent="suggest(poll)">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label :for="`poll-suggest-text-${poll.id}`" class="label">{{ $t('planning.polls.suggestText') }}</label>
              <input :id="`poll-suggest-text-${poll.id}`" ref="suggestTextRef" v-model="suggestForm.text" class="input" maxlength="100" :placeholder="$t('planning.polls.suggestTextPlaceholder')" />
            </div>
            <div>
              <label :for="`poll-suggest-url-${poll.id}`" class="label">{{ $t('planning.polls.suggestUrl') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
              <input
                :id="`poll-suggest-url-${poll.id}`"
                v-model="suggestForm.url"
                type="url"
                inputmode="url"
                class="input"
                maxlength="500"
                :placeholder="$t('planning.polls.suggestUrlPlaceholder')"
                :aria-invalid="!!suggestError"
                :aria-describedby="suggestError ? `poll-suggest-error-${poll.id}` : undefined"
                @input="suggestError = ''"
              />
            </div>
          </div>
          <p v-if="suggestError" :id="`poll-suggest-error-${poll.id}`" class="text-xs font-semibold text-red-600">{{ suggestError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost btn-sm" @click="suggestFor = null">{{ $t('common.cancel') }}</button>
            <button type="submit" class="btn btn-dark btn-sm" :disabled="!suggestForm.text.trim() || suggesting">{{ $t('planning.polls.suggestSubmit') }}</button>
          </div>
        </form>
        <button v-else type="button" class="btn btn-ghost btn-sm mt-2" @click="startSuggest(poll)"><Icon name="plus" :size="14" /> {{ $t('planning.polls.suggest') }}</button>
      </template>
    </article>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import * as tripsApi from '@/api/tripsApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { formatTime, formatDate, timeAgo } from '@/utils/date'
import { isSafeHttpUrl, linkHost, normalizeUrl } from '@/utils/polls'

const props = defineProps({
  tripId: { type: String, required: true },
})

const { t } = useI18n()
const toast = useToastStore()
const polls = ref([])
const loading = ref(true)
const composing = ref(false)
const saving = ref(false)
const votingId = ref(null)
const menuFor = ref(null)
const questionRef = ref(null)
const form = reactive({ question: '', options: ['', ''], allowMultiple: false, closesAt: '' })
// Op index bijgehouden (een gewone ref-array in v-for garandeert de volgorde niet).
const optionInputs = []
// Inline "voorstel toevoegen": er staat hooguit één formulier tegelijk open.
const suggestFor = ref(null)
const suggestForm = reactive({ text: '', url: '' })
const suggestError = ref('')
const suggesting = ref(false)
const suggestTextRef = ref([])

const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const canCreate = computed(() => form.question && form.options.filter((o) => o.trim()).length >= 2)

function formatDateTime(value) {
  return `${formatDate(String(value).slice(0, 10))} ${formatTime(value)}`
}

function percent(poll, opt) {
  const total = poll.options.reduce((n, o) => n + o.voteCount, 0)
  return total ? Math.round((opt.voteCount / total) * 100) : 0
}

function isWinner(poll, opt) {
  const max = Math.max(...poll.options.map((o) => o.voteCount))
  return max > 0 && opt.voteCount === max
}

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    polls.value = await tripsApi.getPolls(props.tripId)
  } catch (e) {
    if (!silent) toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

function startCompose() {
  Object.assign(form, { question: '', options: ['', ''], allowMultiple: false, closesAt: '' })
  composing.value = true
  nextTick(() => questionRef.value?.focus())
}

/** Vult alleen de vraag in; de keuzes laat de groep zelf bepalen. */
function applyTemplate(key) {
  form.question = t(`planning.polls.templates.${key}`)
  nextTick(() => {
    const emptyIndex = form.options.findIndex((o) => !o.trim())
    optionInputs[emptyIndex >= 0 ? emptyIndex : 0]?.focus()
  })
}

function startSuggest(poll) {
  Object.assign(suggestForm, { text: '', url: '' })
  suggestError.value = ''
  suggestFor.value = poll.id
  nextTick(() => suggestTextRef.value?.[0]?.focus())
}

async function suggest(poll) {
  const text = suggestForm.text.trim()
  if (!text || suggesting.value) return
  const url = normalizeUrl(suggestForm.url)
  if (url && !isSafeHttpUrl(url)) {
    suggestError.value = t('planning.polls.suggestInvalidUrl')
    return
  }
  suggesting.value = true
  try {
    const updated = await tripsApi.addPollOption(poll.id, url ? { text, url } : { text })
    polls.value = polls.value.map((p) => (p.id === poll.id ? updated : p))
    suggestFor.value = null
    toast.success(t('planning.polls.suggestAdded'))
  } catch (e) {
    // Bv. 409 als het voorstel al bestaat: de melding van de API zegt het best wat er mis is.
    toast.error(errorMessage(e))
  } finally {
    suggesting.value = false
  }
}

async function create() {
  saving.value = true
  try {
    const poll = await tripsApi.createPoll(props.tripId, {
      question: form.question,
      options: form.options.map((o) => o.trim()).filter(Boolean),
      allowMultiple: form.allowMultiple,
      closesAtUtc: form.closesAt ? new Date(form.closesAt).toISOString() : null,
    })
    polls.value.unshift(poll)
    composing.value = false
    toast.success(t('planning.polls.created'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function vote(poll, opt) {
  if (poll.isClosed) return
  let ids = poll.options.filter((o) => o.votedByMe).map((o) => o.id)
  if (poll.allowMultiple) ids = opt.votedByMe ? ids.filter((id) => id !== opt.id) : [...ids, opt.id]
  else ids = opt.votedByMe ? [] : [opt.id]

  votingId.value = poll.id
  try {
    const updated = await tripsApi.votePoll(poll.id, ids)
    polls.value = polls.value.map((p) => (p.id === poll.id ? updated : p))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    votingId.value = null
  }
}

async function close(poll) {
  menuFor.value = null
  try {
    const updated = await tripsApi.closePoll(poll.id)
    polls.value = polls.value.map((p) => (p.id === poll.id ? updated : p))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function remove(poll) {
  menuFor.value = null
  const ok = await confirm({ title: t('planning.polls.deleteTitle'), message: poll.question, confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await tripsApi.deletePoll(poll.id)
    polls.value = polls.value.filter((p) => p.id !== poll.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

const off = onRealtime('tripChanged', (p) => {
  if (p?.tripId === props.tripId && p.area === 'polls') load({ silent: true })
})
onMounted(load)
onBeforeUnmount(off)
</script>
