<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        @click.self="onCancel"
      >
        <Transition name="modal-content" appear>
          <div
            v-if="modelValue"
            class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            @click.stop
          >
            <!-- Icon header -->
            <div
              class="flex items-center justify-center h-20"
              :class="variant === 'danger'
                ? 'bg-gradient-to-br from-red-500 to-red-600'
                : 'bg-gradient-to-br from-primary-500 to-primary-600'"
            >
              <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                <svg v-if="variant === 'danger'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>

            <!-- Body -->
            <div class="px-6 pt-5 pb-2 text-center">
              <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
              <p class="text-sm text-gray-600 mt-2 leading-relaxed">
                <slot>{{ message }}</slot>
              </p>
              <p v-if="warning" class="text-xs text-red-600 font-medium mt-3 px-3 py-2 bg-red-50 ring-1 ring-red-100 rounded-lg">
                ⚠️ {{ warning }}
              </p>
            </div>

            <!-- Buttons -->
            <div class="flex items-center gap-2 p-4 bg-gray-50/50">
              <button
                @click="onCancel"
                :disabled="loading"
                class="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white ring-1 ring-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
              >
                {{ cancelLabel }}
              </button>
              <button
                @click="onConfirm"
                :disabled="loading"
                class="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                :class="variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-900 hover:bg-gray-800'"
              >
                <span v-if="loading" class="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                {{ loading ? loadingLabel : confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Weet je het zeker?' },
  message: { type: String, default: '' },
  warning: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Bevestig' },
  cancelLabel: { type: String, default: 'Annuleren' },
  loadingLabel: { type: String, default: 'Bezig...' },
  variant: { type: String, default: 'default' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

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
  if (!props.modelValue) return
  if (e.key === 'Escape') onCancel()
  if (e.key === 'Enter') onConfirm()
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))

// Lock body scroll while open
watch(() => props.modelValue, (val) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = val ? 'hidden' : ''
})
</script>

<style scoped>
.modal-backdrop-enter-active,
.modal-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.modal-backdrop-enter-from,
.modal-backdrop-leave-to {
  opacity: 0;
}

.modal-content-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-content-leave-active {
  transition: all 0.18s ease-in;
}
.modal-content-enter-from {
  opacity: 0;
  transform: scale(0.94) translateY(8px);
}
.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
