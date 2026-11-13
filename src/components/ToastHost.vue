<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-20 z-[120] flex flex-col items-center gap-2 px-4 md:bottom-6"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts.items"
        :key="t.id"
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-[#1f2937] px-4 py-3 text-sm text-white shadow-pop ring-1 ring-white/10"
        :role="t.type === 'error' ? 'alert' : 'status'"
      >
        <span
          class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          :class="{
            'bg-accent-500 text-ink': t.type === 'success',
            'bg-red-500 text-white': t.type === 'error',
            'bg-white/15 text-white': t.type === 'info',
          }"
        >
          <Icon :name="t.type === 'success' ? 'check' : t.type === 'error' ? 'alert' : 'info'" :size="13" :stroke-width="2.5" />
        </span>
        <p class="min-w-0 flex-1 font-semibold leading-snug">{{ t.message }}</p>
        <RouterLink
          v-if="t.action?.to"
          :to="t.action.to"
          class="shrink-0 font-extrabold text-[#5EEAD4] hover:text-[#99F6E4]"
          @click="toasts.dismiss(t.id)"
        >
          {{ t.action.label }}
        </RouterLink>
        <button type="button" class="-mr-1 shrink-0 rounded-full p-0.5 text-white/60 hover:text-white" :aria-label="$t('ui.closeToast')" @click="toasts.dismiss(t.id)">
          <Icon name="x" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
import Icon from './ui/Icon.vue'

const toasts = useToastStore()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
