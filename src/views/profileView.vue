<template>
  <div class="lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6">
    <!-- Spacer left -->
    <div class="hidden lg:block"></div>

    <!-- Main column -->
    <div class="max-w-2xl mx-auto w-full space-y-4">

      <!-- Profile Header -->
      <div v-if="profile" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
        <!-- Banner with absolute action button -->
        <div class="h-32 bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-500 relative rounded-t-2xl overflow-hidden">
          <div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 35%);"></div>

          <!-- Action button positioned in banner top-right -->
          <div class="absolute top-3 right-3 flex items-center gap-2">
            <RouterLink
              v-if="!isOwnProfile && auth.isAuthenticated"
              :to="`/messages/${profile.userName}`"
              class="px-3.5 py-1.5 text-sm font-semibold rounded-full shadow transition bg-white/90 text-gray-900 hover:bg-white inline-flex items-center gap-1.5"
              title="Stuur een bericht"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Bericht
            </RouterLink>
            <button
              v-if="!isOwnProfile && auth.isAuthenticated"
              @click="onToggleFollow"
              :disabled="followLoading"
              class="px-4 py-1.5 text-sm font-semibold rounded-full shadow transition"
              :class="profile.isFollowedByMe
                ? 'bg-white/90 text-gray-900 hover:bg-white'
                : 'bg-gray-900 text-white hover:bg-black'"
            >
              {{ followLoading ? '...' : profile.isFollowedByMe ? 'Volgend ✓' : '+ Volgen' }}
            </button>
            <RouterLink
              v-if="isOwnProfile"
              to="/settings"
              class="p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition shadow text-gray-700"
              title="Instellingen"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </RouterLink>
          </div>
        </div>

        <div class="px-5 pb-5">
          <!-- Avatar overlapping banner -->
          <div class="relative -mt-14 z-10 w-fit">
            <img
              v-if="profile.profilePhotoUrl"
              :src="profile.profilePhotoUrl"
              class="w-28 h-28 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
            <div v-else class="w-28 h-28 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 ring-4 ring-white shadow-lg flex items-center justify-center text-3xl font-bold text-gray-500">
              {{ profile.displayName?.[0]?.toUpperCase() || '?' }}
            </div>
          </div>

          <!-- Name + handle + bio -->
          <div class="mt-3">
            <h1 class="text-xl font-bold text-gray-900">{{ profile.displayName }}</h1>
            <p class="text-sm text-gray-500">@{{ profile.userName }}</p>
            <p v-if="profile.bio" class="text-sm text-gray-700 mt-2 leading-relaxed">{{ profile.bio }}</p>
          </div>

          <!-- Mobile follow button (since banner button is hidden on small screens may be cut) -->
          <button
            v-if="!isOwnProfile && auth.isAuthenticated"
            @click="onToggleFollow"
            :disabled="followLoading"
            class="sm:hidden mt-3 w-full px-4 py-2 text-sm font-semibold rounded-lg transition"
            :class="profile.isFollowedByMe
              ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              : 'bg-gray-900 text-white hover:bg-gray-800'"
          >
            {{ followLoading ? '...' : profile.isFollowedByMe ? 'Volgend ✓' : '+ Volgen' }}
          </button>

          <!-- Stats grid -->
          <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-5">
            <div class="bg-gray-50 rounded-xl p-2.5 text-center">
              <div class="text-base font-bold text-gray-900">{{ profile.postsCount }}</div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wider">Posts</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-2.5 text-center">
              <div class="text-base font-bold text-gray-900">{{ trips.length }}</div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wider">Reizen</div>
            </div>
            <div class="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-2.5 text-center">
              <div class="text-base font-bold text-teal-700">{{ visitedCountries.length }}</div>
              <div class="text-[10px] text-teal-700 uppercase tracking-wider">Landen</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-2.5 text-center">
              <div class="text-base font-bold text-gray-900">{{ profile.followerCount }}</div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wider">Volgers</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-2.5 text-center">
              <div class="text-base font-bold text-gray-900">{{ profile.followingCount }}</div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wider">Volgend</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading profile -->
      <div v-else class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-24 h-24 rounded-full bg-gray-200"></div>
          <div class="space-y-2 flex-1">
            <div class="h-4 w-28 bg-gray-200 rounded"></div>
            <div class="h-3 w-16 bg-gray-100 rounded"></div>
            <div class="h-3 w-40 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Mobile/tablet: horizontale country strip -->
      <div v-if="visitedCountries.length > 0" class="lg:hidden bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-2xl overflow-hidden shadow-md">
        <div class="px-5 pt-4 pb-2 flex items-center justify-between text-white">
          <div>
            <h3 class="text-sm font-bold flex items-center gap-1.5">
              <span>🌍</span> Reisportfolio
            </h3>
            <p class="text-xs text-white/80">{{ visitedCountries.length }} {{ visitedCountries.length === 1 ? 'land' : 'landen' }} ontdekt</p>
          </div>
          <div class="text-3xl font-bold tabular-nums">{{ visitedCountries.length }}</div>
        </div>
        <div class="flex gap-2 overflow-x-auto px-5 pb-4 pt-1 scrollbar-hide">
          <div
            v-for="country in countriesWithMeta"
            :key="country.name"
            class="shrink-0 bg-white/15 backdrop-blur-sm ring-1 ring-white/20 rounded-xl p-3 min-w-[110px] hover:bg-white/25 transition"
          >
            <div class="text-3xl">{{ country.flag }}</div>
            <p class="text-xs font-bold text-white mt-1 truncate">{{ country.name }}</p>
            <p class="text-[10px] text-white/80">{{ country.tripCount }} {{ country.tripCount === 1 ? 'reis' : 'reizen' }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden p-1">
        <button
          class="flex-1 py-2 text-sm font-semibold text-center rounded-xl transition"
          :class="tab === 'posts' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'"
          @click="tab = 'posts'"
        >
          Posts
        </button>
        <button
          class="flex-1 py-2 text-sm font-semibold text-center rounded-xl transition"
          :class="tab === 'trips' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'"
          @click="tab = 'trips'"
        >
          Reizen
        </button>
        <button
          v-if="isOwnProfile"
          class="flex-1 py-2 text-sm font-semibold text-center rounded-xl transition flex items-center justify-center gap-1"
          :class="tab === 'saved' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'"
          @click="tab = 'saved'; loadSaved()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
          Opgeslagen
        </button>
      </div>

      <!-- Posts Tab -->
      <template v-if="tab === 'posts'">
        <div v-if="loadingPosts" class="space-y-4">
          <div v-for="i in 2" :key="i" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden animate-pulse">
            <div class="h-48 bg-gray-100"></div>
            <div class="p-4"><div class="h-3 w-3/4 bg-gray-100 rounded"></div></div>
          </div>
        </div>

        <div v-else-if="posts.length === 0" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
          <p class="text-gray-400 text-sm">Nog geen posts gedeeld.</p>
        </div>

        <PostCard
          v-for="post in posts"
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
      </template>

      <!-- Trips Tab -->
      <template v-else-if="tab === 'trips'">
        <div v-if="loadingTrips" class="space-y-4">
          <div v-for="i in 2" :key="i" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden animate-pulse">
            <div class="h-40 bg-gray-100"></div>
            <div class="p-4"><div class="h-3 w-3/4 bg-gray-100 rounded"></div></div>
          </div>
        </div>

        <div v-else-if="trips.length === 0" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
          <p class="text-gray-400 text-sm">Nog geen reizen gedeeld.</p>
        </div>

        <TripListCard v-for="trip in trips" :key="trip.id" :trip="trip" />
      </template>

      <!-- Saved Tab -->
      <template v-else-if="tab === 'saved'">
        <div v-if="loadingSaved" class="space-y-4">
          <div v-for="i in 2" :key="i" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden animate-pulse">
            <div class="h-40 bg-gray-100"></div>
            <div class="p-4"><div class="h-3 w-3/4 bg-gray-100 rounded"></div></div>
          </div>
        </div>

        <div v-else-if="savedTrips.length === 0" class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
          <svg class="w-12 h-12 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
          <p class="text-gray-400 text-sm">Nog geen opgeslagen reizen.</p>
          <p class="text-xs text-gray-300 mt-1">Tik op het bookmark-icoon op een reis om hier te bewaren</p>
        </div>

        <TripListCard v-for="trip in savedTrips" :key="trip.id" :trip="trip" />
      </template>
    </div>

    <!-- Sidebar (lg+ only) — Bezochte landen -->
    <aside v-if="visitedCountries.length > 0" class="hidden lg:block">
      <div class="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1 -mr-1 space-y-5 sidebar-scroll">

        <!-- World map card -->
        <div class="rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <!-- Header -->
          <div class="px-4 pt-4 pb-3 flex items-end justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-white inline-flex items-center gap-1.5">
                <span class="text-base">🌍</span> Mijn wereldkaart
              </h3>
              <p class="text-[11px] text-white/60 mt-0.5">Plekken waar {{ profile?.displayName?.split(' ')[0] || 'je' }} ooit was</p>
            </div>
            <div class="text-right shrink-0">
              <div class="text-2xl font-bold text-white tabular-nums leading-none">{{ visitedCountries.length }}</div>
              <div class="text-[10px] text-white/60 uppercase tracking-wider">van 195</div>
            </div>
          </div>

          <!-- Map with overlays -->
          <div class="relative">
            <div ref="mapContainer" class="h-72 w-full map-canvas"></div>
            <!-- Subtle vignette overlay -->
            <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%);"></div>

            <!-- Bottom progress bar -->
            <div class="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-transparent pointer-events-none">
              <div class="flex items-center justify-between text-[10px] text-white/80 mb-1.5 font-medium">
                <span>Wereld ontdekt</span>
                <span class="tabular-nums">{{ ((visitedCountries.length / 195) * 100).toFixed(1) }}%</span>
              </div>
              <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700"
                  :style="{ width: `${Math.min(100, (visitedCountries.length / 195) * 100)}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Heatmap legend strip below the map -->
          <div class="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-white/60">Aantal reizen per land</span>
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 text-[10px] text-white/80">
                <span class="block w-3 h-3 rounded-sm" style="background:#5eead4"></span> 1
              </span>
              <span class="inline-flex items-center gap-1 text-[10px] text-white/80">
                <span class="block w-3 h-3 rounded-sm" style="background:#14b8a6"></span> 2
              </span>
              <span class="inline-flex items-center gap-1 text-[10px] text-white/80">
                <span class="block w-3 h-3 rounded-sm" style="background:#0d9488"></span> 3+
              </span>
            </div>
          </div>
        </div>

        <!-- Countries list with flags + trip counts -->
        <div class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div class="px-4 pt-4 pb-2">
            <h3 class="text-sm font-bold text-gray-900">Reizen per land</h3>
          </div>
          <div class="divide-y divide-gray-50">
            <div
              v-for="country in countriesWithMeta"
              :key="country.name"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
            >
              <span class="text-2xl">{{ country.flag }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ country.name }}</p>
                <p class="text-[11px] text-gray-400">{{ country.tripCount }} {{ country.tripCount === 1 ? 'reis' : 'reizen' }} · {{ country.stopCount }} stops</p>
              </div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                {{ country.tripCount }}×
              </div>
            </div>
          </div>
        </div>

        <!-- Reisstats -->
        <div class="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-5 text-white shadow-md relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none"></div>
          <div class="relative">
            <p class="text-[10px] font-bold uppercase tracking-wider text-white/80">Reisportfolio</p>
            <h4 class="text-base font-bold mt-1">{{ profile?.displayName?.split(' ')[0] }}'s avonturen</h4>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <div>
                <div class="text-2xl font-bold">{{ trips.length }}</div>
                <div class="text-[11px] text-white/80">reizen</div>
              </div>
              <div>
                <div class="text-2xl font-bold">{{ totalStops }}</div>
                <div class="text-[11px] text-white/80">stops</div>
              </div>
              <div>
                <div class="text-2xl font-bold">{{ visitedCountries.length }}</div>
                <div class="text-[11px] text-white/80">landen</div>
              </div>
              <div>
                <div class="text-2xl font-bold">{{ totalDays }}</div>
                <div class="text-[11px] text-white/80">reisdagen</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Empty sidebar placeholder when no trips -->
    <aside v-else class="hidden lg:block"></aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as usersApi from '@/api/userApi'
