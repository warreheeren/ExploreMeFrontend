<template>
  <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] min-h-[calc(100vh-9rem)]">

    <!-- Conversations list -->
    <aside
      class="border-r border-gray-100 flex flex-col"
      :class="activeUserName ? 'hidden md:flex' : 'flex'"
    >
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <h2 class="text-base font-bold text-gray-900">Berichten</h2>
        <div class="flex items-center gap-2">
          <span v-if="totalUnread > 0" class="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">{{ totalUnread }}</span>
          <button
            @click="openNewMessageModal"
            class="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            title="Nieuw bericht"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="loadingConversations" class="p-4 space-y-3">
          <div v-for="i in 4" :key="i" class="flex gap-3 animate-pulse">
            <div class="w-11 h-11 rounded-full bg-gray-100 shrink-0"></div>
            <div class="flex-1 space-y-1.5">
              <div class="h-3 w-1/2 bg-gray-100 rounded"></div>
              <div class="h-2 w-3/4 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>

        <div v-else-if="conversations.length === 0" class="p-8 text-center">
          <svg class="w-12 h-12 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="text-sm text-gray-500 font-medium">Nog geen gesprekken</p>
          <p class="text-xs text-gray-400 mt-1">Stuur je eerste bericht via een profielpagina</p>
        </div>

        <div v-else>
          <RouterLink
            v-for="conv in conversations"
            :key="conv.otherUserName"
            :to="`/messages/${conv.otherUserName}`"
            class="flex gap-3 p-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
            :class="activeUserName === conv.otherUserName ? 'bg-primary-50/60' : ''"
          >
            <div class="relative shrink-0">
              <img
                v-if="conv.otherProfilePhotoUrl"
                :src="conv.otherProfilePhotoUrl"
                class="w-11 h-11 rounded-full object-cover"
              />
              <div v-else class="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                {{ conv.otherDisplayName?.[0]?.toUpperCase() || '?' }}
              </div>
              <span
                v-if="conv.unreadCount > 0"
                class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {{ conv.unreadCount }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline justify-between gap-2">
                <p class="text-sm font-bold text-gray-900 truncate">{{ conv.otherDisplayName }}</p>
                <time class="text-[10px] text-gray-400 shrink-0">{{ timeAgo(conv.lastMessageAtUtc) }}</time>
              </div>
              <p class="text-xs text-gray-500 truncate" :class="conv.unreadCount > 0 && !conv.lastMessageFromMe ? 'font-semibold text-gray-800' : ''">
                <span v-if="conv.lastMessageFromMe" class="text-gray-400">Jij: </span>{{ conv.lastMessage }}
              </p>
            </div>
          </RouterLink>
        </div>
      </div>
    </aside>

    <!-- Chat panel -->
    <section
      class="flex flex-col bg-gradient-to-b from-gray-50/50 to-white"
      :class="activeUserName ? 'flex' : 'hidden md:flex'"
    >
      <template v-if="!activeUserName">
        <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <h3 class="text-base font-bold text-gray-900">Selecteer een gesprek</h3>
          <p class="text-sm text-gray-500 mt-1">Of begin een nieuw bericht via een profiel</p>
        </div>
      </template>

      <template v-else>
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
          <button @click="goBackToList" class="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition">
            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <RouterLink :to="`/u/${activeUserName}`" class="flex items-center gap-3 group flex-1 min-w-0">
            <img v-if="activeUser?.profilePhotoUrl" :src="activeUser.profilePhotoUrl" class="w-9 h-9 rounded-full object-cover shrink-0"/>
            <div v-else class="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {{ activeUser?.displayName?.[0]?.toUpperCase() || activeUserName[0]?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-900 truncate group-hover:underline">{{ activeUser?.displayName || activeUserName }}</p>
              <p class="text-[11px] text-gray-400 truncate">@{{ activeUserName }}</p>
            </div>
          </RouterLink>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          <div v-if="loadingMessages" class="flex justify-center py-8">
            <div class="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin"></div>
          </div>

          <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
            <p class="text-sm text-gray-400">Nog geen berichten</p>
            <p class="text-xs text-gray-300 mt-1">Stuur het eerste bericht ⬇️</p>
          </div>

          <template v-else>
            <template v-for="(msg, idx) in messages" :key="msg.id">
              <!-- Date divider -->
              <div v-if="showDateDivider(idx)" class="flex items-center gap-3 py-3">
                <div class="flex-1 h-px bg-gray-200"></div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ formatDateDivider(msg.createdAtUtc) }}</span>
                <div class="flex-1 h-px bg-gray-200"></div>
              </div>

              <!-- Message bubble -->
              <div class="flex group items-end gap-1.5" :class="msg.fromMe ? 'justify-end' : 'justify-start'">
                <button
                  v-if="msg.fromMe && !msg._sending"
                  @click="onDelete(msg)"
                  class="opacity-0 group-hover:opacity-100 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Bericht verwijderen"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/>
                  </svg>
                </button>
                <div
                  class="max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm"
                  :class="[
                    msg.fromMe
                      ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-br-sm'
                      : 'bg-white ring-1 ring-gray-100 text-gray-800 rounded-bl-sm',
                    msg._sending ? 'opacity-60' : ''
                  ]"
                >
                  {{ msg.text }}
                  <div class="text-[10px] mt-1 flex items-center gap-1" :class="msg.fromMe ? 'text-white/70 justify-end' : 'text-gray-400'">
                    <span>{{ formatTime(msg.createdAtUtc) }}</span>
                    <span v-if="msg.fromMe && msg._sending" title="Verzenden...">
                      <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="40" stroke-linecap="round"/></svg>
                    </span>
                    <span v-else-if="msg.fromMe && shouldShowReceipt(idx)" :title="msg.isRead ? 'Gelezen' : 'Verzonden'">
                      <!-- single tick when unread, double tick (filled) when read -->
                      <svg v-if="!msg.isRead" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <svg v-else class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2 13l4 4 8-8"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 17l4 4L23 9"/>
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Composer -->
        <form @submit.prevent="onSend" class="px-4 py-3 border-t border-gray-100 bg-white flex items-end gap-2 shrink-0">
          <textarea
            v-model="draft"
            rows="1"
            placeholder="Schrijf een bericht..."
            class="flex-1 resize-none px-4 py-2.5 text-sm bg-gray-100 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-300 transition max-h-32"
            @keydown.enter.exact.prevent="onSend"
            @input="autoResize"
            ref="composerRef"
          />
          <button
            type="submit"
            :disabled="sending || !draft.trim()"
            class="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white flex items-center justify-center disabled:from-gray-300 disabled:to-gray-300 transition shadow-sm"
          >
            <svg v-if="!sending" class="w-4 h-4 -ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.105 3.105a.75.75 0 01.815-.165l13.5 5.25a.75.75 0 010 1.396l-13.5 5.25a.75.75 0 01-.97-.97l1.84-4.737a.75.75 0 01.595-.481l4.92-.682-4.92-.682a.75.75 0 01-.595-.481L2.94 4.075a.75.75 0 01.165-.97z"/>
            </svg>
            <span v-else class="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
          </button>
        </form>
      </template>
    </section>

    <!-- New message modal -->
    <Teleport to="body">
      <Transition name="nm-backdrop">
        <div
          v-if="showNewMessage"
          class="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-24 px-4"
          @click.self="closeNewMessageModal"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="flex items-center justify-between px-5 h-14 border-b border-gray-200">
              <h3 class="text-base font-bold text-gray-900">Nieuw bericht</h3>
              <button
                @click="closeNewMessageModal"
                class="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-900"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-4">
              <div class="relative">
                <input
                  ref="newMessageInputRef"
                  v-model="newMessageQuery"
                  @input="onNewMessageSearchInput"
                  type="text"
                  placeholder="Zoek een gebruiker..."
                  class="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-100 rounded-lg border border-transparent focus:border-primary-500 focus:bg-white focus:outline-none transition"
                />
                <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <div class="mt-3 max-h-72 overflow-y-auto">
                <div v-if="newMessageSearching" class="p-4 text-center text-xs text-gray-400">Zoeken...</div>
                <div v-else-if="newMessageQuery && newMessageResults.length === 0" class="p-4 text-center text-xs text-gray-400">Geen gebruikers gevonden</div>
                <div v-else-if="!newMessageQuery" class="p-4 text-center text-xs text-gray-400">Typ om gebruikers te zoeken</div>
                <button
                  v-for="user in newMessageResults"
                  :key="user.userName"
                  @click="startConversation(user.userName)"
                  class="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition text-left"
                >
                  <img
                    v-if="user.profilePhotoUrl"
                    :src="user.profilePhotoUrl"
                    class="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {{ user.displayName?.[0]?.toUpperCase() || '?' }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ user.displayName }}</p>
                    <p class="text-xs text-gray-400 truncate">@{{ user.userName }}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as messagesApi from '@/api/messagesApi'
