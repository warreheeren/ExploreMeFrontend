<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label || undefined"
    :disabled="disabled"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="modelValue ? 'bg-accent-700' : 'bg-gray-300'"
    @click.prevent="$emit('update:modelValue', !modelValue)"
  >
    <span class="inline-block h-5 w-5 rounded-full bg-white shadow transition" :class="modelValue ? 'translate-x-[22px]' : 'translate-x-0.5'" />
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>