import * as postsApi from '@/api/postsApi'
import * as followApi from '@/api/followApi'
import * as tripsApi from '@/api/tripsApi'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PostCard from '@/components/PostCard.vue'
import TripListCard from '@/components/TripListCard.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const username = ref(route.params.username)

const profile = ref(null)
const posts = ref([])
const loadingPosts = ref(true)
const trips = ref([])
const loadingTrips = ref(false)
const savedTrips = ref([])
const loadingSaved = ref(false)
const savedLoaded = ref(false)
const tab = ref('posts')
const followLoading = ref(false)

const mapContainer = ref(null)
let map = null

const ui = reactive({})

const isOwnProfile = computed(() => auth.userName === username.value)

// Country flag emoji map (covers seeded countries; falls back to globe)
const COUNTRY_FLAGS = {
  'Griekenland': '🇬🇷',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
  'Indonesië': '🇮🇩',
  'Japan': '🇯🇵',
  'Frankrijk': '🇫🇷',
  'Zwitserland': '🇨🇭',
  'Portugal': '🇵🇹',
  'Marokko': '🇲🇦',
  'IJsland': '🇮🇸',
  'Chili': '🇨🇱',
  'Argentinië': '🇦🇷',
  'Italië': '🇮🇹',
  'Schotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Mexico': '🇲🇽',
  'Spanje': '🇪🇸',
  'Nederland': '🇳🇱',
  'België': '🇧🇪',
  'Duitsland': '🇩🇪',
  'Verenigde Staten': '🇺🇸',
  'Canada': '🇨🇦',
  'Brazilië': '🇧🇷',
  'Australië': '🇦🇺',
  'Nieuw-Zeeland': '🇳🇿',
  'Egypte': '🇪🇬',
  'Zuid-Afrika': '🇿🇦',
  'India': '🇮🇳',
  'Cambodja': '🇰🇭',
  'Filipijnen': '🇵🇭',
  'Maleisië': '🇲🇾',
  'Singapore': '🇸🇬',
  'Verenigd Koninkrijk': '🇬🇧',
  'Ierland': '🇮🇪',
  'Noorwegen': '🇳🇴',
  'Zweden': '🇸🇪',
  'Finland': '🇫🇮',
  'Denemarken': '🇩🇰',
  'Polen': '🇵🇱',
  'Tsjechië': '🇨🇿',
  'Oostenrijk': '🇦🇹',
  'Hongarije': '🇭🇺',
  'Kroatië': '🇭🇷',
  'Slovenië': '🇸🇮',
  'Turkije': '🇹🇷',
  'Cuba': '🇨🇺',
  'Peru': '🇵🇪',
  'Colombia': '🇨🇴',
  'Costa Rica': '🇨🇷',
  'Georgië': '🇬🇪'
}

