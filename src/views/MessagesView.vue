<template>
  <div class="card flex h-[calc(100dvh-12.5rem)] min-h-[440px] overflow-hidden md:h-[calc(100dvh-10rem)]">
    <!-- Gesprekken -->
    <aside class="w-full flex-col border-line md:flex md:w-80 md:border-r" :class="hasActive ? 'hidden' : 'flex'" :aria-label="$t('messages.conversations')">
      <header class="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h1 class="text-lg font-extrabold text-ink">{{ $t('messages.title') }}</h1>
        <button type="button" class="btn btn-dark btn-sm" @click="newOpen = true"><Icon name="edit" :size="14" /> {{ $t('messages.new') }}</button>
      </header>
      <div class="border-b border-line p-3">
        <div class="relative">
          <Icon name="search" :size="15" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input v-model="filter" type="search" class="search-pill h-9" :placeholder="$t('messages.searchConversations')" :aria-label="$t('messages.searchConversations')" />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="loadingConversations" class="space-y-1 p-2">
          <div v-for="i in 5" :key="i" class="flex items-center gap-3 p-2"><div class="skeleton h-11 w-11 rounded-full" /><div class="flex-1 space-y-1.5"><div class="skeleton h-3 w-24" /><div class="skeleton h-3 w-40" /></div></div>
        </div>
        <template v-else>
          <div v-if="filteredTripChats.length" class="border-b border-line">
            <p class="eyebrow px-4 pb-1 pt-3">{{ $t('planning.chat.groups') }}</p>
            <ul>
              <li v-for="g in filteredTripChats" :key="g.tripId">
                <RouterLink :to="`/messages/trip/${g.tripId}`" class="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50" :class="g.tripId === activeTripId ? 'bg-accent-50' : ''">
                  <span class="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100"><CoverImage :src="g.tripCoverImageUrl ? thumbUrl(g.tripCoverImageUrl) : ''" :seed="g.tripTitle" /></span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-baseline justify-between gap-2">
                      <span class="truncate text-sm" :class="g.unreadCount ? 'font-extrabold text-ink' : 'font-bold text-ink'">{{ g.tripTitle }}</span>
                      <span v-if="g.lastMessageAtUtc" class="shrink-0 text-[11px] font-semibold text-muted">{{ timeAgo(g.lastMessageAtUtc) }}</span>
                    </span>
                    <span class="flex items-center gap-2">
                      <span class="truncate text-xs" :class="g.unreadCount ? 'font-bold text-ink' : 'text-muted'">{{ g.lastMessageFromMe ? $t('planning.chat.you') : g.lastSenderDisplayName ? `${g.lastSenderDisplayName}: ` : '' }}{{ g.lastMessage }}</span>
                      <span v-if="g.unreadCount" class="badge ml-auto shrink-0 bg-accent-700">{{ g.unreadCount }}</span>
                    </span>
                  </span>
                </RouterLink>
              </li>
            </ul>
            <p v-if="conversations.length" class="eyebrow px-4 pb-1 pt-3">{{ $t('planning.chat.direct') }}</p>
          </div>
        </template>
        <EmptyState v-if="!loadingConversations && !conversations.length && !tripChats.length" bare icon="chat" :title="$t('messages.emptyTitle')" :text="$t('messages.emptyText')">
          <button type="button" class="btn btn-secondary btn-sm" @click="newOpen = true">{{ $t('messages.newMessage') }}</button>
        </EmptyState>
        <ul v-if="!loadingConversations && conversations.length">
          <li v-for="c in filteredConversations" :key="c.otherUserName">
            <RouterLink
              :to="`/messages/${c.otherUserName}`"
              class="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
              :class="c.otherUserName === activeUserName ? 'bg-accent-50' : ''"
            >
              <Avatar :src="c.otherProfilePhotoUrl" :name="c.otherDisplayName" size="md" />
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline justify-between gap-2">
                  <span class="truncate text-sm" :class="c.unreadCount ? 'font-extrabold text-ink' : 'font-bold text-ink'">{{ c.otherDisplayName }}</span>
                  <span class="shrink-0 text-[11px] font-semibold text-muted">{{ timeAgo(c.lastMessageAtUtc) }}</span>
                </span>
                <span class="flex items-center gap-2">
                  <span class="truncate text-xs" :class="c.unreadCount ? 'font-bold text-ink' : 'text-muted'">{{ c.lastMessageFromMe ? $t('planning.chat.you') : '' }}{{ c.lastMessage }}</span>
                  <span v-if="c.unreadCount" class="badge ml-auto shrink-0 bg-accent-700">{{ c.unreadCount }}</span>
                </span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Gesprek -->
    <section class="min-w-0 flex-1 flex-col md:flex" :class="hasActive ? 'flex' : 'hidden'" :aria-label="$t('messages.conversation')">
      <TripChatPanel v-if="activeTripId" :trip-id="activeTripId" @read="onTripChatRead" @sent="onTripChatSent" />
      <EmptyState v-else-if="!activeUserName" bare icon="chat" :title="$t('messages.pickTitle')" :text="$t('messages.pickText')" class="my-auto" />

      <template v-else>
        <header class="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
          <RouterLink to="/messages" class="btn-icon btn-icon-sm md:hidden" :aria-label="$t('messages.backToConversations')"><Icon name="arrow-left" :size="18" /></RouterLink>
          <RouterLink :to="`/u/${activeUserName}`" class="flex min-w-0 items-center gap-3">
            <Avatar :src="activeUser?.profilePhotoUrl" :name="activeUser?.displayName || activeUserName" size="md" />
            <span class="min-w-0">
              <span class="block truncate text-sm font-extrabold text-ink hover:underline">{{ activeUser?.displayName || activeUserName }}</span>
              <span class="block truncate text-xs text-muted">@{{ activeUserName }}</span>
            </span>
          </RouterLink>
        </header>

        <div ref="scrollRef" class="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
          <div v-if="loadingMessages" class="flex justify-center py-10"><Spinner /></div>
          <p v-else-if="!messages.length" class="py-10 text-center text-sm text-muted">{{ $t('messages.sayHello', { name: activeUser?.displayName || activeUserName }) }}</p>
          <template v-for="(m, i) in messages" :key="m.id">
            <div v-if="showDivider(i)" class="py-3 text-center">
              <span class="chip chip-muted h-6 text-[11px]">{{ dayLabel(m.createdAtUtc) }}</span>
            </div>
            <div class="group flex" :class="m.fromMe ? 'justify-end' : 'justify-start'">
              <div class="flex max-w-[78%] items-end gap-1.5" :class="m.fromMe ? 'flex-row-reverse' : ''">
                <div
                  class="whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug"
                  :class="[
                    m.fromMe ? 'rounded-br-md bg-accent-700 text-white' : 'rounded-bl-md bg-gray-100 text-ink',
                    m._failed ? 'opacity-60' : '',
                  ]"
                >{{ m.text }}</div>
                <button
                  v-if="m.fromMe && !m._sending && !m._failed"
                  type="button"
                  class="btn-icon h-7 w-7 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                  :aria-label="$t('messages.deleteMessage')"
                  @click="deleteMessage(m)"
                ><Icon name="trash" :size="14" /></button>
              </div>
            </div>
            <div v-if="m._failed" class="flex justify-end pr-1 text-xs font-semibold text-red-600">
              {{ $t('messages.notSent') }} · <button type="button" class="ml-1 underline" @click="retry(m)">{{ $t('messages.again') }}</button>
            </div>
            <div v-else-if="isLastOfGroup(i)" class="flex px-1 text-[11px] font-semibold text-muted" :class="m.fromMe ? 'justify-end' : ''">
              <span>{{ formatTime(m.createdAtUtc) }}</span>
              <span v-if="m.fromMe && i === lastMineIndex" class="ml-1 inline-flex items-center gap-0.5" :class="m.isRead ? 'text-accent-700' : ''">
                <Icon :name="m._sending ? 'clock' : m.isRead ? 'check-double' : 'check'" :size="12" />
                {{ m._sending ? $t('messages.sending') : m.isRead ? $t('messages.read') : $t('messages.sent') }}
              </span>
            </div>
          </template>
        </div>

        <form class="flex items-end gap-2 border-t border-line p-3" @submit.prevent="send">
          <label for="msg-input" class="sr-only">{{ $t('messages.message') }}</label>
          <textarea
            id="msg-input"
            ref="inputRef"
            v-model="draft"
            rows="1"
            maxlength="2000"
            class="textarea max-h-32 min-h-[42px] flex-1 rounded-2xl py-2.5"
            :placeholder="$t('messages.placeholder')"
            @input="autoResize"
            @keydown.enter.exact.prevent="send"
          />
          <button type="submit" class="btn btn-primary h-[42px] w-[42px] p-0" :disabled="!draft.trim()" :aria-label="$t('messages.send')"><Icon name="send" :size="18" /></button>
        </form>
      </template>
    </section>

    <UserSearchModal v-model="newOpen" :title="$t('messages.newMessage')" :action-label="$t('messages.message')" @select="startConversation" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UserSearchModal from '@/components/UserSearchModal.vue'
