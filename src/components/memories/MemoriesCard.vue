<template>
  <section v-if="visible" class="card overflow-hidden" :aria-label="$t('memories.eyebrow')">
    <div class="flex items-start gap-3 p-4">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="clock" :size="18" /></span>
      <div class="min-w-0 flex-1">
        <p class="eyebrow-accent">{{ $t('memories.eyebrow') }}</p>
        <h2 class="mt-0.5 text-base font-bold leading-snug text-ink">
          {{ headline.place
            ? $t('memories.headlinePlace', { n: headline.yearsAgo, place: headline.place }, headline.yearsAgo)
            : $t('memories.headlinePost', { n: headline.yearsAgo }, headline.yearsAgo) }}
        </h2>
        <p v-if="firstTrip" class="mt-0.5 truncate text-xs font-semibold text-muted">{{ $t('memories.dayOfTrip', { day: firstTrip.dayNumber, trip: firstTrip.title }) }}</p>
      </div>
      <button type="button" class="btn-icon btn-icon-sm -mr-1 -mt-1" :aria-label="$t('memories.dismiss')" :title="$t('memories.dismiss')" @click="dismiss"><Icon name="x" :size="16" /></button>
    </div>

    <div v-if="photos.length" class="grid gap-0.5" :class="photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'">
      <RouterLink
        v-for="(src, i) in photos"
        :key="src"
        :to="link"
        class="block overflow-hidden bg-gray-100"
        :class="photos.length === 1 ? 'aspect-[16/9]' : 'aspect-square'"
        :aria-label="$t('memories.photo', { n: i + 1 })"
      >
        <img :src="thumbUrl(src)" alt="" class="h-full w-full object-cover" loading="lazy" />
      </RouterLink>
    </div>

    <p v-if="journalLine" class="px-4 pt-3 text-sm italic text-body">“{{ journalLine }}”</p>

    <div class="flex flex-wrap items-center gap-2 p-4 pt-3">
      <RouterLink :to="link" class="btn btn-secondary btn-sm"><Icon :name="headline.tripId ? 'map' : 'image'" :size="14" /> {{ headline.tripId ? $t('memories.openTrip') : $t('memories.openPost') }}</RouterLink>
      <span v-for="y in otherYears" :key="y.yearsAgo" class="chip chip-muted h-6">{{ $t('memories.yearsAgo', { n: y.yearsAgo }, y.yearsAgo) }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import * as memoriesApi from '@/api/memoriesApi'
import { thumbUrl } from '@/utils/media'
import { dismissMemory, isMemoryDismissed, memoryHeadline, memoryPhotos } from '@/utils/socialExtras'

const years = ref([])
const dismissed = ref(false)

const storage = (() => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
})()

const headline = computed(() => memoryHeadline(years.value))
const visible = computed(() => !dismissed.value && !!headline.value)
const firstTrip = computed(() => years.value.find((y) => y.yearsAgo === headline.value?.yearsAgo)?.trips?.[0] || null)
const photos = computed(() => memoryPhotos(years.value, 3))
const journalLine = computed(() => firstTrip.value?.journal?.[0]?.text || '')
const link = computed(() => (headline.value?.tripId ? `/trips/${headline.value.tripId}` : headline.value?.postId ? `/posts/${headline.value.postId}` : '/'))
const otherYears = computed(() => years.value.filter((y) => y.yearsAgo !== headline.value?.yearsAgo))

function dismiss() {
  dismissMemory(storage)
  dismissed.value = true
}

onMounted(async () => {
  dismissed.value = isMemoryDismissed(storage)
  if (dismissed.value) return
  try {
    years.value = await memoriesApi.getTodayMemories()
  } catch {
    years.value = []
  }
})
</script>
