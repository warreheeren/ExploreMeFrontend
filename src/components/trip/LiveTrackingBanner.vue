<template>
  <!-- Alleen in de native app, terwijl de live locatie voor deze reis op de achtergrond bijgewerkt wordt. -->
  <div v-if="visible" class="card flex items-center justify-between gap-3 p-3" role="status">
    <p class="inline-flex items-center gap-2 text-sm font-bold text-ink">
      <Icon name="pin" :size="16" />
      {{ $t('nativeApp.live.banner') }}
    </p>
    <button type="button" class="btn btn-ghost btn-sm" @click="stop">{{ $t('nativeApp.live.stop') }}</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import { liveTracking, stopLiveTracking } from '@/services/liveTracking'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  tripId: { type: String, required: true },
})

const { t } = useI18n()
const toast = useToastStore()

const visible = computed(() => liveTracking.active && liveTracking.tripId === props.tripId)

async function stop() {
  await stopLiveTracking()
  toast.info(t('nativeApp.live.stopped'))
}
</script>
