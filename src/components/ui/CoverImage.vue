<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="alt"
    class="h-full w-full object-cover"
    :class="imgClass"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    @error="failed = true"
  />
  <CoverPlaceholder v-else :seed="seed" />
</template>

<script setup>
import { ref, watch } from 'vue'
import CoverPlaceholder from './CoverPlaceholder.vue'

// Omslagfoto met automatische terugval op de illustratie als de URL leeg of kapot is.
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  seed: { type: String, default: '' },
  imgClass: { type: [String, Array, Object], default: '' },
  eager: { type: Boolean, default: false },
})

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>
