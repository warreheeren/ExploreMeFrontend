<template>
  <div class="flex items-center gap-3 rounded-2xl border border-line bg-gray-50 px-3 py-2">
    <button
      type="button"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-surface"
      :aria-label="playing ? $t('voiceMemo.pause') : $t('voiceMemo.play')"
      @click="toggle"
    >
      <Icon :name="playing ? 'pause' : 'play'" :size="16" :filled="!playing" />
    </button>
    <input
      type="range"
      class="h-1.5 min-w-0 flex-1 cursor-pointer accent-accent-700"
      min="0"
      :max="total || 0"
      step="0.1"
      :value="current"
      :aria-label="$t('voiceMemo.position')"
      :aria-valuetext="`${formatClock(current)} / ${formatClock(total)}`"
      @input="seek"
    />
    <span class="shrink-0 text-xs font-bold tabular-nums text-muted">{{ formatClock(current) }} / {{ formatClock(total) }}</span>
    <audio ref="audioRef" :src="resolveMediaUrl(src)" preload="metadata" class="hidden" @timeupdate="onTime" @loadedmetadata="onMeta" @play="playing = true" @pause="playing = false" @ended="onEnded" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { formatClock } from '@/utils/journal'
import { resolveMediaUrl } from '@/utils/media'

const props = defineProps({
  src: { type: String, required: true },
  /** Duur volgens de server; WebM uit MediaRecorder heeft vaak geen duur in de metadata (Infinity). */
  durationSec: { type: Number, default: null },
})

const audioRef = ref(null)
const playing = ref(false)
const current = ref(0)
const metaDuration = ref(0)

const total = computed(() => (Number.isFinite(metaDuration.value) && metaDuration.value > 0 ? metaDuration.value : props.durationSec || 0))

function toggle() {
  const audio = audioRef.value
  if (!audio) return
  if (audio.paused) audio.play().catch(() => { playing.value = false })
  else audio.pause()
}

function seek(e) {
  if (audioRef.value) audioRef.value.currentTime = Number(e.target.value)
}

function onTime() {
  current.value = audioRef.value?.currentTime || 0
}

function onMeta() {
  metaDuration.value = audioRef.value?.duration || 0
}

function onEnded() {
  playing.value = false
  current.value = 0
}
</script>