import * as usersApi from '@/api/userApi'
import * as followApi from '@/api/followApi'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const conversations = ref([])
const loadingConversations = ref(true)

const activeUserName = computed(() => route.params.userName || null)
const activeUser = ref(null)
const messages = ref([])
const loadingMessages = ref(false)
const draft = ref('')
const sending = ref(false)

const messagesContainer = ref(null)
const composerRef = ref(null)

const showNewMessage = ref(false)
const newMessageQuery = ref('')
const newMessageResults = ref([])
const newMessageSearching = ref(false)
const newMessageInputRef = ref(null)
let newMessageSearchTimeout = null

let pollInterval = null

const totalUnread = computed(() =>
  conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
)

async function loadConversations() {
  try {
    conversations.value = await messagesApi.getConversations()
  } catch (e) {
    console.error('Failed to load conversations', e)
  } finally {
    loadingConversations.value = false
  }
}

async function loadActiveConversation() {
  if (!activeUserName.value) {
    messages.value = []
    activeUser.value = null
    return
  }
  loadingMessages.value = true
  try {
    const [msgs, profile] = await Promise.all([
      messagesApi.getConversation(activeUserName.value, 200),
      usersApi.getProfile(activeUserName.value).catch(() => null)
    ])
    messages.value = msgs
    activeUser.value = profile
    await messagesApi.markConversationRead(activeUserName.value).catch(() => {})
    // Reflect read state in conversation list
    const conv = conversations.value.find(c => c.otherUserName === activeUserName.value)
    if (conv) conv.unreadCount = 0
  } catch (e) {
    console.error('Failed to load conversation', e)
  } finally {
    loadingMessages.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function refreshActiveConversation() {
  if (!activeUserName.value) return
  try {
    const msgs = await messagesApi.getConversation(activeUserName.value, 200)
    if (msgs.length !== messages.value.length) {
      const wasAtBottom = isAtBottom()
      messages.value = msgs
      await messagesApi.markConversationRead(activeUserName.value).catch(() => {})
      await nextTick()
      if (wasAtBottom) scrollToBottom()
    }
  } catch { /* ignore */ }
}

function isAtBottom() {
  const c = messagesContainer.value
  if (!c) return true
  return c.scrollHeight - c.scrollTop - c.clientHeight < 80
}

function scrollToBottom() {
  const c = messagesContainer.value
  if (c) c.scrollTop = c.scrollHeight
}

async function onSend() {
  const text = draft.value.trim()
  if (!text || sending.value || !activeUserName.value) return
  sending.value = true

  const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const optimistic = {
    id: tempId,
    senderUserName: auth.userName,
    senderDisplayName: auth.displayName,
    senderProfilePhotoUrl: auth.profilePhotoUrl,
    recipientUserName: activeUserName.value,
    text,
    createdAtUtc: new Date().toISOString(),
    isRead: false,
    fromMe: true,
    _sending: true
  }
  messages.value.push(optimistic)
  draft.value = ''
  autoResize({ target: composerRef.value })
  await nextTick()
  scrollToBottom()

  try {
    const msg = await messagesApi.sendMessage(activeUserName.value, text)
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx >= 0) messages.value.splice(idx, 1, msg)
    loadConversations()
  } catch (e) {
    console.error('Failed to send', e)
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx >= 0) messages.value[idx]._failed = true
    if (idx >= 0) messages.value[idx]._sending = false
  } finally {
    sending.value = false
  }
}

