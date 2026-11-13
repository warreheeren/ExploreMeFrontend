<template>
  <div class="py-16 text-center">
    <EmptyState v-if="failed" icon="pin" :title="$t('placeqa.redirectFailed')">
      <RouterLink to="/discover" class="btn btn-secondary btn-sm">{{ $t('places.toDiscover') }}</RouterLink>
    </EmptyState>
    <p v-else class="inline-flex items-center gap-2 text-sm font-semibold text-muted"><Spinner /> {{ $t('placeqa.redirecting') }}</p>
  </div>
</template>

<script setup>
// Meldingen over plekvragen dragen alleen een reis-id: zoek de juiste plekpagina op en ga erheen.
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import Spinner from '@/components/ui/Spinner.vue'
import * as qaApi from '@/api/placeQuestionsApi'

const route = useRoute()
const router = useRouter()
const failed = ref(false)

onMounted(async () => {
  try {
    const { stopId } = await qaApi.getQaTarget(route.params.tripId)
    router.replace({ path: `/places/${stopId}`, hash: '#vragen' })
  } catch {
    failed.value = true
  }
})
</script>