import TripChatPanel from '@/components/chat/TripChatPanel.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import * as tripsApi from '@/api/tripsApi'
import { thumbUrl } from '@/utils/media'
import * as messagesApi from '@/api/messagesApi'
import * as userApi from '@/api/userApi'
import { useCountsStore } from '@/stores/counts'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { dayLabel, formatTime, isSameDay, parseTimestamp, timeAgo } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const counts = useCountsStore()
const toast = useToastStore()
const { t } = useI18n()

const conversations = ref([])
const loadingConversations = ref(true)
const filter = ref('')
const messages = ref([])
const loadingMessages = ref(false)
const activeUser = ref(null)
const draft = ref('')
const newOpen = ref(false)
const scrollRef = ref(null)
const inputRef = ref(null)

const activeUserName = computed(() => (typeof route.params.userName === 'string' ? route.params.userName : ''))
const activeTripId = computed(() => (typeof route.params.tripId === 'string' ? route.params.tripId : ''))
const hasActive = computed(() => !!activeUserName.value || !!activeTripId.value)

// ---------- groepschats van reizen ----------
const tripChats = ref([])
const filteredTripChats = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return q ? tripChats.value.filter((g) => g.tripTitle.toLowerCase().includes(q)) : tripChats.value
})

async function loadTripChats() {
  try {
    tripChats.value = await tripsApi.getTripChats()
  } catch { /* stil */ }
}

