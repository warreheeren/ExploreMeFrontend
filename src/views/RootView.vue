<template>
  <!--
    "/" is de landingspagina voor bezoekers. Voor wie ingelogd is: het startscherm "Mijn reizen" (groepsreis-app),
    of de tijdlijn wanneer de sociale laag aan staat (vlag `feed`).
  -->
  <LandingView v-if="!auth.isAuthenticated" />
  <HomeView v-else-if="features.feed" />
  <MyTripsHomeView v-else />
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { features } from '@/config/features'

const HomeView = defineAsyncComponent(() => import('./HomeView.vue'))
const MyTripsHomeView = defineAsyncComponent(() => import('./MyTripsHomeView.vue'))
const LandingView = defineAsyncComponent(() => import('./LandingView.vue'))

const auth = useAuthStore()
</script>