function flagFor(country) {
  if (!country) return '🌍'
  // Some trips have multiple countries comma-separated; use the first one
  const first = country.split(',')[0].trim()
  return COUNTRY_FLAGS[first] || '🌍'
}

const visitedCountries = computed(() => {
  const set = new Set()
  for (const t of trips.value) {
    (t.country || '').split(',').forEach(c => {
      const trimmed = c.trim()
      if (trimmed) set.add(trimmed)
    })
  }
  return [...set].sort()
})

const countriesWithMeta = computed(() => {
  const map = {}
  for (const t of trips.value) {
    (t.country || '').split(',').forEach(c => {
      const name = c.trim()
      if (!name) return
      if (!map[name]) map[name] = { name, flag: flagFor(name), tripCount: 0, stopCount: 0 }
      map[name].tripCount++
      map[name].stopCount += (t.stopCount || 0)
    })
  }
  return Object.values(map).sort((a, b) => b.tripCount - a.tripCount || a.name.localeCompare(b.name))
})

const totalStops = computed(() => trips.value.reduce((s, t) => s + (t.stopCount || 0), 0))
const totalDays = computed(() => {
  return trips.value.reduce((sum, t) => {
    const ms = new Date(t.endDate) - new Date(t.startDate)
    return sum + Math.max(1, Math.ceil(ms / 86400000))
  }, 0)
})

