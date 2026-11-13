<template>
  <div class="mx-auto max-w-2xl">
    <button type="button" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink" @click="goBack">
      <Icon name="chevron-left" :size="16" /> {{ $t('misc.post.back') }}
    </button>

    <div v-if="loading" class="card overflow-hidden">
      <div class="flex items-center gap-3 p-4"><div class="skeleton h-10 w-10 rounded-full" /><div class="skeleton h-3 w-40" /></div>
      <div class="skeleton h-72 rounded-none" />
    </div>

    <EmptyState v-else-if="!post" icon="image" :title="$t('misc.post.goneTitle')" :text="$t('misc.post.goneText')">
      <RouterLink to="/" class="btn btn-secondary btn-sm">{{ $t('misc.post.toTimeline') }}</RouterLink>
    </EmptyState>

    <PostCard v-else :post="post" initially-open @deleted="router.replace('/')" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PostCard from '@/components/PostCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import * as postsApi from '@/api/postsApi'

const route = useRoute()
const router = useRouter()
const post = ref(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    post.value = await postsApi.getPost(route.params.id)
    document.title = `${post.value.displayName} · ExploreMe`
  } catch {
    post.value = null
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

watch(() => route.params.id, (id) => id && load(), { immediate: true })
</script>
