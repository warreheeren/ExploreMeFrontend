<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4 py-16">
    <div class="max-w-md text-center">
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-muted"><Icon name="compass" :size="30" /></span>
      <p class="eyebrow-accent mt-5">404</p>
      <h1 class="page-title mt-1">{{ $t('misc.notFound.title') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ $t('misc.notFound.text') }}</p>
      <RouterLink :to="auth.isAuthenticated ? '/' : '/login'" class="btn btn-dark mt-6">{{ auth.isAuthenticated ? $t('misc.notFound.toTimeline') : $t('misc.notFound.toLogin') }}</RouterLink>
    </div>
  </div>
</template>

<script setup>
import Icon from '@/components/ui/Icon.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>
