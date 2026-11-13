<template>
  <article class="card overflow-hidden">
    <!-- Kop -->
    <header class="flex items-start gap-3 px-4 pb-3 pt-3.5">
      <RouterLink :to="`/u/${post.userName}`" class="shrink-0" :aria-label="$t('posts.profileOf', { name: post.displayName })">
        <Avatar :src="post.profilePhotoUrl" :name="post.displayName" size="md" />
      </RouterLink>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline gap-x-1.5">
          <RouterLink :to="`/u/${post.userName}`" class="truncate text-sm font-extrabold text-ink hover:underline">{{ post.displayName }}</RouterLink>
          <span class="text-xs font-medium text-muted">@{{ post.userName }} · <time :datetime="post.createdAtUtc">{{ timeAgo(post.createdAtUtc) }}</time></span>
        </div>
        <RouterLink
          v-if="post.tripId"
          :to="`/trips/${post.tripId}`"
          class="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs font-bold text-accent-700 hover:underline"
        >
          <Icon name="pin" :size="13" />
          <span class="truncate">{{ post.tripTitle }}<template v-if="post.tripStopName"> · {{ post.tripStopName }}</template></span>
        </RouterLink>
      </div>

      <div v-click-outside="() => (menuOpen = false)" class="relative -mr-1.5">
        <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('posts.moreOptions')" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          <Icon name="more" :size="18" />
        </button>
        <div v-if="menuOpen" class="menu right-0 top-full mt-1" role="menu">
          <button type="button" class="menu-item" role="menuitem" @click="copyLink"><Icon name="link" :size="16" /> {{ $t('posts.copyLink') }}</button>
          <template v-if="isOwner">
            <button type="button" class="menu-item" role="menuitem" @click="startEdit"><Icon name="edit" :size="16" /> {{ $t('common.edit') }}</button>
            <button type="button" class="menu-item menu-item-danger" role="menuitem" @click="onDelete"><Icon name="trash" :size="16" /> {{ $t('common.delete') }}</button>
          </template>
          <button v-else type="button" class="menu-item" role="menuitem" @click="openReport"><Icon name="flag" :size="16" /> {{ $t('posts.report') }}</button>
        </div>
      </div>
    </header>

    <!-- Video -->
    <VideoPlayer
      v-if="post.videoUrl"
      :src="post.videoUrl"
      :poster="post.videoPosterUrl"
      :duration-seconds="post.videoDurationSeconds"
      :label="$t('posts.video.labelOf', { name: post.displayName })"
    />

    <!-- Foto's -->
    <div v-if="images.length" class="relative select-none bg-gray-100" @dblclick="likeFromImage">
      <div class="overflow-hidden">
        <div class="flex transition-transform duration-300 ease-out" :style="{ transform: `translateX(-${current * 100}%)` }">
          <img
            v-for="(url, i) in images"
            :key="url + i"
            :src="url"
            :alt="post.caption ? $t('posts.photoWithCaption', { caption: post.caption.slice(0, 80) }) : $t('posts.photoOf', { n: i + 1, name: post.displayName })"
            class="max-h-[560px] w-full shrink-0 object-cover"
            loading="lazy"
            draggable="false"
          />
        </div>
      </div>
      <template v-if="images.length > 1">
        <button v-if="current > 0" type="button" class="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink hover:bg-surface" :aria-label="$t('posts.prevPhoto')" @click.stop="current--">
          <Icon name="chevron-left" :size="18" />
        </button>
        <button v-if="current < images.length - 1" type="button" class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink hover:bg-surface" :aria-label="$t('posts.nextPhoto')" @click.stop="current++">
          <Icon name="chevron-right" :size="18" />
        </button>
        <span class="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-bold text-white">{{ current + 1 }}/{{ images.length }}</span>
        <div class="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          <button
            v-for="(_, i) in images"
            :key="i"
            type="button"
            class="h-1.5 rounded-full transition-all"
            :class="i === current ? 'w-4 bg-surface' : 'w-1.5 bg-surface/60'"
            :aria-label="$t('posts.photoN', { n: i + 1 })"
            @click.stop="current = i"
          />
        </div>
      </template>
      <Transition name="pop">
        <span v-if="burst" class="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
          <Icon name="heart" :size="88" filled :stroke-width="0" class="drop-shadow-lg" />
        </span>
      </Transition>
    </div>

    <!-- Acties -->
    <div class="flex items-center gap-1 px-2.5 pt-2">
      <button
        type="button"
        class="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-extrabold transition hover:bg-gray-100"
        :class="post.likedByMe ? 'text-accent-700' : 'text-ink'"
        :aria-pressed="post.likedByMe"
        :aria-label="post.likedByMe ? $t('posts.unlike') : $t('posts.like')"
        @click="toggleLike"
      >
        <Icon name="heart" :size="20" :filled="post.likedByMe" />
        <span v-if="post.likeCount" class="tabular-nums">{{ post.likeCount }}</span>
      </button>
      <button
        type="button"
        class="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-extrabold text-ink transition hover:bg-gray-100"
        :aria-expanded="commentsOpen"
        :aria-label="$t('posts.comments')"
        @click="commentsOpen = !commentsOpen"
      >
        <Icon name="chat" :size="20" />
        <span v-if="post.commentCount" class="tabular-nums">{{ post.commentCount }}</span>
      </button>
      <button type="button" class="btn-icon ml-auto h-9 w-9" :aria-label="$t('posts.share')" @click="share">
        <Icon name="share" :size="19" />
      </button>
    </div>

    <!-- Tekst -->
    <div class="px-4 pb-4 pt-1">
      <template v-if="!editing">
        <p v-if="post.caption" class="text-[15px] leading-relaxed text-ink">
          <RouterLink :to="`/u/${post.userName}`" class="mr-1.5 font-extrabold hover:underline">{{ post.displayName }}</RouterLink>
          <MentionText :text="translatedCaption ?? post.caption" />
        </p>
        <TranslateButton v-if="post.caption && !isOwner"v-model="translatedCaption" kind="post" :id="post.id" :text="post.caption" class="mt-1" />
        <button
          v-if="post.commentCount > 0 && !commentsOpen"
          type="button"
          class="mt-1.5 text-sm font-semibold text-muted hover:text-ink"
          @click="commentsOpen = true"
        >
          {{ $t('posts.viewComments', post.commentCount) }}
        </button>
      </template>

      <form v-else class="space-y-2" @submit.prevent="saveEdit">
        <MentionInput ref="editInput" v-model="editCaption" multiline :rows="3" :maxlength="2200" input-class="textarea" :aria-label="$t('posts.editText')" />
        <div class="flex gap-2">
          <button type="submit" class="btn btn-dark btn-sm" :disabled="savingEdit">{{ savingEdit ? $t('common.saving') : $t('common.save') }}</button>
          <button type="button" class="btn btn-ghost btn-sm" @click="editing = false">{{ $t('common.cancel') }}</button>
        </div>
      </form>
    </div>

    <!-- Reacties -->
    <div v-if="commentsOpen" class="border-t border-line px-4 py-4">
      <CommentThread
        :api="commentApi"
        translate-kind="comment"
        :moderator-user-name="post.userName"
        :autofocus="!initiallyOpen"
        @count="post.commentCount = Math.max(0, post.commentCount + $event)"
      />
    </div>

    <ReportDialog v-model="reportOpen" target-type="post" :target-id="post.id" />
  </article>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from './ui/Avatar.vue'
