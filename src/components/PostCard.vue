<template>
  <article class="bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition">

    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-3.5">
      <button @click="$emit('goProfile', post.userName)" class="shrink-0 relative">
        <div class="p-0.5 rounded-full bg-gradient-to-tr from-teal-400 via-cyan-400 to-blue-500">
          <img
            v-if="post.profilePhotoUrl"
            :src="post.profilePhotoUrl"
            class="w-10 h-10 rounded-full object-cover ring-2 ring-white"
          />
          <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 ring-2 ring-white">
            {{ post.displayName?.[0]?.toUpperCase() }}
          </div>
        </div>
      </button>

      <div class="min-w-0 flex-1">
        <button @click="$emit('goProfile', post.userName)" class="text-sm font-bold text-gray-900 hover:underline leading-tight block">
          {{ post.displayName }}
        </button>
        <div class="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
          <span>@{{ post.userName }}</span>
          <span>·</span>
          <time>{{ timeAgo(post.createdAtUtc) }}</time>
        </div>
      </div>

      <!-- Non-owner: report menu -->
      <div v-if="!isOwner && auth.isAuthenticated" class="relative">
        <button
          @click.stop="reportMenuOpen = !reportMenuOpen"
          class="p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
          aria-label="Meer"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
          </svg>
        </button>
        <div
          v-if="reportMenuOpen"
          v-click-outside="() => reportMenuOpen = false"
          class="absolute right-0 top-full mt-1 w-44 bg-white ring-1 ring-gray-200 shadow-lg rounded-xl overflow-hidden z-20"
        >
          <button
            @click="onReportPost"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2zm9-13.5V9"/>
            </svg>
            Rapporteer post
          </button>
        </div>
      </div>

      <!-- Owner menu -->
      <div v-else-if="isOwner" class="relative">
        <button
          @click.stop="menuOpen = !menuOpen"
          class="p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
          </svg>
        </button>
        <div
          v-if="menuOpen"
          v-click-outside="() => menuOpen = false"
          class="absolute right-0 top-full mt-1 w-40 bg-white ring-1 ring-gray-200 shadow-lg rounded-xl overflow-hidden z-20"
        >
          <button
            @click="startEdit"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Bewerken
          </button>
          <button
            @click="onDeletePost"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></svg>
            Verwijderen
          </button>
        </div>
      </div>
    </div>

    <!-- Images (carousel if multiple) -->
    <div v-if="images.length > 0" class="relative bg-gray-50 select-none" @dblclick="$emit('like', post)">
      <div class="overflow-hidden">
        <div
          class="flex transition-transform duration-300 ease-out"
          :style="{ transform: `translateX(-${currentImage * 100}%)` }"
        >
          <img
            v-for="(url, idx) in images"
            :key="idx"
            :src="url"
            :alt="post.caption"
            class="w-full shrink-0 max-h-[560px] object-cover"
            loading="lazy"
            draggable="false"
          />
        </div>
      </div>

      <!-- Prev/Next arrows -->
      <template v-if="images.length > 1">
        <button
          v-if="currentImage > 0"
          @click.stop="currentImage--"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm shadow flex items-center justify-center hover:bg-white transition"
          aria-label="Vorige"
        >
          <svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button
          v-if="currentImage < images.length - 1"
          @click.stop="currentImage++"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm shadow flex items-center justify-center hover:bg-white transition"
          aria-label="Volgende"
        >
          <svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>

        <!-- Counter top-right -->
        <div class="absolute top-3 right-3 px-2.5 py-0.5 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
          {{ currentImage + 1 }} / {{ images.length }}
        </div>

        <!-- Dots bottom -->
        <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          <button
            v-for="(_, idx) in images"
            :key="idx"
            @click.stop="currentImage = idx"
            class="w-1.5 h-1.5 rounded-full transition"
            :class="idx === currentImage ? 'bg-white scale-125' : 'bg-white/50'"
          ></button>
        </div>
      </template>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 px-3 pt-3">
      <button
        @click="$emit('like', post)"
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-red-50 transition group"
      >
        <svg
          class="w-5 h-5 transition-transform duration-150 group-active:scale-125"
          :class="post.likedByMe ? 'text-red-500' : 'text-gray-600 group-hover:text-red-500'"
          :fill="post.likedByMe ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
        <span
          v-if="post.likeCount > 0"
          class="text-sm font-semibold tabular-nums"
          :class="post.likedByMe ? 'text-red-500' : 'text-gray-700'"
        >{{ post.likeCount }}</span>
      </button>

      <button
        @click="$emit('toggleComments', post)"
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-blue-50 transition group"
      >
        <svg class="w-5 h-5 text-gray-600 group-hover:text-blue-500 transition" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span v-if="post.commentCount > 0" class="text-sm font-semibold text-gray-700 tabular-nums">{{ post.commentCount }}</span>
      </button>

      <button class="ml-auto p-2 rounded-full hover:bg-gray-100 transition group">
        <svg class="w-5 h-5 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
      </button>
    </div>

    <!-- Caption -->
    <div class="px-4 pt-2 pb-3">
      <template v-if="!editing">
        <p class="text-sm text-gray-800 leading-relaxed">
          <button @click="$emit('goProfile', post.userName)" class="font-bold text-gray-900 hover:underline mr-1.5">{{ post.displayName }}</button>
          <span>{{ post.caption }}</span>
        </p>
      </template>
      <template v-else>
        <textarea
          v-model="editCaption"
          rows="3"
          class="w-full text-sm bg-gray-50 rounded-xl p-3 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none transition"
          placeholder="Wat wil je delen..."
        />
        <div class="flex items-center gap-2 mt-2">
          <button
            @click="saveEdit"
            :disabled="savingEdit || !editCaption.trim()"
            class="px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition"
          >
            {{ savingEdit ? 'Opslaan...' : 'Opslaan' }}
          </button>
          <button
            @click="cancelEdit"
            class="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
          >
            Annuleren
          </button>
        </div>
      </template>
      <button
        v-if="!editing && post.commentCount > 0 && !isCommentsOpen"
        @click="$emit('toggleComments', post)"
        class="mt-2 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
      >
        Bekijk alle {{ post.commentCount }} reacties &rarr;
      </button>
    </div>

    <!-- Comments section -->
    <div v-if="isCommentsOpen" class="px-4 pb-3">
      <!-- Header -->
      <div class="flex items-center gap-2 py-3 mb-1 border-t border-gray-100">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">Reacties</span>
        <span v-if="post.commentCount > 0" class="text-xs font-medium text-gray-400">· {{ post.commentCount }}</span>
      </div>

      <!-- Loading -->
      <div v-if="ui?.loadingComments" class="flex items-center gap-2 py-3">
        <div class="h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div>
        <span class="text-xs text-gray-400">Reacties laden...</span>
      </div>

      <!-- Comments -->
      <div v-else class="space-y-3">
        <div
          v-for="c in ui?.comments"
          :key="c.id"
          class="flex gap-2.5 items-start group"
        >
          <button @click="$emit('goProfile', c.userName)" class="shrink-0 mt-0.5">
            <img
              v-if="c.profilePhotoUrl"
              :src="c.profilePhotoUrl"
              class="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
            <div v-else class="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-white shadow-sm">
              {{ c.displayName?.[0]?.toUpperCase() }}
            </div>
          </button>

          <div class="min-w-0 flex-1">
            <template v-if="editingCommentId !== c.id">
              <div class="inline-block max-w-full bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2">
                <button
                  @click="$emit('goProfile', c.userName)"
                  class="text-xs font-bold text-gray-900 hover:underline block leading-tight"
                >
                  {{ c.displayName }}
                </button>
                <p class="text-sm text-gray-800 mt-0.5 leading-snug break-words whitespace-pre-wrap">{{ c.text }}</p>
              </div>
              <div class="flex items-center gap-3 mt-1 ml-3.5">
                <time class="text-[11px] text-gray-400">{{ timeAgo(c.createdAtUtc) }}</time>
                <template v-if="isCommentOwner(c)">
                  <button @click="startEditComment(c)" class="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition opacity-0 group-hover:opacity-100">
                    Bewerken
                  </button>
                  <button @click="onDeleteComment(c)" class="text-[11px] font-semibold text-red-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100">
                    Verwijderen
                  </button>
                </template>
              </div>
            </template>
            <template v-else>
              <div class="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
                <textarea
                  v-model="editCommentText"
                  rows="2"
                  class="w-full text-sm bg-transparent focus:outline-none resize-none"
                  @keydown.enter.exact.prevent="saveEditComment(c)"
                  @keydown.escape="cancelEditComment"
                />
              </div>
              <div class="flex items-center gap-2 mt-1 ml-3.5">
                <button
                  @click="saveEditComment(c)"
                  :disabled="savingComment || !editCommentText.trim()"
                  class="text-[11px] font-bold text-primary-600 hover:text-primary-700 disabled:text-gray-300 transition"
                >
                  Opslaan
                </button>
                <button @click="cancelEditComment" class="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition">
                  Annuleer
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-if="ui?.commentsLoaded && (!ui?.comments || ui.comments.length === 0)"
        class="text-center py-6"
      >
        <div class="w-10 h-10 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-2">
          <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <p class="text-xs text-gray-400">Nog geen reacties</p>
        <p class="text-[11px] text-gray-300 mt-0.5">Wees de eerste die reageert</p>
      </div>

      <!-- Error -->
      <p v-if="ui?.error" class="text-xs text-red-500 py-1 mt-2">{{ ui.error }}</p>
    </div>

    <!-- Add comment -->
    <div class="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
      <form @submit.prevent="$emit('addComment', post)" class="flex items-center gap-2.5">
        <div class="flex-1 flex items-center gap-2 bg-white rounded-full ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-primary-300 transition px-4 py-2">
          <input
            :value="ui?.newComment"
            @input="$emit('updateComment', post.id, $event.target.value)"
            placeholder="Voeg een reactie toe..."
            class="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-gray-400 min-w-0"
          />
        </div>
        <button
          :disabled="!ui?.newComment?.trim() || ui?.addingComment"
          class="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-default transition shadow-sm"
        >
          {{ ui?.addingComment ? '...' : 'Plaats' }}
        </button>
      </form>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import * as postsApi from '@/api/postsApi'

