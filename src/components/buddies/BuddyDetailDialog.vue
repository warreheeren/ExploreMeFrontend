<template>
  <Modal :model-value="modelValue" :title="$t('buddies.detail.title')" size="lg" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="loading" class="space-y-3" aria-busy="true"><div class="skeleton h-12 w-2/3" /><div class="skeleton h-24" /></div>

    <div v-else-if="post" class="space-y-5">
      <header class="flex items-center gap-3">
        <RouterLink :to="`/u/${post.userName}`"><Avatar :src="post.profilePhotoUrl" :name="post.displayName" size="md" /></RouterLink>
        <div class="min-w-0 flex-1">
          <RouterLink :to="`/u/${post.userName}`" class="block truncate text-sm font-extrabold text-ink hover:underline">{{ post.displayName }}</RouterLink>
          <p class="text-xs text-muted">{{ timeAgo(post.createdAtUtc) }}</p>
        </div>
        <span v-if="post.matchesMyPlans" class="chip chip-accent h-6"><Icon name="sparkle" :size="12" /> {{ $t('buddies.card.match') }}</span>
      </header>

      <section>
        <p class="flex items-center gap-2 text-lg font-extrabold text-ink">
          <span v-if="flag" class="text-xl leading-none" aria-hidden="true">{{ flag }}</span>
          {{ post.country }}<template v-if="post.region"> · {{ post.region }}</template>
        </p>
        <dl class="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div class="rounded-xl bg-gray-50 px-3 py-2">
            <dt class="text-[11px] font-bold text-muted">{{ $t('buddies.detail.period') }}</dt>
            <dd class="font-extrabold text-ink">{{ formatDateRange(post.startDate, post.endDate) }}</dd>
          </div>
          <div v-if="post.tripId" class="rounded-xl bg-gray-50 px-3 py-2">
            <dt class="text-[11px] font-bold text-muted">{{ $t('buddies.detail.linkedTrip') }}</dt>
            <dd class="truncate"><RouterLink :to="`/trips/${post.tripId}`" class="link">{{ post.tripTitle }}</RouterLink></dd>
          </div>
        </dl>
        <p class="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-body">{{ post.description }}</p>
        <p v-if="post.isClosed" class="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-muted">{{ $t('buddies.detail.closedNotice') }}</p>
      </section>

      <!-- Reacties -->
      <section v-if="post.isOwner || responses.length || canRespond">
        <h3 class="card-title mb-2">{{ post.isOwner ? $t('buddies.detail.responsesTitle') : responses.length ? $t('buddies.detail.yourResponse') : $t('buddies.detail.respondTitle') }}</h3>
        <p v-if="post.isOwner && !responses.length" class="text-sm text-muted">{{ $t('buddies.detail.noResponses') }}</p>
        <ul v-if="responses.length" class="divide-y divide-line rounded-2xl border border-line">
          <li v-for="r in responses" :key="r.id" class="flex items-start gap-3 p-3">
            <RouterLink :to="`/u/${r.userName}`"><Avatar :src="r.profilePhotoUrl" :name="r.displayName" size="sm" /></RouterLink>
            <div class="min-w-0 flex-1">
              <p class="text-sm"><RouterLink :to="`/u/${r.userName}`" class="font-extrabold text-ink hover:underline">{{ r.displayName }}</RouterLink> <span class="text-xs text-muted">· {{ timeAgo(r.createdAtUtc) }}</span></p>
              <p class="mt-0.5 whitespace-pre-line text-sm text-body">{{ r.message }}</p>
            </div>
            <RouterLink v-if="post.isOwner" :to="`/messages/${r.userName}`" class="btn btn-secondary btn-sm shrink-0"><Icon name="chat" :size="14" /> {{ $t('buddies.detail.message') }}</RouterLink>
          </li>
        </ul>

        <form v-if="canRespond" class="space-y-2" @submit.prevent="sendResponse">
          <label for="buddy-response" class="sr-only">{{ $t('buddies.detail.respondTitle') }}</label>
          <textarea id="buddy-response" v-model="message" rows="3" maxlength="1000" class="textarea" :placeholder="$t('buddies.detail.respondPlaceholder')" />
          <div class="flex justify-end">
            <button type="submit" class="btn btn-primary btn-sm" :disabled="!message.trim() || sending"><Icon name="send" :size="14" /> {{ $t('buddies.detail.send') }}</button>
          </div>
        </form>
      </section>
    </div>

    <template v-if="post" #footer>
      <template v-if="post.isOwner">
        <button type="button" class="btn btn-danger-ghost btn-sm mr-auto" :disabled="busy" @click="remove"><Icon name="trash" :size="14" /> {{ $t('common.delete') }}</button>
        <button type="button" class="btn btn-ghost btn-sm" :disabled="busy" @click="toggleClosed">{{ post.isClosed ? $t('buddies.detail.reopen') : $t('buddies.detail.close') }}</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="$emit('edit', post)"><Icon name="edit" :size="14" /> {{ $t('common.edit') }}</button>
      </template>
      <template v-else>
        <button type="button" class="btn btn-ghost btn-sm mr-auto" @click="reportOpen = true"><Icon name="flag" :size="14" /> {{ $t('buddies.detail.report') }}</button>
        <RouterLink :to="`/messages/${post.userName}`" class="btn btn-secondary btn-sm"><Icon name="chat" :size="14" /> {{ $t('buddies.detail.message') }}</RouterLink>
      </template>
    </template>
  </Modal>
  <ReportDialog v-if="post && !post.isOwner" v-model="reportOpen" target-type="buddyPost" :target-id="post.id" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import * as buddiesApi from '@/api/buddiesApi'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { flagFor } from '@/utils/countries'
