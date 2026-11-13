<template>
  <ConfirmDialog
    :model-value="confirmState.open"
    :title="confirmState.title"
    :message="confirmState.message"
    :warning="confirmState.warning"
    :confirm-label="confirmState.confirmLabel"
    :cancel-label="confirmState.cancelLabel"
    :variant="confirmState.variant"
    @confirm="resolveConfirm(true)"
    @cancel="resolveConfirm(false)"
  />
</template>

<script setup>
import ConfirmDialog from './ConfirmDialog.vue'
import { confirmState, resolveConfirm } from '@/composables/useConfirm'
</script>
