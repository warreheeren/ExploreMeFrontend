<template>
  <Modal :model-value="modelValue" :title="title || $t('users.searchTitle')" :subtitle="subtitle" :padded="false" @update:model-value="$emit('update:modelValue', $event)">
    <div class="border-b border-line p-4">
      <div class="relative">
        <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          v-model="query"
          type="search"
          autofocus
          class="search-pill"
          :placeholder="$t('users.searchPlaceholder')"
          :aria-label="$t('users.searchAria')"
          @input="onInput"
        />
      </div>
    </div>

    <div class="max-h-[50vh] min-h-[160px] overflow-y-auto py-1">
      <div v-if="loading" class="flex justify-center py-8"><Spinner /></div>
      <p v-else-if="!query.trim()" class="px-5 py-8 text-center text-sm text-muted">{{ $t('users.startTyping') }}</p>
      <p v-else-if="!visible.length" class="px-5 py-8 text-center text-sm text-muted">{{ $t('users.noResults', { query }) }}</p>
      <ul v-else>
        <li v-for="user in visible" :key="user.userName">
          <button type="button" class="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-gray-50 disabled:opacity-60" :disabled="busyUserName === user.userName" @click="$emit('select', user)">
            <Avatar :src="user.profilePhotoUrl" :name="user.displayName" size="md" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-bold text-ink">{{ user.displayName }}</span>
              <span class="block truncate text-xs text-muted">@{{ user.userName }}</span>
            </span>
            <span class="btn btn-secondary btn-sm">{{ busyUserName === user.userName ? $t('users.busy') : actionLabel || $t('users.choose') }}</span>
          </button>
        </li>
      </ul>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Modal from './ui/Modal.vue'
import Avatar from './ui/Avatar.vue'
import Icon from './ui/Icon.vue'
import Spinner from './ui/Spinner.vue'
import * as followApi from '@/api/followApi'
import { useDebounceFn } from '@/composables/useDebounce'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // Leeg = standaardteksten uit de vertalingen.
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  exclude: { type: Array, default: () => [] },
  busyUserName: { type: String, default: '' },
})
defineEmits(['update:modelValue', 'select'])

const auth = useAuthStore()
const query = ref('')
const results = ref([])
const loading = ref(false)

const visible = computed(() => {
  const excluded = new Set([auth.userName, ...props.exclude].filter(Boolean).map((u) => u.toLowerCase()))
  return results.value.filter((u) => !excluded.has(u.userName.toLowerCase()))
})

const runSearch = useDebounceFn(async () => {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    loading.value = false
    return
  }
  try {
    results.value = await followApi.searchUsers(q, 12)
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}, 250)

function onInput() {
  loading.value = !!query.value.trim()
  runSearch()
}

watch(() => props.modelValue, (open) => {
  if (open) {
    query.value = ''
    results.value = []
  }
})
</script>