function onTripChatRead(tripId) {
  const g = tripChats.value.find((x) => x.tripId === tripId)
  if (g) g.unreadCount = 0
}

function onTripChatSent(msg) {
  const g = tripChats.value.find((x) => x.tripId === msg.tripId)
  if (!g) return loadTripChats()
  Object.assign(g, { lastMessage: msg.text, lastMessageAtUtc: msg.createdAtUtc, lastMessageFromMe: true })
  tripChats.value.sort((a, b) => String(b.lastMessageAtUtc).localeCompare(String(a.lastMessageAtUtc)))
}

const filteredConversations = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter((c) => c.otherDisplayName.toLowerCase().includes(q) || c.otherUserName.toLowerCase().includes(q))
})

const lastMineIndex = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) if (messages.value[i].fromMe) return i
  return -1
})

function showDivider(i) {
  return i === 0 || !isSameDay(messages.value[i - 1].createdAtUtc, messages.value[i].createdAtUtc)
}

function isLastOfGroup(i) {
  const cur = messages.value[i]
  const next = messages.value[i + 1]
  if (!next) return true
  if (next.fromMe !== cur.fromMe) return true
  const gap = parseTimestamp(next.createdAtUtc) - parseTimestamp(cur.createdAtUtc)
  return gap > 5 * 60 * 1000
}

