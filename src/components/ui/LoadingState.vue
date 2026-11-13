<template>
  <!-- Zichtbare laadmelding (spinner + tekst) met optionele skeletons eronder, zodat de layout niet verspringt. -->
  <div role="status" aria-live="polite" aria-busy="true">
    <p class="flex items-center gap-2 text-sm font-semibold text-muted" :class="center ? 'justify-center' : ''">
      <span class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent-700" aria-hidden="true" />
      <span>{{ text || $t('ui.loadingText') }}</span>
      <span v-if="slow" class="font-medium">· {{ $t('ui.loadingSlow') }}</span>
    </p>
    <div v-if="$slots.default" class="mt-3" aria-hidden="true"><slot /></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  center: { type: Boolean, default: false },
  /** Na zoveel ms extra "dit kan even duren" tonen; 0 = nooit. */
  slowAfter: { type: Number, default: 4000 },
})

const slow = ref(false)
let timer = null
onMounted(() => {
  if (props.slowAfter > 0) timer = setTimeout(() => (slow.value = true), props.slowAfter)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>