function ensureUi(postId) {
  if (!ui[postId]) {
    ui[postId] = {
      open: false, loadingComments: false, commentsLoaded: false,
      comments: [], newComment: '', addingComment: false, error: ''
    }
  }
}

async function load() {
  username.value = route.params.username
  profile.value = null
  posts.value = []
  trips.value = []
  savedTrips.value = []
  savedLoaded.value = false
  loadingPosts.value = true
  loadingTrips.value = true
  tab.value = 'posts'
  if (map) { map.remove(); map = null }

  profile.value = await usersApi.getProfile(username.value)

  const [postsResult, tripsResult] = await Promise.allSettled([
    usersApi.getUserPosts(username.value, 20),
    tripsApi.getUserTrips(username.value, 50)
  ])

  if (postsResult.status === 'fulfilled') {
    posts.value = postsResult.value
    for (const p of posts.value) ensureUi(p.id)
  }
  loadingPosts.value = false

  if (tripsResult.status === 'fulfilled') {
    trips.value = tripsResult.value
  }
  loadingTrips.value = false

  await nextTick()
  initMap()
}

async function loadSaved() {
  if (savedLoaded.value || !isOwnProfile.value) return
  loadingSaved.value = true
  try {
    savedTrips.value = await tripsApi.getBookmarkedTrips(50)
    savedLoaded.value = true
  } catch (e) {
    console.error('Failed to load saved trips', e)
  } finally {
    loadingSaved.value = false
  }
}

