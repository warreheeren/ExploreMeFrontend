<template>
  <section class="mx-auto max-w-3xl space-y-4">
    <header>
      <h2 class="card-title">{{ $t('countryInfo.title') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ $t('countryInfo.intro') }}</p>
    </header>

    <LoadingState v-if="loading" :text="$t('countryInfo.loading')">
      <div class="space-y-3"><div v-for="i in 2" :key="i" class="skeleton h-16 rounded-2xl" /></div>
    </LoadingState>
    <EmptyState v-else-if="failed" icon="alert" :title="$t('countryInfo.loadFailed')" />
    <EmptyState v-else-if="!countries.length" icon="globe" :title="$t('countryInfo.empty')" :text="$t('countryInfo.emptyText')" />
    <template v-else>
      <CountryInfoCard v-for="(c, i) in countries" :key="c.code" :info="c" :initially-open="i === 0" />
      <p class="flex items-start gap-1.5 text-xs text-muted">
        <Icon name="info" :size="14" class="mt-px shrink-0" /> {{ $t('countryInfo.disclaimer') }}
      </p>
    </template>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import Icon from '../ui/Icon.vue'
import EmptyState from '../ui/EmptyState.vue'
import CountryInfoCard from './CountryInfoCard.vue'
import { getCountryInfo } from '@/api/tripExtrasApi'

const props = defineProps({
  tripId: { type: String, required: true },
  /** Verandert wanneer land of stops wijzigen; dan opnieuw laden. */
  version: { type: String, default: '' },
})

const countries = ref([])
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    countries.value = await getCountryInfo(props.tripId)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => [props.tripId, props.version], load, { immediate: true })
</script>
