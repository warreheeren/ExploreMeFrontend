<template>
  <div class="min-h-screen bg-ground">
    <header class="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 sm:px-6">
        <RouterLink :to="auth.isAuthenticated ? '/' : '/login'" aria-label="ExploreMe"><Logo /></RouterLink>
        <div v-if="!auth.isAuthenticated" class="flex items-center gap-2">
          <RouterLink to="/login" class="btn btn-ghost btn-sm">{{ $t('sharedTrip.login') }}</RouterLink>
          <RouterLink to="/register" class="btn btn-dark btn-sm">{{ $t('sharedTrip.register') }}</RouterLink>
        </div>
        <RouterLink v-else to="/postcards" class="btn btn-secondary btn-sm">{{ $t('postcards.public.myPostcards') }}</RouterLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div v-if="loading" class="skeleton aspect-[3/2] rounded-2xl" />

      <EmptyState v-else-if="!card" icon="mail" :title="$t('postcards.public.invalidTitle')" :text="$t('postcards.public.invalidText')">
        <RouterLink to="/register" class="btn btn-dark btn-sm">{{ $t('sharedTrip.discover') }}</RouterLink>
      </EmptyState>

      <template v-else>
        <div class="mb-5 flex items-center gap-3">
          <Avatar :src="card.senderProfilePhotoUrl" :name="card.senderDisplayName" size="md" />
          <div class="min-w-0">
            <h1 class="text-lg font-extrabold text-ink">{{ $t('postcards.public.heading', { name: card.senderDisplayName }) }}</h1>
            <p class="text-sm text-muted">
              {{ formatFullDate(card.createdAtUtc) }}
              <template v-if="card.senderUserName && auth.isAuthenticated">
                · <RouterLink :to="`/u/${card.senderUserName}`" class="font-bold text-ink hover:underline">{{ $t('postcards.public.viewProfile') }}</RouterLink>
              </template>
            </p>
          </div>
        </div>

        <PostcardCard :card="cardView" :thumb="false" :lazy="false" :stamp-width="56" @flip="onFlip" />
        <p class="mt-3 text-center text-xs font-semibold text-muted">{{ $t('postcards.public.flipHint') }}</p>

        <section v-if="!auth.isAuthenticated" class="card mt-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="send" :size="22" /></span>
          <div class="flex-1">
            <h2 class="text-base font-extrabold text-ink">{{ $t('postcards.public.ctaTitle') }}</h2>
            <p class="text-sm text-muted">{{ $t('postcards.public.ctaText') }}</p>
          </div>
          <RouterLink to="/register" class="btn btn-primary btn-sm">{{ $t('sharedTrip.register') }}</RouterLink>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Logo from '@/components/ui/Logo.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PostcardCard from '@/components/postcards/PostcardCard.vue'
import * as publicApi from '@/api/publicApi'
import { useAuthStore } from '@/stores/auth'
import { formatFullDate } from '@/utils/date'

const route = useRoute()
const auth = useAuthStore()

const card = ref(null)
const loading = ref(true)
let markedOpen = false

const cardView = computed(() => ({
  imageUrl: card.value.imageUrl,
  placeName: card.value.placeName,
  message: card.value.message,
  stampStyle: card.value.stampStyle,
  senderDisplayName: card.value.senderDisplayName,
  createdAtUtc: card.value.createdAtUtc,
}))

async function onFlip(back) {
  if (!back || markedOpen) return
  markedOpen = true
  try {
    await publicApi.markPublicPostcardOpened(route.params.token)
  } catch {
    // niet kritiek
  }
}

onMounted(async () => {
  try {
    card.value = await publicApi.getPublicPostcard(route.params.token)
  } catch {
    card.value = null
  } finally {
    loading.value = false
  }
})
</script>