function isNearBottom() {
  const el = scrollRef.value
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    const el = scrollRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

async function loadConversations() {
  try {
    conversations.value = await messagesApi.getConversations()
  } catch {
    // stil; volgende poll probeert opnieuw
  } finally {
    loadingConversations.value = false
  }
}

async function markRead() {
  const conv = conversations.value.find((c) => c.otherUserName === activeUserName.value)
  if (conv && conv.unreadCount === 0) return
  try {
    await messagesApi.markConversationRead(activeUserName.value)
    if (conv) conv.unreadCount = 0
    counts.refresh()
  } catch { /* niet kritisch */ }
}

async function openConversation() {
  if (!activeUserName.value || activeTripId.value) return
  loadingMessages.value = true
  messages.value = []
  activeUser.value = null
  try {
    const [msgs, profile] = await Promise.all([
      messagesApi.getConversation(activeUserName.value, 200),
      userApi.getProfile(activeUserName.value).catch(() => null),
    ])
    messages.value = msgs
    activeUser.value = profile
    document.title = `${profile?.displayName || activeUserName.value} · ${t('messages.title')}`
    scrollToBottom()
    markRead()
    nextTick(() => inputRef.value?.focus())
  } catch (e) {
    toast.error(errorMessage(e, t('messages.loadFailed')))
    router.replace('/messages')
  } finally {
    loadingMessages.value = false
  }
}

/** Synchroniseert stil met de server (nieuwe berichten en leesbevestigingen). */
async function syncActive() {
  if (!activeUserName.value || loadingMessages.value) return
  try {
    const fresh = await messagesApi.getConversation(activeUserName.value, 200)
    const pending = messages.value.filter((m) => m._sending || m._failed)
    const stick = isNearBottom()
    const grew = fresh.length !== messages.value.length - pending.length
    messages.value = [...fresh, ...pending]
    if (grew && stick) scrollToBottom(true)
  } catch { /* stil */ }
}

async function send() {
  const text = draft.value.trim()
  if (!text || !activeUserName.value) return
  const temp = { id: `tmp-${Date.now()}`, text, fromMe: true, isRead: false, createdAtUtc: new Date().toISOString(), _sending: true, _failed: false }
  messages.value.push(temp)
  draft.value = ''
  nextTick(autoResize)
  scrollToBottom(true)
  await deliver(temp)
}

async function deliver(temp) {
  try {
    const saved = await messagesApi.sendMessage(activeUserName.value, temp.text)
    const idx = messages.value.findIndex((m) => m.id === temp.id)
    if (idx >= 0) messages.value.splice(idx, 1, saved)
    upsertConversation(saved)
  } catch {
    const live = messages.value.find((m) => m.id === temp.id)
    if (live) {
      live._sending = false
      live._failed = true
    }
  }
}

function retry(m) {
  m._failed = false
  m._sending = true
  deliver(m)
}

async function deleteMessage(m) {
  const ok = await confirm({ title: t('messages.deleteTitle'), message: t('messages.deleteText'), confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await messagesApi.deleteMessage(m.id)
    messages.value = messages.value.filter((x) => x.id !== m.id)
    loadConversations()
  } catch (e) {
    toast.error(errorMessage(e, t('messages.deleteFailed')))
  }
}

function upsertConversation(msg) {
  const other = msg.fromMe ? msg.recipientUserName : msg.senderUserName
  const existing = conversations.value.find((c) => c.otherUserName === other)
  if (!existing) {
    loadConversations()
    return
  }
  existing.lastMessage = msg.text
  existing.lastMessageAtUtc = msg.createdAtUtc
  existing.lastMessageFromMe = msg.fromMe
  if (!msg.fromMe && other !== activeUserName.value) existing.unreadCount += 1
  conversations.value.sort((a, b) => String(b.lastMessageAtUtc).localeCompare(String(a.lastMessageAtUtc)))
}

function startConversation(user) {
  newOpen.value = false
  router.push(`/messages/${user.userName}`)
}

// ---------- realtime + vangnet-polling ----------
const offs = []
let pollTimer = null

onMounted(() => {
  loadConversations()
  loadTripChats()
  openConversation()
  offs.push(
    onRealtime('message', (msg) => {
      upsertConversation(msg)
      if (msg.senderUserName === activeUserName.value && !messages.value.some((m) => m.id === msg.id)) {
        const stick = isNearBottom()
        messages.value.push(msg)
        if (stick) scrollToBottom(true)
        markRead()
      }
    }),
    onRealtime('messageRead', ({ readerUserName } = {}) => {
      if (readerUserName === activeUserName.value) messages.value.forEach((m) => { if (m.fromMe) m.isRead = true })
    }),
    onRealtime('tripMessage', (msg) => {
      const g = tripChats.value.find((x) => x.tripId === msg.tripId)
      if (!g) return loadTripChats()
      Object.assign(g, { lastMessage: msg.text, lastMessageAtUtc: msg.createdAtUtc, lastMessageFromMe: false, lastSenderDisplayName: msg.senderDisplayName })
      if (msg.tripId !== activeTripId.value) g.unreadCount += 1
      tripChats.value.sort((a, b) => String(b.lastMessageAtUtc).localeCompare(String(a.lastMessageAtUtc)))
    }),
    onRealtime('connected', () => {
      loadConversations()
      loadTripChats()
      syncActive()
    }),
  )
  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    loadConversations()
    loadTripChats()
    syncActive()
  }, 30000)
  window.addEventListener('app-refresh', loadConversations)
})

onBeforeUnmount(() => {
  offs.forEach((off) => off())
  clearInterval(pollTimer)
  window.removeEventListener('app-refresh', loadConversations)
})

watch(activeUserName, (name, prev) => {
  if (name !== prev) openConversation()
})
</script>