import Icon from './ui/Icon.vue'
import MentionText from './MentionText.vue'
import MentionInput from './MentionInput.vue'
import TranslateButton from './TranslateButton.vue'
import VideoPlayer from './VideoPlayer.vue'
import CommentThread from './comments/CommentThread.vue'
import ReportDialog from './ReportDialog.vue'
import * as postsApi from '@/api/postsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'
import { shareContent } from '@/services/share'
import { publicWebOrigin } from '@/services/native'
import { timeAgo } from '@/utils/date'

const props = defineProps({
  post: { type: Object, required: true },
  initiallyOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['deleted'])

const auth = useAuthStore()
const toast = useToastStore()
const { t } = useI18n()

const isOwner = computed(() => !!auth.userName && auth.userName === props.post.userName)
const images = computed(() => (props.post.imageUrls?.length ? props.post.imageUrls : props.post.imageUrl ? [props.post.imageUrl] : []))

const current = ref(0)
const menuOpen = ref(false)
const commentsOpen = ref(props.initiallyOpen)
const reportOpen = ref(false)
const burst = ref(false)

const commentApi = {
  list: () => postsApi.getComments(props.post.id),
  add: (text, parentId) => postsApi.addComment(props.post.id, text, parentId),
  update: (id, text) => postsApi.updateComment(id, text),
  remove: (id) => postsApi.deleteComment(id),
}

async function toggleLike() {
  const post = props.post
  post.likedByMe = !post.likedByMe
  post.likeCount += post.likedByMe ? 1 : -1
  try {
    await postsApi.toggleLike(post.id)
  } catch {
    post.likedByMe = !post.likedByMe
    post.likeCount += post.likedByMe ? 1 : -1
    toast.error(t('posts.failedRetry'))
  }
}

function likeFromImage() {
  burst.value = true
  setTimeout(() => { burst.value = false }, 600)
  if (!props.post.likedByMe) toggleLike()
}

function postUrl() {
  return `${publicWebOrigin()}/posts/${props.post.id}`
}

async function copyLink() {
  menuOpen.value = false
  try {
    await navigator.clipboard.writeText(postUrl())
    toast.success(t('posts.linkCopied'))
  } catch {
    toast.error(t('posts.copyFailed'))
  }
}

async function share() {
  // Systeem-deelmenu: @capacitor/share in de native app, anders de Web Share API; zonder deelmenu de link kopiëren.
  const result = await shareContent({ title: t('posts.shareTitle', { name: props.post.displayName }), text: props.post.caption?.slice(0, 120) || '', url: postUrl() })
  if (result === 'unavailable') copyLink()
}

function openReport() {
  menuOpen.value = false
  reportOpen.value = true
}

// ---------- bewerken / verwijderen ----------
const editing = ref(false)
const editCaption = ref('')
const translatedCaption = ref(null)
const savingEdit = ref(false)
const editInput = ref(null)

function startEdit() {
  menuOpen.value = false
  editCaption.value = props.post.caption
  editing.value = true
  nextTick(() => editInput.value?.focus())
}

async function saveEdit() {
  if (savingEdit.value) return
  savingEdit.value = true
  try {
    const updated = await postsApi.updatePost(props.post.id, {
      caption: editCaption.value.trim(),
      imageUrls: props.post.imageUrls,
      tripId: props.post.tripId,
      tripStopId: props.post.tripStopId,
      // Volledige gewenste staat: zonder videoUrl zou de API de video verwijderen.
      videoUrl: props.post.videoUrl,
      videoDurationSeconds: props.post.videoDurationSeconds,
    })
    Object.assign(props.post, updated)
    editing.value = false
    toast.success(t('posts.updated'))
  } catch (e) {
    toast.error(errorMessage(e, t('posts.saveFailed')))
  } finally {
    savingEdit.value = false
  }
}

async function onDelete() {
  menuOpen.value = false
  const ok = await confirm({
    title: t('posts.deleteTitle'),
    message: t('posts.deleteText'),
    confirmLabel: t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  try {
    await postsApi.deletePost(props.post.id)
    emit('deleted', props.post.id)
    toast.success(t('posts.deleted'))
  } catch (e) {
    toast.error(errorMessage(e, t('posts.deleteFailed')))
  }
}
</script>

<style scoped>
.pop-enter-active {
  animation: heart-pop 0.6s ease-out;
}
.pop-leave-active {
  transition: opacity 0.2s;
}
.pop-leave-to {
  opacity: 0;
}
@keyframes heart-pop {
  0% { transform: scale(0.4); opacity: 0; }
  40% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.95; }
}
</style>