const props = defineProps({
  post: { type: Object, required: true },
  ui: { type: Object, default: null },
  isCommentsOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['like', 'toggleComments', 'addComment', 'updateComment', 'goProfile', 'postUpdated', 'postDeleted'])

const auth = useAuthStore()

const currentImage = ref(0)
const images = computed(() => {
  if (Array.isArray(props.post.imageUrls) && props.post.imageUrls.length) return props.post.imageUrls
  if (props.post.imageUrl) return [props.post.imageUrl]
  return []
})

const isOwner = computed(() => auth.userName && auth.userName === props.post.userName)

// Post edit/delete state
const menuOpen = ref(false)
const reportMenuOpen = ref(false)

function onReportPost() {
  reportMenuOpen.value = false
  alert('Bedankt voor je melding — onze moderators bekijken de post.')
}
const editing = ref(false)
const editCaption = ref('')
const savingEdit = ref(false)

function startEdit() {
  editCaption.value = props.post.caption
  editing.value = true
  menuOpen.value = false
}

function cancelEdit() {
  editing.value = false
  editCaption.value = ''
}

async function saveEdit() {
  if (!editCaption.value.trim() || savingEdit.value) return
  savingEdit.value = true
  try {
    const updated = await postsApi.updatePost(props.post.id, {
      caption: editCaption.value.trim(),
      imageUrls: props.post.imageUrls
    })
    Object.assign(props.post, updated)
    editing.value = false
    emit('postUpdated', updated)
  } catch (e) {
    console.error('Update post failed', e)
  } finally {
    savingEdit.value = false
  }
}

async function onDeletePost() {
  menuOpen.value = false
  if (!confirm('Weet je zeker dat je deze post wilt verwijderen?')) return
  try {
    await postsApi.deletePost(props.post.id)
    emit('postDeleted', props.post.id)
  } catch (e) {
    console.error('Delete post failed', e)
  }
}

// Comment edit/delete
const editingCommentId = ref(null)
const editCommentText = ref('')
const savingComment = ref(false)

function isCommentOwner(c) {
  return auth.userName && auth.userName === c.userName
}

function startEditComment(c) {
  editingCommentId.value = c.id
  editCommentText.value = c.text
}

function cancelEditComment() {
  editingCommentId.value = null
  editCommentText.value = ''
}

async function saveEditComment(c) {
  if (!editCommentText.value.trim() || savingComment.value) return
  savingComment.value = true
  try {
    const updated = await postsApi.updateComment(c.id, editCommentText.value.trim())
    Object.assign(c, updated)
    editingCommentId.value = null
  } catch (e) {
    console.error('Update comment failed', e)
  } finally {
    savingComment.value = false
  }
}

async function onDeleteComment(c) {
  if (!confirm('Reactie verwijderen?')) return
  try {
    await postsApi.deleteComment(c.id)
    if (props.ui?.comments) {
      const idx = props.ui.comments.findIndex(x => x.id === c.id)
      if (idx >= 0) props.ui.comments.splice(idx, 1)
    }
    if (typeof props.post.commentCount === 'number') {
      props.post.commentCount = Math.max(0, props.post.commentCount - 1)
    }
  } catch (e) {
    console.error('Delete comment failed', e)
  }
}

// Click-outside directive (inline)
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!el.contains(event.target)) binding.value?.()
    }
    setTimeout(() => document.addEventListener('click', el._clickOutside), 0)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}

function timeAgo(iso) {
  if (!iso) return ''
  const now = new Date()
  const date = new Date(iso)
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'zojuist'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}u`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
</script>