async function onDelete(msg) {
  if (!msg?.id || msg._sending) return
  if (!confirm('Bericht verwijderen?')) return
  const idx = messages.value.findIndex(m => m.id === msg.id)
  if (idx < 0) return
  const removed = messages.value.splice(idx, 1)[0]
  try {
    await messagesApi.deleteMessage(msg.id)
    loadConversations()
  } catch (e) {
    console.error('Failed to delete', e)
    messages.value.splice(idx, 0, removed)
  }
}

function shouldShowReceipt(idx) {
  // Show receipt only on the last fromMe message (Instagram-style)
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].fromMe && !messages.value[i]._sending) {
      return i === idx
    }
  }
  return false
}

function openNewMessageModal() {
  showNewMessage.value = true
  newMessageQuery.value = ''
  newMessageResults.value = []
  nextTick(() => newMessageInputRef.value?.focus())
}

function closeNewMessageModal() {
  showNewMessage.value = false
  clearTimeout(newMessageSearchTimeout)
}

function onNewMessageSearchInput() {
  clearTimeout(newMessageSearchTimeout)
  const q = newMessageQuery.value.trim()
  if (!q) {
    newMessageResults.value = []
    newMessageSearching.value = false
    return
  }
  newMessageSearching.value = true
  newMessageSearchTimeout = setTimeout(async () => {
    try {
      const results = await followApi.searchUsers(q, 10)
      newMessageResults.value = (results || []).filter(u => u.userName !== auth.userName)
    } catch {
      newMessageResults.value = []
    } finally {
      newMessageSearching.value = false
    }
  }, 250)
}

