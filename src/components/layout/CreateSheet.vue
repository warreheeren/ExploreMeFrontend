<template>
  <Modal :model-value="modelValue" :title="$t('shell.create.title')" size="sm" @update:model-value="$emit('update:modelValue', $event)">
    <div class="space-y-2">
      <button type="button" class="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left transition hover:border-line-strong hover:bg-gray-50" @click="$emit('post')">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-surface"><Icon name="image" :size="20" /></span>
        <span>
          <span class="block text-sm font-bold text-ink">{{ $t('shell.create.post') }}</span>
          <span class="block text-xs text-muted">{{ $t('shell.create.postHint') }}</span>
        </span>
      </button>
      <RouterLink to="/trips/new" class="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left transition hover:border-line-strong hover:bg-gray-50" @click="$emit('update:modelValue', false)">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-700 text-white"><Icon name="map" :size="20" /></span>
        <span>
          <span class="block text-sm font-bold text-ink">{{ $t('shell.create.trip') }}</span>
          <span class="block text-xs text-muted">{{ $t('shell.create.tripHint') }}</span>
        </span>
      </RouterLink>
      <button v-if="!safety.active" type="button" class="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left transition hover:border-line-strong hover:bg-gray-50" @click="openSafety">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-ink"><Icon name="shield" :size="20" /></span>
        <span>
          <span class="block text-sm font-bold text-ink">{{ $t('safety.title') }}</span>
          <span class="block text-xs text-muted">{{ $t('safety.menuHint') }}</span>
        </span>
      </button>
    </div>
  </Modal>
  <SafetyCheckInDialog v-model="safetyOpen" />
</template>

<script setup>
import { ref } from 'vue'
import Modal from '../ui/Modal.vue'
import Icon from '../ui/Icon.vue'
import SafetyCheckInDialog from '../safety/SafetyCheckInDialog.vue'
import { useSafetyStore } from '@/stores/safety'

defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'post'])

const safety = useSafetyStore()
const safetyOpen = ref(false)

function openSafety() {
  emit('update:modelValue', false)
  safetyOpen.value = true
}
</script>
