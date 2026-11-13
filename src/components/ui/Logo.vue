<template>
  <span class="inline-flex items-center gap-2">
    <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" :stroke="inverted ? '#FFFFFF' : 'rgb(var(--c-ink))'" stroke-width="2" />
      <path d="M16 9c-3.6 0-6 2.8-6 6.2C10 19.6 16 25 16 25s6-5.4 6-9.8C22 11.8 19.6 9 16 9z" :fill="inverted ? '#FFFFFF' : 'rgb(var(--c-accent-700))'" />
      <circle cx="16" cy="15" r="2.2" :fill="inverted ? '#0F766E' : 'rgb(var(--c-surface))'" />
    </svg>
    <span v-if="withText" class="text-base font-extrabold tracking-tight" :class="inverted ? 'text-white' : 'text-ink'">ExploreMe</span>
  </span>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 26 },
  withText: { type: Boolean, default: true },
  inverted: { type: Boolean, default: false },
})
</script>