function startConversation(userName) {
  closeNewMessageModal()
  router.push(`/messages/${userName}`)
}

function autoResize(e) {
  const el = e?.target
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
}

function goBackToList() {
  router.push('/messages')
}

function showDateDivider(idx) {
  if (idx === 0) return true
  const prev = new Date(messages.value[idx - 1].createdAtUtc).toDateString()
  const cur = new Date(messages.value[idx].createdAtUtc).toDateString()
  return prev !== cur
}

function formatDateDivider(d) {
  const date = new Date(d)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Vandaag'
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(d) {
  const seconds = Math.floor((new Date() - new Date(d)) / 1000)
  if (seconds < 60) return 'nu'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}u`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function handleEscape(e) {
  if (e.key === 'Escape' && showNewMessage.value) closeNewMessageModal()
}

function handleAppRefresh() {
  loadConversations()
  if (activeUserName.value) loadActiveConversation()
}

onMounted(() => {
  loadConversations()
  loadActiveConversation()
  pollInterval = setInterval(() => {
    loadConversations()
    refreshActiveConversation()
  }, 8000)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('app-refresh', handleAppRefresh)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('app-refresh', handleAppRefresh)
})

watch(() => route.params.userName, () => {
  loadActiveConversation()
})
</script>

<style scoped>
.nm-backdrop-enter-active,
.nm-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.nm-backdrop-enter-from,
.nm-backdrop-leave-to {
  opacity: 0;
}
</style>
