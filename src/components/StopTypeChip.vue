<template>
  <span class="chip" :class="meta.chip">
    <span class="h-1.5 w-1.5 rounded-full" :class="meta.dot" aria-hidden="true" />
    <template v-if="count != null">{{ count }} {{ meta.plural }}</template>
    <template v-else>{{ meta.singular }}</template>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { stopTypeMeta } from '@/utils/stopTypes'

const props = defineProps({
  type: { type: String, required: true },
  count: { type: Number, default: null },
})

const meta = computed(() => stopTypeMeta(props.type))
</script>