// Map Dutch country names to the English names used in the GeoJSON (datahub geo-countries)
const COUNTRY_NL_TO_EN = {
  'Griekenland': 'Greece',
  'Thailand': 'Thailand',
  'Vietnam': 'Vietnam',
  'Indonesië': 'Indonesia',
  'Japan': 'Japan',
  'Frankrijk': 'France',
  'Zwitserland': 'Switzerland',
  'Portugal': 'Portugal',
  'Marokko': 'Morocco',
  'IJsland': 'Iceland',
  'Chili': 'Chile',
  'Argentinië': 'Argentina',
  'Italië': 'Italy',
  'Schotland': 'United Kingdom',
  'Mexico': 'Mexico',
  'Spanje': 'Spain',
  'Nederland': 'Netherlands',
  'België': 'Belgium',
  'Duitsland': 'Germany',
  'Verenigd Koninkrijk': 'United Kingdom',
  'Engeland': 'United Kingdom',
  'Wales': 'United Kingdom',
  'Verenigde Staten': 'United States of America',
  'Canada': 'Canada',
  'Brazilië': 'Brazil',
  'Australië': 'Australia',
  'Nieuw-Zeeland': 'New Zealand',
  'Egypte': 'Egypt',
  'Zuid-Afrika': 'South Africa',
  'India': 'India',
  'Cambodja': 'Cambodia',
  'Filipijnen': 'Philippines',
  'Maleisië': 'Malaysia',
  'Singapore': 'Singapore',
  'Ierland': 'Ireland',
  'Noorwegen': 'Norway',
  'Zweden': 'Sweden',
  'Finland': 'Finland',
  'Denemarken': 'Denmark',
  'Polen': 'Poland',
  'Tsjechië': 'Czech Republic',
  'Oostenrijk': 'Austria',
  'Hongarije': 'Hungary',
  'Kroatië': 'Croatia',
  'Slovenië': 'Slovenia',
  'Turkije': 'Turkey',
  'Cuba': 'Cuba',
  'Peru': 'Peru',
  'Colombia': 'Colombia',
  'Costa Rica': 'Costa Rica',
  'Georgië': 'Georgia',
  'China': 'China',
  'Rusland': 'Russia',
  'Zuid-Korea': 'South Korea',
  'Noord-Korea': 'North Korea',
  'Israël': 'Israel',
  'Jordanië': 'Jordan',
  'Verenigde Arabische Emiraten': 'United Arab Emirates'
}