import { formatDateRange, timeAgo } from '@/utils/date'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  postId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'changed', 'deleted', 'edit'])

const { t } = useI18n()
const toast = useToastStore()
const confirm = useConfirm()

const post = ref(null)
const responses = ref([])
const loading = ref(false)
const message = ref('')
const sending = ref(false)
const busy = ref(false)
const reportOpen = ref(false)

const flag = computed(() => flagFor(post.value?.country))
const canRespond = computed(() => post.value && !post.value.isOwner && !post.value.hasResponded && !post.value.isClosed)

async function load() {
  if (!props.postId) return
  loading.value = true
  message.value = ''
  try {
    const [p, r] = await Promise.all([buddiesApi.getBuddyPost(props.postId), buddiesApi.getResponses(props.postId)])
    post.value = p
    responses.value = r
  } catch (e) {
    toast.error(errorMessage(e))
    emit('update:modelValue', false)
  } finally {
    loading.value = false
  }
}

async function sendResponse() {
  sending.value = true
  try {
    const response = await buddiesApi.respond(post.value.id, message.value.trim())
    responses.value = [...responses.value, response]
    post.value = { ...post.value, hasResponded: true, responseCount: post.value.responseCount + 1 }
    message.value = ''
    toast.success(t('buddies.detail.sent'))
    emit('changed', post.value)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    sending.value = false
  }
}

async function toggleClosed() {
  busy.value = true
  try {
    post.value = post.value.isClosed ? await buddiesApi.reopenBuddyPost(post.value.id) : await buddiesApi.closeBuddyPost(post.value.id)
    toast.success(post.value.isClosed ? t('buddies.detail.closedToast') : t('buddies.detail.reopenedToast'))
    emit('changed', post.value)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function remove() {
  const ok = await confirm({ title: t('buddies.detail.deleteTitle'), message: t('buddies.detail.deleteMessage'), variant: 'danger', confirmLabel: t('common.delete') })
  if (!ok) return
  busy.value = true
  try {
    await buddiesApi.deleteBuddyPost(post.value.id)
    toast.success(t('buddies.detail.deleted'))
    emit('deleted', post.value.id)
    emit('update:modelValue', false)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

watch(() => [props.modelValue, props.postId], ([open]) => { if (open) load() }, { immediate: true })
defineExpose({ reload: load })
</script>
