<template>
  <span
    class="inline-block animate-spin rounded-full border-2 border-line border-t-accent-700"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="status"
    :aria-label="label || $t('ui.loading')"
  />
</template>

<script setup>
defineProps({
  size: { type: Number, default: 20 },
  label: { type: String, default: '' },
})
</script>