// Cache the GeoJSON across map renders / users
let countriesGeoJsonCache = null
let countriesLayer = null

async function loadCountriesGeoJson() {
  if (countriesGeoJsonCache) return countriesGeoJsonCache
  const res = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
  if (!res.ok) throw new Error('Geo-data laden mislukt')
  countriesGeoJsonCache = await res.json()
  return countriesGeoJsonCache
}

function visitedCountriesEnglish() {
  const set = new Set()
  for (const nl of visitedCountries.value) {
    const en = COUNTRY_NL_TO_EN[nl]
    if (en) set.add(en)
  }
  return set
}

function visitedTripCountByEnglish() {
  const map = {}
  for (const t of trips.value) {
    (t.country || '').split(',').forEach(c => {
      const en = COUNTRY_NL_TO_EN[c.trim()]
      if (!en) return
      map[en] = (map[en] || 0) + 1
    })
  }
  return map
}

function getCountryName(feature) {
  const p = feature?.properties || {}
  return p.ADMIN || p.admin || p.NAME || p.name || p.NAME_EN || p.SOVEREIGNT || p.sovereignt || ''
}

function styleCountry(feature, tripCounts) {
  const name = getCountryName(feature)
  const count = tripCounts[name] || 0

  if (count === 0) {
    return {
      fillColor: '#1e293b',
      fillOpacity: 0.85,
      color: '#334155',
      weight: 0.4
    }
  }

  // Tier visited countries by trip count (heatmap effect)
  let fillColor, strokeColor
  if (count >= 3) {
    fillColor = '#0d9488'   // deep teal
    strokeColor = '#14b8a6'
  } else if (count === 2) {
    fillColor = '#14b8a6'   // mid teal
    strokeColor = '#2dd4bf'
  } else {
    fillColor = '#5eead4'   // light teal
    strokeColor = '#99f6e4'
  }

  return {
    fillColor,
    fillOpacity: 0.92,
    color: strokeColor,
    weight: 1.2
  }
}

