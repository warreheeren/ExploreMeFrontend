<template>
  <section class="card card-pad" aria-labelledby="safety-card-title">
    <h2 id="safety-card-title" class="card-title mb-1.5 flex items-center gap-2"><Icon name="shield" :size="18" /> {{ $t('safety.today.title') }}</h2>
    <SafetyCheckInStatus v-if="safety.active" />
    <template v-else>
      <p class="mb-3 text-sm text-muted">{{ $t('safety.today.text') }}</p>
      <button type="button" class="btn btn-secondary" @click="dialogOpen = true"><Icon name="shield" :size="16" /> {{ $t('safety.start') }}</button>
    </template>
    <SafetyCheckInDialog v-model="dialogOpen" :preset-trip-id="tripId" />
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import SafetyCheckInStatus from './SafetyCheckInStatus.vue'
import SafetyCheckInDialog from './SafetyCheckInDialog.vue'
import { useSafetyStore } from '@/stores/safety'

defineProps({
  tripId: { type: String, default: null },
})

const safety = useSafetyStore()
const dialogOpen = ref(false)

onMounted(() => { if (!safety.loaded) safety.load() })
</script>
