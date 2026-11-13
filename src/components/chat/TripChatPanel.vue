<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <header class="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
      <RouterLink to="/messages" class="btn-icon btn-icon-sm md:hidden" :aria-label="$t('planning.chat.backToList')"><Icon name="arrow-left" :size="18" /></RouterLink>
      <RouterLink :to="`/trips/${tripId}`" class="flex min-w-0 flex-1 items-center gap-3">
        <span class="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <CoverImage :src="trip?.coverImageUrl ? thumbUrl(trip.coverImageUrl) : ''" :seed="trip?.title || tripId" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-extrabold text-ink hover:underline">{{ trip?.title || $t('common.loading') }}</span>
          <span class="block truncate text-xs text-muted">{{ participantNames }}</span>
        </span>
      </RouterLink>
    </header>

    <div ref="scrollRef" class="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite" @scroll.passive="onScroll">
      <div v-if="loading" class="flex justify-center py-10"><Spinner /></div>
      <template v-else>
        <div v-if="loadingOlder" class="flex justify-center py-2"><Spinner /></div>
        <p v-if="!messages.length" class="py-10 text-center text-sm text-muted">{{ $t('planning.chat.empty') }}</p>
        <template v-for="(m, i) in messages" :key="m.id">
          <div v-if="showDivider(i)" class="py-3 text-center">
            <span class="chip chip-muted h-6 text-[11px]">{{ dayLabel(m.createdAtUtc) }}</span>
          </div>
          <div class="group flex gap-2" :class="m.fromMe ? 'justify-end' : 'justify-start'">
            <span v-if="!m.fromMe" class="w-7 shrink-0">
              <Avatar v-if="isFirstOfGroup(i)" :src="m.senderProfilePhotoUrl" :name="m.senderDisplayName" :size="28" />
            </span>
            <div class="flex max-w-[78%] flex-col" :class="m.fromMe ? 'items-end' : 'items-start'">
              <span v-if="!m.fromMe && isFirstOfGroup(i)" class="mb-0.5 px-1 text-[11px] font-bold text-muted">{{ m.senderDisplayName }}</span>
              <div class="flex items-end gap-1.5" :class="m.fromMe ? 'flex-row-reverse' : ''">
                <div
                  class="whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug"
                  :class="[m.fromMe ? 'rounded-br-md bg-accent-700 text-white' : 'rounded-bl-md bg-gray-100 text-ink', m._failed ? 'opacity-60' : '']"
                >{{ m.text }}</div>
                <button v-if="m.fromMe && !m._sending && !m._failed" type="button" class="btn-icon h-7 w-7 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100" :aria-label="$t('planning.chat.delete')" @click="remove(m)"><Icon name="trash" :size="14" /></button>
              </div>
              <span v-if="m._failed" class="px-1 text-xs font-semibold text-red-600">{{ $t('planning.chat.failed') }} · <button type="button" class="underline" @click="deliver(m)">{{ $t('common.retry') }}</button></span>
              <span v-else-if="isLastOfGroup(i)" class="px-1 text-[11px] font-semibold text-muted">{{ m._sending ? $t('planning.chat.sending') : formatTime(m.createdAtUtc) }}</span>
            </div>
          </div>
        </template>
      </template>
    </div>

    <form class="flex items-end gap-2 border-t border-line p-3" @submit.prevent="send">
      <label for="trip-chat-input" class="sr-only">{{ $t('planning.chat.message') }}</label>
      <textarea
        id="trip-chat-input"
        ref="inputRef"
        v-model="draft"
        rows="1"
        maxlength="2000"
        class="textarea max-h-32 min-h-[42px] flex-1 rounded-2xl py-2.5"
        :placeholder="$t('planning.chat.placeholder')"
        @input="autoResize"
        @keydown.enter.exact.prevent="send"
      />
      <button type="submit" class="btn btn-primary h-[42px] w-[42px] p-0" :disabled="!draft.trim()" :aria-label="$t('planning.chat.send')"><Icon name="send" :size="18" /></button>
    </form>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import * as tripsApi from '@/api/tripsApi'
import { useAuthStore } from '@/stores/auth'
import { useCountsStore } from '@/stores/counts'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { dayLabel, formatTime, isSameDay, parseTimestamp } from '@/utils/date'
import { thumbUrl } from '@/utils/media'

const props = defineProps({
  tripId: { type: String, required: true },
})
const emit = defineEmits(['read', 'sent'])

