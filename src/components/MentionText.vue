<template>
  <span class="whitespace-pre-wrap break-words"><template v-for="(part, i) in parts" :key="i"><RouterLink
        v-if="part.type === 'mention'"
        :to="`/u/${part.value}`"
        class="font-bold text-accent-700 hover:underline"
        @click.stop
      >@{{ part.value }}</RouterLink><template v-else>{{ part.value }}</template></template></span>
</template>

<script setup>
import { computed } from 'vue'
import { splitMentions } from '@/utils/mentions'

const props = defineProps({
  text: { type: String, default: '' },
})

const parts = computed(() => splitMentions(props.text))
</script>
