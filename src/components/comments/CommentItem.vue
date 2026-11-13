<template>
  <div class="group flex items-start gap-2.5">
    <RouterLink :to="`/u/${comment.userName}`" class="shrink-0" :aria-label="$t('comments.profileOf', { name: comment.displayName })">
      <Avatar :src="comment.profilePhotoUrl" :name="comment.displayName" :size="small ? 'xs' : 'sm'" />
    </RouterLink>

    <div class="min-w-0 flex-1">
      <template v-if="!editing">
        <div class="inline-block max-w-full rounded-2xl rounded-tl-md bg-gray-100 px-3.5 py-2">
          <RouterLink :to="`/u/${comment.userName}`" class="block text-xs font-extrabold text-ink hover:underline">
            {{ comment.displayName }}
          </RouterLink>
          <p class="mt-0.5 text-sm leading-snug text-ink"><MentionText :text="translated ?? comment.text" /></p>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-3.5 text-xs">
          <time class="text-muted" :datetime="comment.createdAtUtc">{{ timeAgo(comment.createdAtUtc) }}</time>
          <button v-if="canReply" type="button" class="font-bold text-muted hover:text-ink" @click="$emit('reply')">{{ $t('comments.reply') }}</button>
          <button v-if="isMine" type="button" class="font-bold text-muted hover:text-ink" @click="startEdit">{{ $t('common.edit') }}</button>
          <button v-if="isMine || canModerate" type="button" class="font-bold text-red-600 hover:text-red-700" @click="$emit('delete')">{{ $t('common.delete') }}</button>
          <TranslateButton v-if="translateKind && !isMine" v-model="translated" :kind="translateKind" :id="comment.id" :text="comment.text" />
        </div>
      </template>

      <form v-else class="space-y-2" @submit.prevent="save">
        <MentionInput
          ref="editInput"
          v-model="draft"
          multiline
          :rows="2"
          :maxlength="1000"
          :aria-label="$t('comments.editComment')"
          input-class="textarea"
          submit-on-enter
          @submit="save"
        />
        <div class="flex gap-2">
          <button type="submit" class="btn btn-dark btn-sm" :disabled="saving || !draft.trim()">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
          <button type="button" class="btn btn-ghost btn-sm" @click="editing = false">{{ $t('common.cancel') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import Avatar from '../ui/Avatar.vue'
import MentionText from '../MentionText.vue'
import MentionInput from '../MentionInput.vue'
import TranslateButton from '../TranslateButton.vue'
import { useAuthStore } from '@/stores/auth'
import { timeAgo } from '@/utils/date'

const props = defineProps({
  comment: { type: Object, required: true },
  small: { type: Boolean, default: false },
  canReply: { type: Boolean, default: true },
  canModerate: { type: Boolean, default: false },
  saveEdit: { type: Function, required: true },
  translateKind: { type: String, default: '' },
})
defineEmits(['reply', 'delete'])

const auth = useAuthStore()
const isMine = computed(() => auth.userName && auth.userName === props.comment.userName)

const translated = ref(null)
const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const editInput = ref(null)

function startEdit() {
  draft.value = props.comment.text
  editing.value = true
  nextTick(() => editInput.value?.focus())
}

async function save() {
  if (!draft.value.trim() || saving.value) return
  saving.value = true
  try {
    await props.saveEdit(props.comment, draft.value.trim())
    editing.value = false
  } finally {
    saving.value = false
  }
}
</script>
