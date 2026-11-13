<template>
  <!-- "/" is de tijdlijn voor wie ingelogd is en de landingspagina voor bezoekers. -->
  <HomeView v-if="auth.isAuthenticated" />
  <LandingView v-else />
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { useAuthStore } from '@/stores/auth'

const HomeView = defineAsyncComponent(() => import('./HomeView.vue'))
const LandingView = defineAsyncComponent(() => import('./LandingView.vue'))

const auth = useAuthStore()
</script>
