<template>
  <!-- z-[95]: boven de navigatie (50/90), onder modals (100) en bevestigingen (110) zodat rapporteren en verwijderen erboven verschijnen. -->
  <Teleport to="body">
    <div
      v-if="modelValue && story"
      class="fixed inset-0 z-[95] flex items-center justify-center bg-black"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('stories.viewer.label', { name: group.displayName })"
    >
      <div
        ref="stageRef"
        class="relative h-full w-full max-w-md touch-none select-none overflow-hidden sm:h-[92vh] sm:rounded-3xl"
        :style="dragY ? { transform: `translateY(${dragY}px)`, opacity: Math.max(0.4, 1 - dragY / 400) } : null"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="resetPointer"
        @contextmenu.prevent
      >
        <!-- Video-story: speelt gedempt af (autoplay-regels); de voortgang volgt de video. ImageUrl is de poster. -->
        <video
          v-if="story.videoUrl"
          ref="videoRef"
          :key="story.id"
          :src="story.videoUrl"
          :poster="story.imageUrl"
          :aria-label="$t('stories.video.label', { name: group.displayName })"
          class="absolute inset-0 h-full w-full object-contain"
          playsinline
          preload="auto"
          :muted="muted"
          @loadeddata="onVideoReady"
          @ended="go(1)"
          @error="onVideoError"
        />
        <img v-else :key="story.id" :src="story.imageUrl" :alt="$t('stories.viewer.imageAlt', { name: group.displayName })" class="absolute inset-0 h-full w-full object-contain" draggable="false" @load="loaded = true" @error="loaded = true" />

        <!-- Voortgang + kop -->
        <div class="absolute inset-x-0 top-0 bg-black/40 px-3 pb-3 pt-3 text-white">
          <div class="flex gap-1" aria-hidden="true">
            <span v-for="(s, i) in group.stories" :key="s.id" class="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
              <span class="block h-full bg-white" :style="{ width: `${i < storyIndex ? 100 : i === storyIndex ? progress * 100 : 0}%` }" />
            </span>
          </div>
          <div class="mt-3 flex items-center gap-2.5">
            <RouterLink :to="`/u/${group.userName}`" class="shrink-0" @pointerdown.stop @click="close"><Avatar :src="group.profilePhotoUrl" :name="group.displayName" size="sm" /></RouterLink>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-extrabold">{{ group.displayName }} <span class="font-semibold text-white/75">· {{ timeAgo(story.createdAtUtc) }}</span></p>
              <p v-if="story.placeName || story.tripTitle" class="flex items-center gap-1 truncate text-xs font-semibold text-white/80">
                <template v-if="story.placeName"><Icon name="pin" :size="12" /> {{ story.placeName }}</template>
                <template v-if="story.placeName && story.tripTitle"> · </template>
                <RouterLink v-if="story.tripTitle" :to="`/trips/${story.tripId}`" class="truncate underline-offset-2 hover:underline" @pointerdown.stop @click="close">{{ $t('stories.viewer.trip', { trip: story.tripTitle }) }}</RouterLink>
              </p>
            </div>
            <span v-if="paused" class="chip h-6 bg-white/20 text-white">{{ $t('stories.viewer.paused') }}</span>
            <button
              v-if="story.videoUrl && !videoFailed"
              type="button"
              class="btn-icon btn-icon-sm text-white hover:bg-white/15 hover:text-white"
              :aria-label="muted ? $t('posts.video.unmute') : $t('posts.video.mute')"
              :aria-pressed="!muted"
              @pointerdown.stop
              @click="toggleMute"
            >
              <Icon :name="muted ? 'volume-off' : 'volume'" :size="16" />
            </button>
            <button v-if="!group.isMe" type="button" class="btn-icon btn-icon-sm text-white hover:bg-white/15 hover:text-white" :aria-label="$t('stories.viewer.report')" @pointerdown.stop @click="openReport"><Icon name="flag" :size="16" /></button>
            <button v-else type="button" class="btn-icon btn-icon-sm text-white hover:bg-white/15 hover:text-white" :aria-label="$t('stories.viewer.delete')" @pointerdown.stop @click="remove"><Icon name="trash" :size="16" /></button>
            <button type="button" class="btn-icon btn-icon-sm text-white hover:bg-white/15 hover:text-white" :aria-label="$t('stories.viewer.close')" @pointerdown.stop @click="close"><Icon name="x" :size="20" /></button>
          </div>
        </div>

        <!-- Tekst + kijkers -->
        <div v-if="story.caption || group.isMe" class="absolute inset-x-0 bottom-0 space-y-2 bg-black/45 px-4 pb-6 pt-3 text-white safe-bottom">
          <p v-if="story.caption" class="whitespace-pre-line text-[15px] font-semibold leading-snug">{{ story.caption }}</p>
          <button v-if="group.isMe" type="button" class="inline-flex items-center gap-1.5 text-xs font-bold text-white/85 hover:text-white" @pointerdown.stop @click="openViewers">
            <Icon name="eye" :size="14" /> {{ $t('stories.viewer.viewers', story.viewCount) }}
          </button>
        </div>

        <!-- Toetsenbord/schermlezer: expliciete knoppen -->
        <button type="button" class="sr-only" @click="go(-1)">{{ $t('stories.viewer.previous') }}</button>
        <button type="button" class="sr-only" @click="go(1)">{{ $t('stories.viewer.next') }}</button>

        <!-- Kijkers (alleen eigen story) -->
        <div v-if="viewersOpen" class="absolute inset-x-0 bottom-0 max-h-[60%] overflow-y-auto rounded-t-3xl bg-surface p-4 text-ink safe-bottom" @pointerdown.stop>
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-extrabold">{{ $t('stories.viewer.viewersTitle') }}</p>
            <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('stories.viewer.close')" @click="closeViewers"><Icon name="x" :size="18" /></button>
          </div>
          <p v-if="viewersLoading" class="py-4 text-center"><Spinner /></p>
          <p v-else-if="!viewers.length" class="py-4 text-sm text-muted">{{ $t('stories.viewer.noViewers') }}</p>
          <ul v-else class="divide-y divide-line">
            <li v-for="v in viewers" :key="v.userName" class="flex items-center gap-3 py-2">
              <Avatar :src="v.profilePhotoUrl" :name="v.displayName" size="sm" />
              <span class="min-w-0 flex-1 truncate text-sm font-bold">{{ v.displayName }}</span>
              <span class="text-xs text-muted">{{ timeAgo(v.viewedAtUtc) }}</span>
            </li>
          </ul>
        </div>
      </div>
      <ReportDialog v-if="reportOpen" v-model="reportOpen" target-type="story" :target-id="story.id" />
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import * as storiesApi from '@/api/storiesApi'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { timeAgo } from '@/utils/date'
import { errorMessage } from '@/utils/errors'
import { lockScroll, unlockScroll } from '@/utils/scrollLock'
import { firstUnseenIndex, stepStory } from '@/utils/socialExtras'
import { STORY_PHOTO_MS, VIDEO_MAX_SECONDS, storyDurationMs } from '@/utils/video'

