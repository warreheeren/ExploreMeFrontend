<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        @pointerdown.self="onBackdrop"
      >
        <div
          ref="panelRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="modal-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-pop sm:rounded-3xl"
          :class="sizeClass"
          tabindex="-1"
        >
          <div v-if="title || $slots.header" class="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
            <slot name="header">
              <div class="min-w-0">
                <h2 :id="titleId" class="text-base font-bold text-ink">{{ title }}</h2>
                <p v-if="subtitle" class="mt-0.5 text-sm text-muted">{{ subtitle }}</p>
              </div>
            </slot>
            <button type="button" class="btn-icon btn-icon-sm -mr-1.5" :aria-label="$t('ui.close')" @click="close">
              <Icon name="x" :size="18" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto" :class="padded ? 'p-5' : ''">
            <slot />
          </div>

          <div v-if="$slots.footer" class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3 safe-bottom">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { lockScroll, unlockScroll } from '@/utils/scrollLock'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  size: { type: String, default: 'md' },
  padded: { type: Boolean, default: true },
  dismissible: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'close'])

const panelRef = ref(null)
const titleId = `modal-${Math.random().toString(36).slice(2, 9)}`
let locked = false

const sizeClass = computed(() => ({
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
}[props.size] || 'sm:max-w-md'))

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdrop() {
  if (props.dismissible) close()
}

function onKey(e) {
  if (e.key === 'Escape' && props.dismissible) close()
}

function setOpen(open) {
  if (open && !locked) {
    lockScroll()
    locked = true
    document.addEventListener('keydown', onKey)
    nextTick(() => {
      // Alleen velden met autofocus krijgen meteen focus; anders het paneel zelf (schermlezers lezen dan de titel).
      const target = panelRef.value?.querySelector('[autofocus]') || panelRef.value
      target?.focus?.()
    })
  } else if (!open && locked) {
    unlockScroll()
    locked = false
    document.removeEventListener('keydown', onKey)
  }
}

watch(() => props.modelValue, setOpen, { immediate: true })
onBeforeUnmount(() => setOpen(false))
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}
.modal-fade-enter-active .modal-panel,
.modal-fade-leave-active .modal-panel {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-panel,
.modal-fade-leave-to .modal-panel {
  transform: translateY(16px);
}
</style>
