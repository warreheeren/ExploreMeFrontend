<template>
  <!-- Zonder samenvatting (niets gevonden, fout of nog aan het laden) rendert de kaart niets. -->
  <article v-if="summary" class="card overflow-hidden" :aria-label="$t('placeInfo.title', { title: summary.title })">
    <div class="flex flex-col sm:flex-row">
      <img
        v-if="summary.thumbnailUrl && !imageFailed && imagesAllowed"
        :src="summary.thumbnailUrl"
        :alt="$t('placeInfo.photoAlt', { title: summary.title })"
        class="h-44 w-full shrink-0 bg-gray-100 object-cover sm:h-auto sm:w-44"
        loading="lazy"
        referrerpolicy="no-referrer"
        @error="imageFailed = true"
      />
      <!-- Foto van Wikimedia = externe inhoud: pas na toestemming voor "functioneel" laden. -->
      <div
        v-else-if="summary.thumbnailUrl && !imageFailed"
        class="flex h-44 w-full shrink-0 flex-col items-center justify-center gap-2 bg-gray-50 p-4 text-center sm:h-auto sm:w-44"
      >
        <Icon name="image" :size="22" class="text-muted" />
        <button type="button" class="btn btn-secondary btn-sm" @click="consent.grant('functional')">{{ $t('consent.gate.loadImage') }}</button>
        <p class="text-[11px] leading-snug text-muted">{{ $t('consent.gate.externalHint', { source: 'Wikimedia' }) }}</p>
      </div>
      <div class="min-w-0 flex-1 p-4 sm:p-5">
        <p class="eyebrow mb-1 flex items-center gap-1.5"><Icon name="book" :size="13" /> {{ sourceName }}</p>
        <h2 class="card-title">{{ summary.title }}</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-body" :lang="summary.language">{{ summary.extract }}</p>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <a :href="summary.pageUrl" target="_blank" rel="noopener noreferrer" class="link inline-flex items-center gap-1.5 text-sm">
            {{ $t('placeInfo.readMore', { source: sourceName }) }} <Icon name="external" :size="14" />
          </a>
          <p class="text-xs text-muted">{{ $t('placeInfo.license', { source: sourceName }) }}</p>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Icon from '../ui/Icon.vue'
import * as placesApi from '@/api/placesApi'
import { useConsentStore } from '@/stores/consent'

const props = defineProps({
  /** Id van de stop (plek) waarvan de samenvatting getoond wordt (GET /api/places/{stopId}/summary). */
  stopId: { type: String, required: true },
})

const SOURCE_NAMES = { wikipedia: 'Wikipedia', wikivoyage: 'Wikivoyage' }

const consent = useConsentStore()
const imagesAllowed = computed(() => consent.has('functional'))

const summary = ref(null)
const imageFailed = ref(false)
const sourceName = computed(() => SOURCE_NAMES[summary.value?.source] || 'Wikipedia')

// Snel na elkaar wisselende stops: alleen het antwoord voor de laatst gevraagde stop telt.
let requestId = 0

async function load() {
  const current = ++requestId
  summary.value = null
  imageFailed.value = false
  if (!props.stopId) return
  try {
    const result = await placesApi.getPlaceSummary(props.stopId)
    if (current === requestId) summary.value = result
  } catch {
    // Plekinfo is een extraatje: bij een fout tonen we gewoon niets.
    if (current === requestId) summary.value = null
  }
}

watch(() => props.stopId, (id, prev) => { if (id !== prev) load() })
onMounted(load)
</script>
