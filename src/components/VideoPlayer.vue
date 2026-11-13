<template>
  <div ref="rootRef" class="relative select-none bg-black">
    <video
      ref="videoRef"
      :src="src"
      :poster="poster || undefined"
      :aria-label="label || $t('posts.video.label')"
      class="max-h-[560px] w-full object-contain"
      playsinline
      loop
      preload="metadata"
      :muted="muted"
      @play="playing = true"
      @pause="playing = false"
      @click="toggleSound"
    />

    <!-- Gepauzeerd (buiten beeld, of autoplay uit door "minder beweging"): grote afspeelknop -->
    <button
      v-if="!playing"
      type="button"
      class="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
      :aria-label="$t('posts.video.play')"
      @click.stop="play(true)"
    >
      <Icon name="play" :size="26" filled />
    </button>

    <span v-if="durationSeconds" class="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-bold text-white">
      <Icon name="video" :size="13" />
      {{ formatVideoDuration(durationSeconds) }}
    </span>

    <button
      type="button"
      class="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      :aria-label="muted ? $t('posts.video.unmute') : $t('posts.video.mute')"
      :aria-pressed="!muted"
      @click.stop="toggleSound"
    >
      <Icon :name="muted ? 'volume-off' : 'volume'" :size="18" />
    </button>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './ui/Icon.vue'
import { formatVideoDuration } from '@/utils/video'

/**
 * Video in een post: gedempt automatisch afspelen zodra hij grotendeels in beeld is (IntersectionObserver),
 * pauzeren erbuiten. Tikken zet het geluid aan/uit (en start een gepauzeerde video).
 * Met "minder beweging" (prefers-reduced-motion) speelt hij pas na een tik.
 */
const props = defineProps({
  src: { type: String, required: true },
  poster: { type: String, default: null },
  durationSeconds: { type: Number, default: null },
  label: { type: String, default: '' },
  autoplay: { type: Boolean, default: true },
})

/** Zoveel van de video moet zichtbaar zijn voordat hij start. */
const VISIBLE_RATIO = 0.6

const rootRef = ref(null)
const videoRef = ref(null)
const muted = ref(true)
const playing = ref(false)
let observer = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

async function play(userInitiated = false) {
  const video = videoRef.value
  if (!video) return
  try {
    await video.play()
  } catch {
    // Autoplay met geluid geweigerd: gedempt nog eens proberen (alleen bij een tik).
    if (userInitiated && !muted.value) {
      muted.value = true
      video.muted = true
      video.play().catch(() => {})
    }
  }
}

function pause() {
  videoRef.value?.pause()
}

function toggleSound() {
  muted.value = !muted.value
  if (videoRef.value) videoRef.value.muted = muted.value
  if (!playing.value) play(true)
}

onMounted(() => {
  // iOS Safari kijkt naar de property, niet het attribuut, voor gedempte autoplay.
  if (videoRef.value) videoRef.value.muted = true
  if (!props.autoplay || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) play()
      else pause()
    },
    { threshold: [0, VISIBLE_RATIO] }
  )
  if (rootRef.value) observer.observe(rootRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  pause()
})
</script>