const PAGE = 60
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const counts = useCountsStore()
const toast = useToastStore()

const trip = ref(null)
const messages = ref([])
const loading = ref(true)
const loadingOlder = ref(false)
const hasOlder = ref(false)
const draft = ref('')
const scrollRef = ref(null)
const inputRef = ref(null)

const participantNames = computed(() => {
  if (!trip.value) return ''
  const names = [trip.value.displayName, ...(trip.value.collaborators || []).filter((c) => c.status === 'Accepted').map((c) => c.displayName)]
  return names.join(', ')
})

function showDivider(i) {
  return i === 0 || !isSameDay(messages.value[i - 1].createdAtUtc, messages.value[i].createdAtUtc)
}

function sameSender(a, b) {
  if (!a || !b || a.senderUserName !== b.senderUserName) return false
  return Math.abs(parseTimestamp(b.createdAtUtc) - parseTimestamp(a.createdAtUtc)) < 5 * 60 * 1000
}

function isFirstOfGroup(i) {
  return showDivider(i) || !sameSender(messages.value[i - 1], messages.value[i])
}

function isLastOfGroup(i) {
  return !sameSender(messages.value[i], messages.value[i + 1])
}

function isNearBottom() {
  const el = scrollRef.value
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120
}

function scrollToBottom(smooth = false) {
  nextTick(() => scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }))
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

async function markRead() {
  try {
    await tripsApi.markTripChatRead(props.tripId)
    counts.refresh()
    emit('read', props.tripId)
  } catch { /* niet kritisch */ }
}

async function load() {
  loading.value = true
  messages.value = []
  try {
    const [msgs, tripData] = await Promise.all([tripsApi.getTripChat(props.tripId, PAGE), tripsApi.getTripById(props.tripId)])
    messages.value = msgs
    hasOlder.value = msgs.length === PAGE
    trip.value = tripData
    document.title = `${tripData.title} · ${t('planning.chat.title')}`
    scrollToBottom()
    markRead()
    nextTick(() => inputRef.value?.focus())
  } catch (e) {
    toast.error(errorMessage(e))
    router.replace('/messages')
  } finally {
    loading.value = false
  }
}

async function onScroll() {
  const el = scrollRef.value
  if (!el || el.scrollTop > 40 || loadingOlder.value || !hasOlder.value || !messages.value.length) return
  loadingOlder.value = true
  const prevHeight = el.scrollHeight
  try {
    const older = await tripsApi.getTripChat(props.tripId, PAGE, messages.value[0].createdAtUtc)
    hasOlder.value = older.length === PAGE
    messages.value = [...older, ...messages.value]
    nextTick(() => { el.scrollTop = el.scrollHeight - prevHeight })
  } catch { /* stil */ } finally {
    loadingOlder.value = false
  }
}

async function send() {
  const text = draft.value.trim()
  if (!text) return
  const temp = {
    id: `tmp-${Date.now()}`, text, fromMe: true, senderUserName: auth.userName, senderDisplayName: auth.displayName,
    createdAtUtc: new Date().toISOString(), _sending: true, _failed: false,
  }
  messages.value.push(temp)
  draft.value = ''
  nextTick(autoResize)
  scrollToBottom(true)
  await deliver(temp)
}

async function deliver(temp) {
  temp._failed = false
  temp._sending = true
  try {
    const saved = await tripsApi.sendTripChat(props.tripId, temp.text)
    const idx = messages.value.findIndex((m) => m.id === temp.id)
    if (idx >= 0) messages.value.splice(idx, 1, saved)
    emit('sent', saved)
  } catch {
    const live = messages.value.find((m) => m.id === temp.id)
    if (live) {
      live._sending = false
      live._failed = true
    }
  }
}

async function remove(m) {
  const ok = await confirm({ title: t('planning.chat.deleteTitle'), message: t('planning.chat.deleteText'), confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await tripsApi.deleteTripChatMessage(props.tripId, m.id)
    messages.value = messages.value.filter((x) => x.id !== m.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

const off = onRealtime('tripMessage', (msg) => {
  if (msg?.tripId !== props.tripId || messages.value.some((m) => m.id === msg.id)) return
  const stick = isNearBottom()
  messages.value.push(msg)
  if (stick) scrollToBottom(true)
  markRead()
})

watch(() => props.tripId, (id, prev) => { if (id !== prev) load() })
onMounted(load)
onBeforeUnmount(off)
</script>
