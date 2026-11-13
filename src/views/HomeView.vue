<template>
  <div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
    <!-- Feed -->
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header class="hidden sm:block">
        <p class="eyebrow-accent">{{ greeting }}</p>
        <h1 class="page-title mt-0.5">{{ $t('home.hello', { name: firstName }) }}</h1>
      </header>

      <!-- Lopende reis → Vandaag-modus -->
      <ActiveTripBanner ref="activeRef" />

      <!-- Stories van wie je volgt + "vandaag x jaar geleden" -->
      <StoriesBar v-if="features.stories" />

      <PostComposer ref="composerRef" compact @created="onCreated" />

      <MemoriesCard />

      <!-- Mobiel: aankomende reizen bovenaan -->
      <UpcomingTrips class="lg:hidden" :take="2" />

      <div v-if="loading" class="space-y-5" aria-busy="true">
        <div v-for="i in 3" :key="i" class="card overflow-hidden">
          <div class="flex items-center gap-3 p-4">
            <div class="skeleton h-10 w-10 rounded-full" />
            <div class="flex-1 space-y-1.5"><div class="skeleton h-3 w-32" /><div class="skeleton h-3 w-20" /></div>
          </div>
          <div class="skeleton h-64 rounded-none" />
          <div class="space-y-2 p-4"><div class="skeleton h-3 w-3/4" /><div class="skeleton h-3 w-1/2" /></div>
        </div>
      </div>

      <EmptyState v-else-if="error" icon="alert" :title="$t('home.feedError')" :text="error">
        <button type="button" class="btn btn-secondary btn-sm" @click="loadFeed">{{ $t('common.retry') }}</button>
      </EmptyState>

      <template v-else-if="!posts.length">
        <EmptyState icon="users" :title="$t('home.emptyTitle')" :text="$t('home.emptyText')" />
        <SuggestedTravellers class="lg:hidden" @followed="loadFeed" />
      </template>

      <PostCard v-for="post in posts" :key="post.id" :post="post" @deleted="onDeleted" />

      <!-- Oneindig scrollen -->
      <div v-if="posts.length" ref="sentinel" class="py-4 text-center text-sm font-semibold text-muted">
        <span v-if="loadingMore" class="inline-flex items-center gap-2"><Spinner /> {{ $t('common.loading') }}</span>
        <button v-else-if="moreError" type="button" class="btn btn-secondary btn-sm" @click="retry">{{ $t('common.retry') }}</button>
        <span v-else-if="done">{{ $t('common.endOfList') }}</span>
      </div>
    </div>

    <!-- Zijbalk -->
    <aside class="hidden lg:block" :aria-label="$t('home.sidebar')">
      <div class="sticky top-24 space-y-5">
        <UpcomingTrips ref="upcomingRef" />
        <SuggestedTravellers @followed="loadFeed" />

        <section class="card card-pad">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="card-title">{{ $t('home.popularTrips') }}</h2>
            <RouterLink to="/trips" class="text-xs font-bold text-accent-700 hover:underline">{{ $t('home.allTrips') }}</RouterLink>
          </div>
          <div v-if="trendingLoading" class="space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-14" /></div>
          <ol v-else class="space-y-1">
            <li v-for="(trip, i) in trending" :key="trip.id">
              <RouterLink :to="`/trips/${trip.id}`" class="-mx-2 flex items-center gap-3 rounded-xl p-2 transition hover:bg-gray-50">
                <span class="w-4 text-center text-sm font-bold text-muted">{{ i + 1 }}</span>
                <span class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <CoverImage :src="thumbUrl(trip.coverImageUrl)" alt="" :seed="trip.id" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-bold text-ink">{{ trip.title }}</span>
                  <span class="block truncate text-xs text-muted">{{ trip.country }} · {{ trip.displayName }}</span>
                </span>
                <span class="inline-flex items-center gap-1 text-xs font-bold text-muted"><Icon name="heart" :size="13" /> {{ trip.likeCount }}</span>
              </RouterLink>
            </li>
          </ol>
        </section>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { features } from '@/config/features'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PostCard from '@/components/PostCard.vue'
import PostComposer from '@/components/PostComposer.vue'
import UpcomingTrips from '@/components/UpcomingTrips.vue'
import SuggestedTravellers from '@/components/SuggestedTravellers.vue'
import StoriesBar from '@/components/stories/StoriesBar.vue'
import MemoriesCard from '@/components/memories/MemoriesCard.vue'
import ActiveTripBanner from '@/components/trip/ActiveTripBanner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { useInfiniteList } from '@/composables/useInfiniteList'
import * as postsApi from '@/api/postsApi'
import * as tripsApi from '@/api/tripsApi'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/utils/errors'
import { thumbUrl } from '@/utils/media'

const auth = useAuthStore()
const { t } = useI18n()

// Tijdlijn met cursor-paginering (20 per keer).
const feed = useInfiniteList((take, before) => postsApi.getFeed(take, before), { pageSize: 20 })
const { items: posts, loadingMore, done, sentinel, retry } = feed
const moreError = computed(() => !!feed.error.value && posts.value.length > 0)
const loading = ref(true)
const error = ref('')
const trending = ref([])
const trendingLoading = ref(true)
const composerRef = ref(null)
const upcomingRef = ref(null)
const activeRef = ref(null)

const firstName = computed(() => (auth.displayName || t('home.traveller')).split(' ')[0])
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return t('home.greeting.night')
  if (h < 12) return t('home.greeting.morning')
  if (h < 18) return t('home.greeting.afternoon')
  return t('home.greeting.evening')
})

async function loadFeed() {
  error.value = ''
  await feed.reload()
  if (feed.error.value && !posts.value.length) error.value = errorMessage(feed.error.value, t('home.tryAgainSoon'))
  loading.value = false
}

async function loadTrending() {
  trendingLoading.value = true
  try {
    const trips = await tripsApi.getAllTrips(30)
    trending.value = [...trips].sort((a, b) => (b.likeCount + b.bookmarkCount) - (a.likeCount + a.bookmarkCount)).slice(0, 5)
  } catch {
    trending.value = []
  } finally {
    trendingLoading.value = false
  }
}

function onCreated(post) {
  posts.value.unshift(post)
}

function onDeleted(id) {
  posts.value = posts.value.filter((p) => p.id !== id)
}

function focusComposer() {
  composerRef.value?.focus()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onRefresh() {
  loadFeed()
  loadTrending()
  upcomingRef.value?.reload()
  activeRef.value?.reload()
}

onMounted(() => {
  loadFeed()
  loadTrending()
  window.addEventListener('focus-create-post', focusComposer)
  window.addEventListener('app-refresh', onRefresh)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus-create-post', focusComposer)
  window.removeEventListener('app-refresh', onRefresh)
})
</script>
