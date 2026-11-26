<template>
  <!-- "/trips" is de lijst met publieke reizen (ontdekken); zonder die vlag is het gewoon "Mijn reizen". -->
  <TripsView v-if="features.discover" />
  <MyTripsHomeView v-else />
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { features } from '@/config/features'

const TripsView = defineAsyncComponent(() => import('./TripsView.vue'))
const MyTripsHomeView = defineAsyncComponent(() => import('./MyTripsHomeView.vue'))
</script>
