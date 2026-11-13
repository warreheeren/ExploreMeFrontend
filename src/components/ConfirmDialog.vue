<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
        @pointerdown.self="onCancel"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="confirm-panel w-full max-w-sm rounded-3xl bg-surface p-6 shadow-pop"
        >
          <div
            class="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
            :class="variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-accent-50 text-accent-700'"
          >
            <Icon :name="variant === 'danger' ? 'alert' : 'info'" :size="20" />
          </div>
          <h3 :id="titleId" class="text-lg font-extrabold tracking-tight text-ink">{{ title || $t('ui.confirm.title') }}</h3>
          <p v-if="message || $slots.default" class="mt-1.5 text-sm leading-relaxed text-body">
            <slot>{{ message }}</slot>
          </p>
          <p v-if="warning" class="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            <Icon name="alert" :size="14" class="mt-px" />
            <span>{{ warning }}</span>
          </p>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button ref="cancelRef" type="button" class="btn btn-secondary" :disabled="loading" @click="onCancel">
              {{ cancelLabel || $t('ui.confirm.cancel') }}
            </button>
            <button
              ref="confirmRef"
              type="button"
              class="btn"
              :class="variant === 'danger' ? 'btn-danger' : 'btn-dark'"
              :disabled="loading"
              @click="onConfirm"
            >
              <span v-if="loading" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {{ loading ? loadingLabel || $t('ui.confirm.busy') : confirmLabel || $t('ui.confirm.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './ui/Icon.vue'
import { lockScroll, unlockScroll } from '@/utils/scrollLock'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // Lege standaardwaarden: de template valt terug op de vertaling, zodat taalwissels meteen zichtbaar zijn.
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  warning: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  cancelLabel: { type: String, default: '' },
  loadingLabel: { type: String, default: '' },
  variant: { type: String, default: 'default' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const titleId = `confirm-${Math.random().toString(36).slice(2, 9)}`
const cancelRef = ref(null)
const confirmRef = ref(null)
let locked = false

function onCancel() {
  if (props.loading) return
  emit('cancel')
  emit('update:modelValue', false)
}

function onConfirm() {
  if (props.loading) return
  emit('confirm')
}

function onKey(e) {
  if (e.key === 'Escape') onCancel()
}

function setOpen(open) {
  if (open && !locked) {
    lockScroll()
    locked = true
    document.addEventListener('keydown', onKey)
    // Bij destructieve acties staat de focus veilig op "Annuleren".
    nextTick(() => (props.variant === 'danger' ? cancelRef.value : confirmRef.value)?.focus())
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
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.16s ease;
}
.confirm-fade-enter-active .confirm-panel {
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
.confirm-fade-enter-from .confirm-panel {
  transform: scale(0.96);
}
</style>
