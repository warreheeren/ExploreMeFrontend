<template>
  <span
    class="relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-accent-100 font-extrabold text-accent-800"
    :class="ring ? 'ring-2 ring-surface' : ''"
    :style="{ width: `${px}px`, height: `${px}px`, fontSize: `${Math.max(10, Math.round(px * 0.36))}px` }"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    />
    <span v-else aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 88, '2xl': 112 }

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: [String, Number], default: 'md' },
  ring: { type: Boolean, default: false },
  alt: { type: String, default: '' },
})

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })

const px = computed(() => (typeof props.size === 'number' ? props.size : SIZES[props.size] || 40))

const initials = computed(() => {
  const words = String(props.name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
})
</script>
