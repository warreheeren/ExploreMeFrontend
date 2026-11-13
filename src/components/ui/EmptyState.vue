<template>
  <div :class="bare ? 'py-10 text-center' : 'card px-6 py-12 text-center'">
    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-muted">
      <Icon :name="icon" :size="22" />
    </div>
    <p class="text-sm font-bold text-ink">{{ title }}</p>
    <p v-if="text" class="mx-auto mt-1 max-w-sm text-sm text-muted">{{ text }}</p>
    <div v-if="$slots.default" class="mt-4 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'

defineProps({
  icon: { type: String, default: 'info' },
  title: { type: String, required: true },
  text: { type: String, default: '' },
  bare: { type: Boolean, default: false },
})
</script>