/** Zo lang ingedrukt houden = pauzeren in plaats van tikken. */
const HOLD_DELAY_MS = 220
/** Zo ver naar beneden vegen sluit de viewer. */
const SWIPE_CLOSE_PX = 110

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  groups: { type: Array, default: () => [] },
  startGroup: { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue', 'seen', 'deleted'])

const { t } = useI18n()
const toast = useToastStore()
const confirm = useConfirm()

const groupIndex = ref(0)
const storyIndex = ref(0)
const progress = ref(0)
const loaded = ref(false)
const held = ref(false)
const viewersOpen = ref(false)
const reportOpen = ref(false)
const viewers = ref([])
const viewersLoading = ref(false)
const dragY = ref(0)
const stageRef = ref(null)
const videoRef = ref(null)
/** Blijft gelden voor volgende video's zolang de viewer open is. */
const muted = ref(true)
/** Video kon niet laden: de poster blijft staan en de story loopt op de klok, zoals een foto. */
const videoFailed = ref(false)

const group = computed(() => props.groups[groupIndex.value] || { stories: [] })
const story = computed(() => group.value.stories[storyIndex.value] || null)
const paused = computed(() => held.value || viewersOpen.value || reportOpen.value)
const playsVideo = computed(() => !!story.value?.videoUrl && !videoFailed.value)

let frame = null
let lastTime = null
let pointer = null
let holdTimer = null
let locked = false

function tick(time) {
  if (lastTime !== null && loaded.value && !paused.value) {
    const video = videoRef.value
    if (playsVideo.value && video) {
      // De video bepaalt de voortgang; "ended" gaat naar de volgende. Langer dan 60 s (zou de server al afkappen) stopt hier.
      const duration = storyDurationMs(story.value, video.duration)
      progress.value = Math.min(1, (video.currentTime * 1000) / duration)
      if (video.currentTime > VIDEO_MAX_SECONDS + 0.5) go(1)
    } else {
      progress.value = Math.min(1, progress.value + (time - lastTime) / STORY_PHOTO_MS)
      if (progress.value >= 1) go(1)
    }
  }
  lastTime = time
  frame = requestAnimationFrame(tick)
}

function show(gi, si) {
  groupIndex.value = gi
  storyIndex.value = si
  progress.value = 0
  loaded.value = false
  videoFailed.value = false
  markSeen()
}

// ---------- video ----------

async function playVideo() {
  const video = videoRef.value
  if (!video || paused.value) return
  try {
    await video.play()
  } catch {
    // Afspelen met geluid zonder tik wordt soms geweigerd (iOS): gedempt verder.
    if (!muted.value) {
      muted.value = true
      video.muted = true
      video.play().catch(() => {})
    }
  }
}

function onVideoReady() {
  loaded.value = true
  if (videoRef.value) videoRef.value.muted = muted.value
  playVideo()
}

function onVideoError() {
  videoFailed.value = true
  loaded.value = true
}

function toggleMute() {
  muted.value = !muted.value
  if (videoRef.value) videoRef.value.muted = muted.value
}

watch(paused, (isPaused) => {
  if (!playsVideo.value) return
  if (isPaused) videoRef.value?.pause()
  else playVideo()
})

function go(dir) {
  // Terug binnen de eerste seconde gaat naar de vorige story; anders herstart de huidige.
  if (dir < 0 && progress.value > 0.2) {
    restart()
    return
  }
  const next = stepStory(props.groups, groupIndex.value, storyIndex.value, dir)
  if (next) show(next.group, next.story)
  else if (dir > 0) close()
  else restart()
}

function restart() {
  progress.value = 0
  if (playsVideo.value && videoRef.value) videoRef.value.currentTime = 0
}

async function markSeen() {
  const s = story.value
  if (!s || s.seen || group.value.isMe) return
  s.seen = true
  emit('seen', s.id)
  try {
    await storiesApi.markViewed(s.id)
  } catch {
    // niet erg: de volgende keer opnieuw
  }
}

function close() {
  emit('update:modelValue', false)
}

// ---------- aanraken ----------

function onPointerDown(e) {
  if (viewersOpen.value) return
  pointer = { x: e.clientX, y: e.clientY }
  held.value = false
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => { held.value = true }, HOLD_DELAY_MS)
}

