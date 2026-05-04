<template>
  <div class="inline-flex items-center gap-0.5">
    <button
      v-for="i in max"
      :key="i"
      type="button"
      :disabled="readonly"
      @click="readonly ? null : emit('update:modelValue', i)"
      class="relative leading-none"
      :class="readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition'"
    >
      <svg
        :class="[sizeClass, starColor(i)]"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <svg
        v-if="isHalf(i)"
        :class="[sizeClass, 'text-yellow-400 absolute inset-0']"
        fill="currentColor"
        viewBox="0 0 20 20"
        style="clip-path: inset(0 50% 0 0);"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
    <span v-if="showValue" class="ml-1 text-xs font-semibold text-gray-700">
      {{ displayValue }}<span v-if="count != null" class="text-gray-400 font-normal"> ({{ count }})</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  max: { type: Number, default: 5 },
  size: { type: String, default: 'sm' },
  readonly: { type: Boolean, default: true },
  showValue: { type: Boolean, default: false },
  count: { type: Number, default: null },
})

const emit = defineEmits(['update:modelValue'])

const sizeClass = computed(() => ({
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}[props.size] || 'w-3.5 h-3.5'))

function starColor(i) {
  if (i <= Math.floor(props.modelValue)) return 'text-yellow-400'
  return 'text-gray-200'
}

function isHalf(i) {
  const v = props.modelValue
  return i === Math.ceil(v) && v !== Math.floor(v) && (v - Math.floor(v)) >= 0.5
}

const displayValue = computed(() => Number.isInteger(props.modelValue)
  ? props.modelValue.toFixed(0)
  : props.modelValue.toFixed(1))
</script>
