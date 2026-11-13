<template>
  <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <RouterLink
        v-if="backTo"
        :to="backTo"
        class="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-ink"
      >
        <Icon name="chevron-left" :size="16" />
        {{ backLabel || $t('ui.back') }}
      </RouterLink>
      <p v-if="eyebrow" class="eyebrow-accent mb-1">{{ eyebrow }}</p>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-muted">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
import Icon from './Icon.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  backTo: { type: [String, Object], default: null },
  backLabel: { type: String, default: '' },
})
</script>
