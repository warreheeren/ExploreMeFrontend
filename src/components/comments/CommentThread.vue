<template>
  <div>
    <div v-if="loading" class="space-y-3 py-1" aria-busy="true">
      <div v-for="i in 2" :key="i" class="flex gap-2.5">
        <div class="skeleton h-8 w-8 rounded-full" />
        <div class="skeleton h-12 flex-1 rounded-2xl" />
      </div>
    </div>

    <p v-else-if="loadError" class="py-2 text-sm text-red-600">
      {{ loadError }}
      <button type="button" class="link ml-1" @click="load">{{ $t('comments.again') }}</button>
    </p>

    <ul v-else-if="threads.length" class="space-y-4">
      <li v-for="t in threads" :key="t.comment.id">
        <CommentItem
          :comment="t.comment"
          :translate-kind="translateKind"
          :can-moderate="canModerate"
          :save-edit="saveEdit"
          @reply="startReply(t.comment)"
          @delete="remove(t.comment)"
        />
        <ul v-if="t.replies.length" class="ml-[42px] mt-3 space-y-3 border-l-2 border-line pl-3">
          <li v-for="r in t.replies" :key="r.id">
            <CommentItem
              :comment="r"
              small
              :translate-kind="translateKind"
              :can-moderate="canModerate"
              :save-edit="saveEdit"
              @reply="startReply(t.comment, r)"
              @delete="remove(r)"
            />
          </li>
        </ul>
      </li>
    </ul>

    <p v-else class="py-2 text-sm text-muted">{{ emptyText || $t('comments.empty') }}</p>

    <form v-if="canComment" class="mt-4" @submit.prevent="submit">
      <div v-if="replyTo" class="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
        <Icon name="reply" :size="14" />
        {{ $t('comments.replyingTo') }} <span class="font-extrabold text-ink">{{ replyTo.displayName }}</span>
        <button type="button" class="ml-1 font-bold text-accent-700 hover:underline" @click="cancelReply">{{ $t('common.cancel') }}</button>
      </div>
      <div class="flex items-end gap-2">
        <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" size="sm" class="mb-1 hidden sm:inline-flex" />
        <div class="min-w-0 flex-1">
          <MentionInput
            ref="inputRef"
            v-model="draft"
            multiline
            :rows="1"
            :maxlength="1000"
            :placeholder="replyTo ? $t('comments.replyPlaceholder') : placeholder || $t('comments.placeholder')"
            input-class="textarea min-h-[42px] rounded-2xl py-2.5"
            submit-on-enter
            drop-up
            @submit="submit"
          />
        </div>
        <button type="submit" class="btn btn-dark h-[42px] px-4" :disabled="sending || !draft.trim()">
          <Icon name="send" :size="16" />
          <span class="hidden sm:inline">{{ sending ? $t('comments.busy') : $t('comments.submit') }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from '../ui/Avatar.vue'
import Icon from '../ui/Icon.vue'
import MentionInput from '../MentionInput.vue'
import CommentItem from './CommentItem.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'

/**
 * Reacties met één niveau antwoorden. De API wordt via een adapter meegegeven:
 * { list(), add(text, parentId), update(id, text), remove(id) }.
 */
const props = defineProps({
  api: { type: Object, required: true },
  moderatorUserName: { type: String, default: '' },
  // Leeg = standaardteksten uit de vertalingen.
  placeholder: { type: String, default: '' },
  emptyText: { type: String, default: '' },
  canComment: { type: Boolean, default: true },
  autofocus: { type: Boolean, default: false },
  // Vertaalsoort van de reacties ('comment' | 'tripComment'); leeg = geen vertaalknop.
  translateKind: { type: String, default: '' },
})
const emit = defineEmits(['count'])

const auth = useAuthStore()
const toast = useToastStore()
const { t } = useI18n()

const comments = ref([])
const loading = ref(true)
const loadError = ref('')
const draft = ref('')
const sending = ref(false)
const replyTo = ref(null)
const inputRef = ref(null)

const canModerate = computed(() => !!auth.userName && auth.userName === props.moderatorUserName)

const threads = computed(() => {
  const byId = new Map(comments.value.map((c) => [c.id, c]))
  const roots = []
  const replies = new Map()
  for (const c of comments.value) {
    if (c.parentCommentId && byId.has(c.parentCommentId)) {
      if (!replies.has(c.parentCommentId)) replies.set(c.parentCommentId, [])
      replies.get(c.parentCommentId).push(c)
    } else {
      roots.push(c)
    }
  }
  return roots.map((comment) => ({ comment, replies: replies.get(comment.id) || [] }))
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    comments.value = await props.api.list()
  } catch (e) {
    loadError.value = errorMessage(e, t('comments.loadFailed'))
  } finally {
    loading.value = false
  }
}

function startReply(root, target = root) {
  replyTo.value = root
  if (!draft.value.trim() && target.userName !== auth.userName) draft.value = `@${target.userName} `
  nextTick(() => inputRef.value?.focus())
}

function cancelReply() {
  replyTo.value = null
}

async function submit() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  try {
    const created = await props.api.add(text, replyTo.value?.id || null)
    comments.value.push(created)
    draft.value = ''
    replyTo.value = null
    emit('count', 1)
  } catch (e) {
    toast.error(errorMessage(e, t('comments.postFailed')))
  } finally {
    sending.value = false
  }
}

async function saveEdit(comment, text) {
  try {
    const updated = await props.api.update(comment.id, text)
    comment.text = updated.text
  } catch (e) {
    toast.error(errorMessage(e, t('comments.saveFailed')))
    throw e
  }
}

async function remove(comment) {
  const replyCount = comments.value.filter((c) => c.parentCommentId === comment.id).length
  const ok = await confirm({
    title: t('comments.deleteTitle'),
    message: replyCount ? t('comments.deleteReplies', replyCount) : t('comments.deleteText'),
    confirmLabel: t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  try {
    await props.api.remove(comment.id)
    comments.value = comments.value.filter((c) => c.id !== comment.id && c.parentCommentId !== comment.id)
    emit('count', -(1 + replyCount))
  } catch (e) {
    toast.error(errorMessage(e, t('comments.deleteFailed')))
  }
}

onMounted(async () => {
  await load()
  if (props.autofocus) nextTick(() => inputRef.value?.focus())
})

defineExpose({ reload: load, focus: () => inputRef.value?.focus() })
</script>
