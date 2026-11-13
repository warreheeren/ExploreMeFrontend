<template>
  <div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div class="min-w-0 space-y-5">
      <!-- Laden -->
      <div v-if="loadingProfile" class="card overflow-hidden" aria-busy="true">
        <div class="skeleton h-40 rounded-none" />
        <div class="space-y-3 p-5"><div class="skeleton -mt-14 h-24 w-24 rounded-full" /><div class="skeleton h-5 w-40" /><div class="skeleton h-3 w-64" /></div>
      </div>

      <EmptyState v-else-if="!profile" icon="user" :title="$t('profile.notFoundTitle')" :text="$t('profile.notFoundText')">
        <RouterLink to="/" class="btn btn-secondary btn-sm">{{ $t('profile.toTimeline') }}</RouterLink>
      </EmptyState>

      <template v-else>
        <!-- Kop -->
        <section class="card overflow-hidden">
          <div class="relative h-36 bg-gray-100 sm:h-48">
            <CoverImage :src="profile.coverPhotoUrl" :seed="profile.userName" eager />
          </div>
          <div class="px-5 pb-5">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <Avatar :src="profile.profilePhotoUrl" :name="profile.displayName" size="2xl" ring class="-mt-14 sm:-mt-16" />
              <div class="flex flex-wrap items-center gap-2 pt-3">
                <template v-if="isOwnProfile">
                  <RouterLink to="/settings" class="btn btn-secondary btn-sm"><Icon name="edit" :size="14" /> {{ $t('profile.edit') }}</RouterLink>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="profile.isFollowedByMe || profile.followRequestedByMe ? 'btn-secondary' : 'btn-dark'"
                    :disabled="followBusy"
                    :aria-pressed="profile.isFollowedByMe"
                    @click="toggleFollow"
                  >
                    <Icon :name="profile.isFollowedByMe ? 'check' : profile.followRequestedByMe ? 'clock' : 'plus'" :size="14" />
                    {{ profile.isFollowedByMe ? $t('profile.followingState') : profile.followRequestedByMe ? $t('profile.requested') : profile.followsMe ? $t('profile.followBack') : $t('profile.follow') }}
                  </button>
                  <RouterLink :to="`/messages/${profile.userName}`" class="btn btn-secondary btn-sm"><Icon name="chat" :size="14" /> {{ $t('profile.message') }}</RouterLink>
                  <div v-click-outside="() => (menuOpen = false)" class="relative">
                    <button type="button" class="btn-icon btn-icon-sm border border-line-strong" :aria-label="$t('common.more')" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><Icon name="more" :size="16" /></button>
                    <div v-if="menuOpen" class="menu right-0 top-full mt-2" role="menu">
                      <button type="button" class="menu-item" role="menuitem" @click="copyProfileLink"><Icon name="link" :size="16" /> {{ $t('profile.copyLink') }}</button>
                      <button type="button" class="menu-item" role="menuitem" @click="openReport"><Icon name="flag" :size="16" /> {{ $t('profile.report') }}</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <h1 class="mt-3 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink">
              {{ profile.displayName }}
              <Icon v-if="profile.isPrivate" name="lock" :size="18" class="text-muted" :aria-label="$t('profile.privateAccount')" />
            </h1>
            <p class="text-sm font-semibold text-muted">
              @{{ profile.userName }}<template v-if="profile.createdAt"> · {{ $t('profile.memberSince', { date: memberSince }) }}</template>
              <template v-if="profile.followsMe && !isOwnProfile"> · <span class="text-accent-700">{{ $t('profile.followsYou') }}</span></template>
            </p>
            <p v-if="profile.bio" class="mt-2 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-body">{{ profile.bio }}</p>

            <div class="mt-5 grid grid-cols-5 divide-x divide-line rounded-2xl border border-line" role="group" :aria-label="$t('profile.travelStats')">
              <component
                :is="s.action ? 'button' : 'div'"
                v-for="s in stats"
                :key="s.key"
                :type="s.action ? 'button' : undefined"
                class="flex flex-col-reverse px-2 py-3 text-center transition"
                :class="s.action ? 'hover:bg-gray-50' : ''"
                @click="s.action?.()"
              >
                <span class="text-[11px] font-semibold text-muted">{{ s.label }}</span>
                <span class="text-lg font-extrabold tabular-nums text-ink">{{ s.value }}</span>
              </component>
            </div>
          </div>
        </section>

        <!-- Privé-account -->
        <section v-if="!profile.canViewContent" class="card card-pad flex flex-col items-center gap-2 py-10 text-center">
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-muted"><Icon name="lock" :size="22" /></span>
          <p class="text-sm font-extrabold text-ink">{{ $t('profile.privateTitle') }}</p>
          <p class="max-w-sm text-sm text-muted">{{ profile.followRequestedByMe ? $t('profile.privateRequested') : $t('profile.privateText', { name: profile.displayName }) }}</p>
        </section>

        <template v-else>
          <!-- Landen (mobiel) -->
          <div v-if="countries.length" class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 lg:hidden" role="region" tabindex="0" :aria-label="$t('profile.countriesVisited')">
            <span v-for="c in countries" :key="c.name" class="chip shrink-0 border border-line bg-surface text-ink">
              <span class="text-base leading-none">{{ c.flag }}</span> {{ c.name }} <span class="text-muted">{{ c.tripCount }}</span>
            </span>
          </div>

          <!-- Badges, wereldkaart en challenges (mobiel) -->
          <BadgesPanel class="lg:hidden" :user-name="profile.userName" />
          <WorldMap class="lg:hidden" :user-name="profile.userName" :display-name="profile.displayName" :is-own="isOwnProfile" @loaded="onCountriesLoaded" />
          <CompletedChallenges class="lg:hidden" :user-name="profile.userName" :is-own="isOwnProfile" />

          <!-- Tabs -->
          <nav class="tabs" role="tablist" :aria-label="$t('profile.contentTabs')">
            <button v-for="t in tabs" :key="t.id" type="button" role="tab" class="tab" :class="tab === t.id ? 'tab-active' : ''" :aria-selected="tab === t.id" @click="setTab(t.id)">
              <Icon :name="t.icon" :size="16" /> {{ t.label }}
            </button>
          </nav>

          <!-- Posts -->
          <div v-if="tab === 'posts'" class="space-y-5">
            <div v-if="postsLoading" class="space-y-4"><div v-for="i in 2" :key="i" class="skeleton h-64 rounded-2xl" /></div>
            <EmptyState v-else-if="!posts.length" icon="image" :title="isOwnProfile ? $t('profile.noPostsOwn') : $t('profile.noPosts')" :text="isOwnProfile ? $t('profile.noPostsOwnText') : ''">
              <RouterLink v-if="isOwnProfile" to="/" class="btn btn-secondary btn-sm">{{ $t('profile.toTimeline') }}</RouterLink>
            </EmptyState>
            <PostCard v-for="p in posts" :key="p.id" :post="p" @deleted="onPostDeleted" />
            <div v-if="posts.length" ref="postsSentinel" class="py-3 text-center text-sm font-semibold text-muted">
              <span v-if="postsLoadingMore" class="inline-flex items-center gap-2"><Spinner /> {{ $t('common.loading') }}</span>
              <span v-else-if="postsDone && posts.length > 5">{{ $t('common.endOfList') }}</span>
            </div>
          </div>

          <!-- Lijsten -->
          <div v-else-if="tab === 'lijsten'">
            <div v-if="listsLoading" class="grid grid-cols-1 gap-5 sm:grid-cols-2"><div v-for="i in 2" :key="i" class="skeleton h-56 rounded-2xl" /></div>
            <EmptyState v-else-if="!lists.length" icon="list" :title="isOwnProfile ? $t('profile.noListsOwn') : $t('profile.noLists')" :text="isOwnProfile ? $t('profile.noListsOwnText') : ''">
              <RouterLink v-if="isOwnProfile" to="/lists" class="btn btn-secondary btn-sm">{{ $t('nav.lists') }}</RouterLink>
            </EmptyState>
            <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ListCard v-for="l in lists" :key="l.id" :list="l" />
            </div>
          </div>

          <!-- Reizen / opgeslagen / samen -->
          <template v-else>
            <div v-if="tabLoading" class="grid grid-cols-1 gap-5 sm:grid-cols-2"><div v-for="i in 2" :key="i" class="skeleton h-72 rounded-2xl" /></div>
            <EmptyState v-else-if="!tabTrips.length" :icon="emptyCopy.icon" :title="emptyCopy.title" :text="emptyCopy.text">
              <RouterLink v-if="tab === 'reizen' && isOwnProfile" to="/trips/new" class="btn btn-primary btn-sm">{{ $t('profile.planTrip') }}</RouterLink>
            </EmptyState>
            <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TripCard v-for="t in tabTrips" :key="t.id" :trip="t" :show-author="tab !== 'reizen'" show-countdown />
            </div>
          </template>
        </template>
      </template>
    </div>

    <!-- Zijbalk -->
    <aside v-if="profile && profile.canViewContent" class="hidden lg:block" :aria-label="$t('profile.travelStats')">
      <div class="sticky top-24 space-y-5">
        <WorldMap :user-name="profile.userName" :display-name="profile.displayName" :is-own="isOwnProfile" @loaded="onCountriesLoaded" />
        <BadgesPanel :user-name="profile.userName" />
        <CompletedChallenges :user-name="profile.userName" :is-own="isOwnProfile" />
        <section v-if="countries.length" class="card">
          <h3 class="card-title px-4 pb-2 pt-4">{{ $t('profile.tripsPerCountry') }}</h3>
          <ul class="divide-y divide-line">
            <li v-for="c in countries" :key="c.name">
              <RouterLink :to="{ path: '/trips', query: { country: c.name } }" class="flex items-center gap-3 px-4 py-2.5 transition hover:bg-gray-50">
                <span class="text-xl leading-none">{{ c.flag }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-bold text-ink">{{ c.name }}</span>
                  <span class="block text-xs text-muted">{{ $t('profile.stops', { n: c.stopCount }) }}</span>
                </span>
                <span class="chip chip-accent h-6">{{ c.tripCount }}×</span>
              </RouterLink>
            </li>
          </ul>
        </section>
      </div>
    </aside>

    <ReportDialog v-if="profile && !isOwnProfile" v-model="reportOpen" target-type="user" :target-id="profile.id" />
    <FollowListModal v-if="profile" v-model="followListOpen" :user-name="profile.userName" :mode="followListMode" :is-own="isOwnProfile" @changed="reloadProfile" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import PostCard from '@/components/PostCard.vue'
import TripCard from '@/components/TripCard.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import ListCard from '@/components/lists/ListCard.vue'
import WorldMap from '@/components/profile/WorldMap.vue'
import BadgesPanel from '@/components/profile/BadgesPanel.vue'
import CompletedChallenges from '@/components/profile/CompletedChallenges.vue'
import FollowListModal from '@/components/profile/FollowListModal.vue'
import * as userApi from '@/api/userApi'
import * as followApi from '@/api/followApi'
import * as tripsApi from '@/api/tripsApi'
import * as listsApi from '@/api/listsApi'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { localeTag } from '@/i18n'
import { errorMessage } from '@/utils/errors'
import { publicWebOrigin } from '@/services/native'
import { flagFor, splitCountries } from '@/utils/countries'
import { parseTimestamp } from '@/utils/date'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const profile = ref(null)
const loadingProfile = ref(true)
const trips = ref([])
const loadingTrips = ref(true)
const saved = ref(null)
const collab = ref(null)
const lists = ref([])
const listsLoading = ref(false)
let listsLoadedFor = null
const tabLoading = ref(false)
const followBusy = ref(false)
const menuOpen = ref(false)
const reportOpen = ref(false)
const followListOpen = ref(false)
const followListMode = ref('followers')

const username = computed(() => route.params.username)
const isOwnProfile = computed(() => auth.userName === username.value)

// Posts met oneindig scrollen.
const postFeed = useInfiniteList((take, before) => userApi.getUserPosts(username.value, take, before), { pageSize: 10 })
const { items: posts, loading: postsLoading, loadingMore: postsLoadingMore, done: postsDone, sentinel: postsSentinel } = postFeed

const tabs = computed(() => [
  { id: 'posts', label: t('profile.tabs.posts'), icon: 'image' },
  { id: 'reizen', label: t('profile.tabs.trips'), icon: 'map' },
  { id: 'lijsten', label: t('profile.tabs.lists'), icon: 'list' },
  ...(isOwnProfile.value ? [{ id: 'opgeslagen', label: t('profile.tabs.saved'), icon: 'bookmark' }, { id: 'samen', label: t('profile.tabs.together'), icon: 'users' }] : []),
])

const tab = computed(() => {
  const requested = typeof route.query.tab === 'string' ? route.query.tab : 'posts'
  return tabs.value.some((x) => x.id === requested) ? requested : 'posts'
})

function setTab(id) {
  router.replace({ query: id === 'posts' ? {} : { tab: id } })
}

const tabTrips = computed(() => {
  if (tab.value === 'reizen') return trips.value
  if (tab.value === 'opgeslagen') return saved.value || []
  if (tab.value === 'samen') return collab.value || []
  return []
})

const emptyCopy = computed(() => ({
  reizen: { icon: 'map', title: isOwnProfile.value ? t('profile.noTripsOwn') : t('profile.noTrips'), text: isOwnProfile.value ? t('profile.noTripsOwnText') : '' },
  opgeslagen: { icon: 'bookmark', title: t('profile.noSaved'), text: t('profile.noSavedText') },
  samen: { icon: 'users', title: t('profile.noTogether'), text: t('profile.noTogetherText') },
}[tab.value] || { icon: 'info', title: '' }))

const countries = computed(() => {
  const map = {}
  for (const tr of trips.value) {
    for (const name of splitCountries(tr.country)) {
      map[name] ??= { name, flag: flagFor(name) || '🌍', tripCount: 0, stopCount: 0 }
      map[name].tripCount++
      map[name].stopCount += tr.stopCount || 0
    }
  }
  return Object.values(map).sort((a, b) => b.tripCount - a.tripCount || a.name.localeCompare(b.name, localeTag()))
})

// Landenstatistiek van de wereldkaart (één bron van waarheid voor het "Landen"-getal).
const countryStats = ref(null)
function onCountriesLoaded(data) {
  countryStats.value = data
}
watch(() => route.params.username, () => { countryStats.value = null })

function openFollowList(mode) {
  if (!profile.value?.canViewContent) return
  followListMode.value = mode
  followListOpen.value = true
}

const stats = computed(() => [
  { key: 'posts', label: t('profile.stats.posts'), value: profile.value?.postsCount ?? 0 },
  { key: 'trips', label: t('profile.stats.trips'), value: loadingTrips.value ? profile.value?.tripsCount ?? 0 : (profile.value?.canViewContent ? trips.value.length : profile.value?.tripsCount ?? 0) },
  // Zelfde definitie als badges en wereldkaart (server): reizen waaraan je deelneemt + zelf gemarkeerde landen.
  { key: 'countries', label: t('profile.stats.countries'), value: countryStats.value?.visitedCount ?? countries.value.length },
  { key: 'followers', label: t('profile.stats.followers'), value: profile.value?.followerCount ?? 0, action: profile.value?.canViewContent ? () => openFollowList('followers') : null },
  { key: 'following', label: t('profile.stats.following'), value: profile.value?.followingCount ?? 0, action: profile.value?.canViewContent ? () => openFollowList('following') : null },
])

const memberSince = computed(() => parseTimestamp(profile.value?.createdAt)?.toLocaleDateString(localeTag(), { month: 'long', year: 'numeric' }) || '')

async function reloadProfile() {
  try {
    profile.value = await userApi.getProfile(username.value)
  } catch { /* behoud vorige staat */ }
}

async function load() {
  loadingProfile.value = true
  loadingTrips.value = true
  saved.value = null
  collab.value = null
  listsLoadedFor = null
  lists.value = []
  try {
    profile.value = await userApi.getProfile(username.value)
    document.title = `${profile.value.displayName} · ExploreMe`
  } catch {
    profile.value = null
  } finally {
    loadingProfile.value = false
  }
  if (!profile.value) return
  if (!profile.value.canViewContent) {
    trips.value = []
    loadingTrips.value = false
    return
  }

  postFeed.reload()
  try {
    trips.value = await tripsApi.getUserTrips(username.value, 100)
  } catch {
    trips.value = []
  }
  loadingTrips.value = false
  loadTabData()
}

async function loadTabData() {
  if (tab.value === 'opgeslagen' && saved.value === null) {
    tabLoading.value = true
    try { saved.value = await tripsApi.getBookmarkedTrips(100) } catch { saved.value = [] } finally { tabLoading.value = false }
  } else if (tab.value === 'samen' && collab.value === null) {
    tabLoading.value = true
    try { collab.value = await collaboratorsApi.getCollaboratingTrips(100) } catch { collab.value = [] } finally { tabLoading.value = false }
  } else if (tab.value === 'lijsten' && listsLoadedFor !== username.value) {
    listsLoading.value = true
    try {
      lists.value = await listsApi.getUserLists(username.value)
      listsLoadedFor = username.value
    } catch { lists.value = [] } finally { listsLoading.value = false }
  } else if (tab.value === 'reizen') {
    tabLoading.value = loadingTrips.value
  }
}

async function toggleFollow() {
  followBusy.value = true
  const wasVisible = profile.value.canViewContent
  try {
    const status = await followApi.toggleFollow(username.value)
    profile.value.isFollowedByMe = status.isFollowing
    profile.value.followRequestedByMe = !!status.isRequested
    profile.value.followerCount = status.followerCount
    profile.value.followingCount = status.followingCount
    if (status.isRequested) toast.success(t('profile.requestSent'))
    // Ontvolgen van een privé-account verbergt de content weer; volgen maakt ze zichtbaar.
    const visibleNow = !profile.value.isPrivate || status.isFollowing
    if (visibleNow !== wasVisible) load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    followBusy.value = false
  }
}

async function copyProfileLink() {
  menuOpen.value = false
  try {
    await navigator.clipboard.writeText(`${publicWebOrigin()}/u/${username.value}`)
    toast.success(t('common.copied'))
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}

function openReport() {
  menuOpen.value = false
  reportOpen.value = true
}

function onPostDeleted(id) {
  posts.value = posts.value.filter((p) => p.id !== id)
  if (profile.value) profile.value.postsCount = Math.max(0, profile.value.postsCount - 1)
}

watch(() => route.params.username, (u, prev) => { if (u && u !== prev) load() })
watch(tab, loadTabData)

onMounted(() => {
  load()
  window.addEventListener('app-refresh', load)
})
onBeforeUnmount(() => window.removeEventListener('app-refresh', load))
</script>
