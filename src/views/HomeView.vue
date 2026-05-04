<template>
  <div class="lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:gap-6">
    <!-- Spacer (left) — keeps feed visually centered -->
    <div class="hidden lg:block"></div>

    <!-- ===== Main column ===== -->
    <div class="max-w-2xl mx-auto w-full space-y-5">

      <!-- Welcome banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white p-6 shadow-md">
        <div class="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none"></div>
        <div class="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none"></div>
        <div class="relative">
          <p class="text-xs font-medium text-white/80 uppercase tracking-wider">{{ greeting }}</p>
          <h1 class="text-2xl md:text-3xl font-bold mt-1 leading-tight">
            Welkom terug, {{ auth.displayName?.split(' ')[0] || 'reiziger' }} ✈️
          </h1>
          <p class="text-sm text-white/85 mt-2 max-w-md">Ontdek wat je vrienden beleven en plan je volgende avontuur.</p>

          <div class="flex flex-wrap gap-2 mt-4">
            <RouterLink to="/trips/new" class="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded-full hover:bg-gray-100 transition shadow">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              Nieuwe reis plannen
            </RouterLink>
            <RouterLink to="/trips" class="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 backdrop-blur-sm ring-1 ring-white/20 text-white text-sm font-medium rounded-full hover:bg-white/25 transition">
              Verken reizen
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Create Post -->
      <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 transition focus-within:ring-2 focus-within:ring-primary-300">
        <div class="flex gap-3">
          <img
            v-if="auth.profilePhotoUrl"
            :src="auth.profilePhotoUrl"
            class="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
          />
          <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
            {{ auth.displayName?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 space-y-3 min-w-0">
            <textarea
              v-model.trim="newPost.caption"
              rows="2"
              placeholder="Deel je avontuur..."
              class="w-full resize-none bg-transparent text-sm focus:outline-none placeholder:text-gray-400 leading-relaxed"
            />
            <!-- Image previews (multi) -->
            <div v-if="imagePreviews.length > 0" class="grid gap-2" :class="imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'">
              <div v-for="(src, idx) in imagePreviews" :key="idx" class="relative">
                <img :src="src" class="w-full h-32 object-cover rounded-xl"/>
                <button
                  @click="removeImage(idx)"
                  type="button"
                  class="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80 transition"
                >&times;</button>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-2 border-t border-gray-100">
              <label class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>{{ uploading ? 'Uploaden...' : (imageUrls.length > 0 ? `Foto's (${imageUrls.length})` : 'Foto\'s') }}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  class="hidden"
                  @change="onImageSelected"
                />
              </label>

              <RouterLink to="/trips/new" class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                Reis
              </RouterLink>

              <button
                @click="onCreatePost"
                :disabled="creating || !newPost.caption"
                class="ml-auto px-5 py-1.5 text-sm font-semibold text-white bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-default transition shadow-sm"
              >
                {{ creating ? '...' : 'Posten' }}
              </button>
            </div>
            <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs / filters -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ring-1"
          :class="activeTab === tab.id
            ? 'bg-gray-900 text-white ring-gray-900'
            : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-400 hover:text-gray-900'"
        >
          <span>{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <!-- Loading skeletons -->
      <div v-if="loading" class="space-y-5">
        <div v-for="i in 3" :key="i" class="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100 animate-pulse">
          <div class="flex items-center gap-3 p-4">
            <div class="w-10 h-10 rounded-full bg-gray-200"></div>
            <div class="space-y-1.5">
              <div class="h-3 w-24 bg-gray-200 rounded"></div>
              <div class="h-2 w-16 bg-gray-100 rounded"></div>
            </div>
          </div>
          <div class="h-60 bg-gray-100"></div>
          <div class="p-4 space-y-2">
            <div class="h-3 w-20 bg-gray-200 rounded"></div>
            <div class="h-3 w-3/4 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredPosts.length === 0" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
        <div class="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </div>
        <p class="text-gray-500 text-sm font-medium">{{ emptyMessage }}</p>
        <p class="text-xs text-gray-400 mt-1">Volg meer reizigers of deel je eerste avontuur</p>
      </div>

      <!-- Feed -->
      <PostCard
        v-for="post in filteredPosts"
        :key="post.id"
        :post="post"
        :ui="ui[post.id]"
        :isCommentsOpen="ui[post.id]?.open ?? false"
        @like="onLike"
        @toggleComments="toggleComments"
        @addComment="onAddComment"
        @updateComment="onUpdateComment"
        @goProfile="goProfile"
        @postDeleted="onPostDeleted"
      />
    </div>

    <!-- ===== Sidebar ===== -->
    <aside class="hidden lg:block">
      <div class="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1 -mr-1 space-y-5 sidebar-scroll">

        <!-- Trending trips — visual cards -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div class="px-4 pt-4 pb-3 flex items-center justify-between bg-gradient-to-r from-orange-50 to-rose-50">
            <h3 class="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5">
              <span class="text-base">🔥</span> Trending reizen
            </h3>
            <RouterLink to="/trips" class="text-xs font-semibold text-primary-600 hover:text-primary-700">Alle &rarr;</RouterLink>
          </div>
          <div v-if="trendingLoading" class="p-3 space-y-2">
            <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-gray-100 animate-pulse"></div>
          </div>
          <div v-else-if="trendingTrips.length === 0" class="p-4 text-xs text-gray-400">Geen reizen gevonden</div>
          <div v-else class="p-3 space-y-2">
            <RouterLink
              v-for="(trip, idx) in trendingTrips"
              :key="trip.id"
              :to="`/trips/${trip.id}`"
              class="relative block h-20 rounded-xl overflow-hidden group"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                <img v-if="trip.coverImageUrl" :src="trip.coverImageUrl" class="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
              <div class="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-[11px] font-bold text-gray-900 shadow">
                {{ idx + 1 }}
              </div>
              <div class="absolute bottom-1.5 left-2 right-2">
                <p class="text-xs font-bold text-white truncate drop-shadow">{{ trip.title }}</p>
                <p class="text-[10px] text-white/85 truncate">{{ trip.country }} · door {{ trip.displayName }}</p>
              </div>
            </RouterLink>
          </div>
        </div>

        <!-- Suggested travellers — pretty rows -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div class="px-4 pt-4 pb-3 bg-gradient-to-r from-teal-50 to-cyan-50">
            <h3 class="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5">
              <span class="text-base">🌍</span> Reizigers om te volgen
            </h3>
            <p class="text-[11px] text-gray-500 mt-0.5">Op basis van populaire reizen</p>
          </div>
          <div v-if="trendingLoading" class="p-3 space-y-3">
            <div v-for="i in 3" :key="i" class="flex items-center gap-3 animate-pulse">
              <div class="w-10 h-10 rounded-full bg-gray-100 shrink-0"></div>
              <div class="flex-1 space-y-1">
                <div class="h-3 w-1/2 bg-gray-100 rounded"></div>
                <div class="h-2 w-1/3 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
          <div v-else-if="suggestedUsers.length === 0" class="p-4 text-xs text-gray-400">Geen suggesties</div>
          <div v-else class="p-2">
            <RouterLink
              v-for="user in suggestedUsers"
              :key="user.userName"
              :to="`/u/${user.userName}`"
              class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition group"
            >
              <div class="relative shrink-0">
                <img v-if="user.profilePhotoUrl" :src="user.profilePhotoUrl" class="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"/>
                <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-white ring-2 ring-white shadow-sm">
                  {{ user.displayName?.[0]?.toUpperCase() || '?' }}
                </div>
                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white"></span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ user.displayName }}</p>
                <p class="text-[11px] text-gray-400 truncate">@{{ user.userName }}</p>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600 opacity-0 group-hover:opacity-100 transition">Bekijk</span>
            </RouterLink>
          </div>
        </div>

        <!-- Reisstats widget -->
        <div class="rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5 text-white shadow-md relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none"></div>
          <div class="absolute -left-6 -top-6 w-20 h-20 bg-white/5 rounded-full pointer-events-none"></div>
          <div class="relative">
            <p class="text-[10px] font-bold uppercase tracking-wider text-white/80">Globale activiteit</p>
            <h4 class="text-base font-bold mt-1">Op ExploreMe vandaag</h4>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <div>
                <div class="text-2xl font-bold">{{ trendingTrips.length || '—' }}</div>
                <div class="text-[11px] text-white/80">trending reizen</div>
              </div>
              <div>
                <div class="text-2xl font-bold">{{ posts.length || '—' }}</div>
                <div class="text-[11px] text-white/80">nieuwe posts</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tip card -->
        <div class="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-100 p-4 relative overflow-hidden">
          <div class="absolute -right-2 -top-2 text-4xl opacity-20">💡</div>
          <p class="text-xs font-bold text-amber-700 uppercase tracking-wider relative">Pro tip</p>
          <p class="text-sm text-gray-700 mt-2 leading-relaxed relative">Voeg foodspots met sterrenrating toe aan je reizen — zo vinden anderen direct de beste plekken.</p>
        </div>

        <!-- Footer mini -->
        <p class="text-[10px] text-gray-400 text-center px-4">
          ExploreMe · gemaakt met ☕ &amp; ✈️<br/>
          <RouterLink to="/trips" class="hover:text-gray-600">Reizen</RouterLink> ·
          <a href="#" class="hover:text-gray-600">Privacy</a> ·
          <a href="#" class="hover:text-gray-600">Voorwaarden</a>
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as postsApi from '@/api/postsApi'
import * as tripsApi from '@/api/tripsApi'
import * as uploadApi from '@/api/uploadApi'
import PostCard from '@/components/PostCard.vue'

const auth = useAuthStore()
const router = useRouter()

const posts = ref([])
const loading = ref(true)
const creating = ref(false)
const createError = ref('')
const uploading = ref(false)
const imagePreviews = ref([])
const imageUrls = ref([])
const newPost = reactive({ caption: '' })
const ui = reactive({})

const trendingTrips = ref([])
const suggestedUsers = ref([])
const trendingLoading = ref(true)

const activeTab = ref('foryou')
const tabs = [
  { id: 'foryou', label: 'Voor jou', icon: '✨' },
  { id: 'following', label: 'Volgend', icon: '👥' },
  { id: 'trending', label: 'Trending', icon: '🔥' },
]

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return 'Goedemorgen vroeg'
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
})

const filteredPosts = computed(() => {
  if (activeTab.value === 'trending') {
    return [...posts.value].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
  }
  return posts.value
})

const emptyMessage = computed(() => {
  if (activeTab.value === 'following') return 'Geen posts van mensen die je volgt'
  if (activeTab.value === 'trending') return 'Nog geen trending posts'
  return 'Nog geen posts. Deel je eerste avontuur!'
})

function ensureUi(postId) {
  if (!ui[postId]) {
    ui[postId] = {
      open: false,
      loadingComments: false,
      commentsLoaded: false,
      comments: [],
      newComment: '',
      addingComment: false,
      error: ''
    }
  }
}

async function loadFeed() {
  loading.value = true
  try {
    posts.value = await postsApi.getFeed(30)
    for (const p of posts.value) ensureUi(p.id)
  } finally {
    loading.value = false
  }
}

async function loadSidebar() {
  trendingLoading.value = true
  try {
    const trips = await tripsApi.getAllTrips(20)
    trendingTrips.value = trips.slice(0, 4)

    const seen = new Set([auth.userName])
    const unique = []
    for (const t of trips) {
      if (!seen.has(t.userName)) {
        seen.add(t.userName)
        unique.push({
          userName: t.userName,
          displayName: t.displayName,
          profilePhotoUrl: t.profilePhotoUrl
        })
      }
      if (unique.length >= 4) break
    }
    suggestedUsers.value = unique
  } catch (e) {
    console.error('Failed to load sidebar', e)
  } finally {
    trendingLoading.value = false
  }
}

onMounted(() => {
  loadFeed()
  loadSidebar()
})

async function onLike(post) {
  post.likedByMe = !post.likedByMe
  post.likeCount += post.likedByMe ? 1 : -1
  try {
    await postsApi.toggleLike(post.id)
  } catch {
    post.likedByMe = !post.likedByMe
    post.likeCount += post.likedByMe ? 1 : -1
  }
}

async function onImageSelected(e) {
  const files = Array.from(e.target.files || [])
  if (files.length === 0) return
  createError.value = ''
  uploading.value = true
  try {
    for (const file of files) {
      imagePreviews.value.push(URL.createObjectURL(file))
      const url = await uploadApi.uploadImage(file)
      imageUrls.value.push(url)
    }
  } catch (err) {
    createError.value = err?.response?.data?.message || 'Upload mislukt'
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

function removeImage(idx) {
  imagePreviews.value.splice(idx, 1)
  imageUrls.value.splice(idx, 1)
}

async function onCreatePost() {
  createError.value = ''
  creating.value = true
  try {
    const created = await postsApi.createPost({
      caption: newPost.caption,
      imageUrl: imageUrls.value[0] || null,
      imageUrls: imageUrls.value.length ? imageUrls.value : null
    })
    posts.value.unshift(created)
    ensureUi(created.id)
    newPost.caption = ''
    imagePreviews.value = []
    imageUrls.value = []
  } catch (e) {
    createError.value = e?.response?.data?.title || e?.response?.data?.message || 'Posten mislukt'
  } finally {
    creating.value = false
  }
}

async function toggleComments(post) {
  ensureUi(post.id)
  ui[post.id].open = !ui[post.id].open

  if (ui[post.id].open && !ui[post.id].commentsLoaded) {
    ui[post.id].loadingComments = true
    try {
      ui[post.id].comments = await postsApi.getComments(post.id, 50)
      ui[post.id].commentsLoaded = true
    } catch {
      ui[post.id].error = 'Reacties laden mislukt'
    } finally {
      ui[post.id].loadingComments = false
    }
  }
}

async function onAddComment(post) {
  ensureUi(post.id)
  const text = ui[post.id].newComment?.trim()
  if (!text) return

  ui[post.id].addingComment = true
  try {
    const created = await postsApi.addComment(post.id, text)
    ui[post.id].comments.push(created)
    ui[post.id].newComment = ''
    post.commentCount += 1
  } catch {
    ui[post.id].error = 'Reactie plaatsen mislukt'
  } finally {
    ui[post.id].addingComment = false
  }
}

function onUpdateComment(postId, value) {
  ensureUi(postId)
  ui[postId].newComment = value
}

function goProfile(userName) {
  router.push(`/u/${userName}`)
}

function onPostDeleted(postId) {
  const idx = posts.value.findIndex(p => p.id === postId)
  if (idx >= 0) posts.value.splice(idx, 1)
  delete ui[postId]
}
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 3px;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}
</style>
