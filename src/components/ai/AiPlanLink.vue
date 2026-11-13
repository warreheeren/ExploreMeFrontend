<template>
  <!-- Ingang "Plan met AI"; alleen zichtbaar wanneer de AI-assistent op de server aan staat. -->
  <RouterLink v-if="status.enabled" to="/trips/plan-ai" class="btn btn-secondary" :class="small ? 'btn-sm' : ''">
    <Icon name="sparkle" :size="16" /> {{ $t('ai.entry') }}
  </RouterLink>
</template>

<script setup>
import { onMounted } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { useAiStatus } from '@/composables/useAiStatus'

defineProps({
  small: { type: Boolean, default: false },
})

const { status, load } = useAiStatus()
onMounted(() => load())
</script>
