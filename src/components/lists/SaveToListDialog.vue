<template>
  <Modal :model-value="modelValue" :title="$t('lists.save.title')" :subtitle="stop?.name || ''" size="sm" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="loading" class="space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-12 rounded-xl" /></div>
    <template v-else>
      <ul v-if="lists.length" class="-mx-1 space-y-1">
        <li v-for="l in lists" :key="l.id">
          <button type="button" class="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-gray-50" :disabled="busyId === l.id" @click="toggle(l)">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-muted">
              <img v-if="l.previewImageUrls?.[0]" :src="thumbUrl(l.previewImageUrls[0])" alt="" class="h-full w-full object-cover" />
              <Icon v-else name="list" :size="18" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-extrabold text-ink">{{ l.name }}</span>
              <span class="block text-xs text-muted">{{ $t('lists.places', { n: l.itemCount }) }} · {{ l.isPublic ? $t('common.public') : $t('common.private') }}</span>
            </span>
            <span class="flex h-6 w-6 items-center justify-center rounded-full border-2 transition" :class="l.containsStop ? 'border-accent-700 bg-accent-700 text-white' : 'border-line-strong'">
              <Icon v-if="l.containsStop" name="check" :size="14" :stroke-width="3" />
            </span>
          </button>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">{{ $t('lists.save.none') }}</p>

      <form class="mt-4 space-y-2 border-t border-line pt-4" @submit.prevent="createAndAdd">
        <label for="new-list-name" class="label">{{ $t('lists.save.newList') }}</label>
        <div class="flex gap-2">
          <input id="new-list-name" v-model.trim="newName" class="input flex-1" maxlength="80" :placeholder="$t('lists.namePlaceholder')" />
          <button type="submit" class="btn btn-dark" :disabled="!newName || creating">{{ $t('common.create') }}</button>
        </div>
        <label class="inline-flex items-center gap-2 text-xs font-semibold text-body">
          <input v-model="newPublic" type="checkbox" class="checkbox" /> {{ $t('lists.publicLabel') }}
        </label>
      </form>
    </template>
    <template #footer>
      <RouterLink to="/lists" class="btn btn-ghost btn-sm mr-auto" @click="$emit('update:modelValue', false)">{{ $t('lists.save.manage') }}</RouterLink>
      <button type="button" class="btn btn-secondary" @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import * as listsApi from '@/api/listsApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { thumbUrl } from '@/utils/media'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Stop met minstens { id, name }. */
  stop: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'changed'])

const { t } = useI18n()
const toast = useToastStore()
const lists = ref([])
const loading = ref(false)
const busyId = ref(null)
const newName = ref('')
const newPublic = ref(false)
const creating = ref(false)

async function load() {
  if (!props.stop) return
  loading.value = true
  try {
    lists.value = await listsApi.getMyLists(props.stop.id)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

async function toggle(list) {
  busyId.value = list.id
  try {
    if (list.containsStop) {
      await listsApi.removeFromList(list.id, props.stop.id)
      list.containsStop = false
      list.itemCount = Math.max(0, list.itemCount - 1)
    } else {
      await listsApi.addToList(list.id, props.stop.id)
      list.containsStop = true
      list.itemCount += 1
      toast.success(t('lists.save.added', { list: list.name }))
    }
    emit('changed')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busyId.value = null
  }
}

async function createAndAdd() {
  creating.value = true
  try {
    const list = await listsApi.createList({ name: newName.value, description: null, isPublic: newPublic.value })
    await listsApi.addToList(list.id, props.stop.id)
    lists.value.unshift({ ...list, itemCount: 1, containsStop: true })
    toast.success(t('lists.save.added', { list: list.name }))
    newName.value = ''
    emit('changed')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    creating.value = false
  }
}

watch(() => props.modelValue, (open) => { if (open) load() })
</script>