function renderCountriesLayer() {
  if (!map || !countriesGeoJsonCache) return
  if (countriesLayer) {
    map.removeLayer(countriesLayer)
    countriesLayer = null
  }
  const tripCounts = visitedTripCountByEnglish()

  countriesLayer = L.geoJSON(countriesGeoJsonCache, {
    interactive: true,
    bubblingMouseEvents: false,
    style: (feature) => styleCountry(feature, tripCounts),
    onEachFeature: (feature, layer) => {
      const name = getCountryName(feature)
      if (!name) return
      const count = tripCounts[name] || 0
      const label = count > 0
        ? `<div style="font-family:system-ui;line-height:1.3;">
            <strong style="color:#0f172a;font-size:12px">${name}</strong>
            <div style="font-size:11px;color:#0d9488;margin-top:2px;font-weight:600">
              ✈️ ${count} ${count === 1 ? 'reis' : 'reizen'}
            </div>
          </div>`
        : `<div style="font-family:system-ui;line-height:1.3;">
            <strong style="color:#0f172a;font-size:12px">${name}</strong>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">
              Nog niet bezocht
            </div>
          </div>`

      layer.bindTooltip(label, {
        sticky: true,
        direction: 'top',
        opacity: 1,
        className: 'country-tooltip'
      })

      layer.on({
        mouseover: (e) => {
          const target = e.target
          if (count > 0) {
            target.setStyle({ fillOpacity: 1, weight: 2, color: '#fef3c7' })
          } else {
            target.setStyle({ fillOpacity: 1, weight: 1, color: '#64748b', fillColor: '#475569' })
          }
        },
        mouseout: (e) => countriesLayer.resetStyle(e.target)
      })
    }
  }).addTo(map)
}

async function initMap() {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    scrollWheelZoom: false,
    zoomControl: false,
    attributionControl: false,
    minZoom: 1,
    maxZoom: 5,
    worldCopyJump: false,
    zoomSnap: 0.25,
    dragging: true,
    touchZoom: true,
    boxZoom: false,
    doubleClickZoom: false,
    keyboard: false
  })
  map.getContainer().style.background = 'transparent'
  map.setView([25, 10], 1.3)

  try {
    await loadCountriesGeoJson()
    renderCountriesLayer()
  } catch (e) {
    console.error('Failed to load world geo data', e)
  }

  setTimeout(() => map && map.invalidateSize(), 100)
}

onMounted(load)
onUnmounted(() => {
  if (map) { map.remove(); map = null }
  countriesLayer = null
})
watch(() => route.params.username, load)

// Re-color the map whenever the user's visited countries change (e.g. after adding a new trip)
watch(visitedCountries, () => {
  if (map && countriesGeoJsonCache) renderCountriesLayer()
})

async function onToggleFollow() {
  if (!profile.value) return
  followLoading.value = true
  try {
    const status = await followApi.toggleFollow(username.value)
    profile.value.isFollowedByMe = status.isFollowing
    profile.value.followerCount = status.followerCount
    profile.value.followingCount = status.followingCount
  } catch { /* ignore */ }
  finally { followLoading.value = false }
}

async function onLike(post) {
  post.likedByMe = !post.likedByMe
  post.likeCount += post.likedByMe ? 1 : -1
  try { await postsApi.toggleLike(post.id) } catch {
    post.likedByMe = !post.likedByMe
    post.likeCount += post.likedByMe ? 1 : -1
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
    } catch { ui[post.id].error = 'Laden mislukt' }
    finally { ui[post.id].loadingComments = false }
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
  } catch { ui[post.id].error = 'Plaatsen mislukt' }
  finally { ui[post.id].addingComment = false }
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
  if (profile.value && typeof profile.value.postsCount === 'number') {
    profile.value.postsCount = Math.max(0, profile.value.postsCount - 1)
  }
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  scrollbar-width: none;
}

/* World map: deep ocean with subtle grid pattern */
.map-canvas {
  background-color: #0f172a;
  background-image:
    radial-gradient(ellipse at top, rgba(30, 64, 175, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(8, 145, 178, 0.15) 0%, transparent 50%),
    radial-gradient(circle at center, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 16px 16px;
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

<style>
/* Unscoped: Leaflet renders tooltips into its own panes which scoped styles can't always reach */
.leaflet-tooltip.country-tooltip {
  background: rgba(255, 255, 255, 0.98);
  border: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  color: #0f172a;
  white-space: nowrap;
}
.leaflet-tooltip-top.country-tooltip:before {
  border-top-color: rgba(255, 255, 255, 0.98);
}
.leaflet-tooltip-bottom.country-tooltip:before {
  border-bottom-color: rgba(255, 255, 255, 0.98);
}
</style>