function onPointerMove(e) {
  if (!pointer) return
  const dy = e.clientY - pointer.y
  if (dy > 10) {
    held.value = true
    dragY.value = dy
  }
}

function onPointerUp(e) {
  if (!pointer) return
  clearTimeout(holdTimer)
  const wasHeld = held.value
  const swipe = dragY.value
  resetPointer()
  if (swipe > SWIPE_CLOSE_PX) {
    close()
    return
  }
  if (wasHeld) return
  const rect = stageRef.value?.getBoundingClientRect()
  const x = rect ? e.clientX - rect.left : 0
  go(rect && x < rect.width / 3 ? -1 : 1)
}

function resetPointer() {
  clearTimeout(holdTimer)
  pointer = null
  held.value = false
  dragY.value = 0
}

function onKey(e) {
  if (!props.modelValue || reportOpen.value) return
  if (e.key === 'Escape') {
    if (viewersOpen.value) closeViewers()
    else close()
  } else if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === ' ') {
    e.preventDefault()
    held.value = !held.value
  }
}

// ---------- eigen story ----------

async function openViewers() {
  viewersOpen.value = true
  viewersLoading.value = true
  try {
    viewers.value = await storiesApi.getViewers(story.value.id)
  } catch {
    viewers.value = []
  } finally {
    viewersLoading.value = false
  }
}

function closeViewers() {
  viewersOpen.value = false
}

function openReport() {
  reportOpen.value = true
}

async function remove() {
  held.value = true
  const ok = await confirm({ title: t('stories.viewer.deleteTitle'), message: t('stories.viewer.deleteMessage'), variant: 'danger', confirmLabel: t('common.delete') })
  held.value = false
  if (!ok) return
  try {
    const id = story.value.id
    await storiesApi.deleteStory(id)
    toast.success(t('stories.viewer.deleted'))
    emit('deleted', id)
    close()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

// ---------- openen/sluiten ----------

function setOpen(open) {
  if (open) {
    const gi = Math.min(Math.max(0, props.startGroup), Math.max(0, props.groups.length - 1))
    viewersOpen.value = false
    show(gi, firstUnseenIndex(props.groups[gi]?.stories))
    if (!locked) {
      lockScroll()
      locked = true
      document.addEventListener('keydown', onKey)
    }
    lastTime = null
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(tick)
  } else {
    cancelAnimationFrame(frame)
    frame = null
    resetPointer()
    if (locked) {
      unlockScroll()
      locked = false
      document.removeEventListener('keydown', onKey)
    }
  }
}

watch(() => props.modelValue, setOpen, { immediate: true })
onBeforeUnmount(() => setOpen(false))
</script>
