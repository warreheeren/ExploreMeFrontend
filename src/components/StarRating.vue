<template>
  <div
    class="inline-flex items-center gap-0.5"
    :role="readonly ? 'img' : 'radiogroup'"
    :aria-label="readonly ? $t('ui2.stars.outOf', { value: displayValue, max }) : $t('ui2.stars.rating')"
  >
    <template v-if="readonly">
      <span v-for="i in max" :key="i" class="relative inline-flex">
        <Icon name="star" :size="px" :stroke-width="0" filled class="text-gray-200" />
        <span v-if="fill(i) > 0" class="absolute inset-0 overflow-hidden" :style="{ width: `${fill(i) * 100}%` }">
          <Icon name="star" :size="px" :stroke-width="0" filled class="text-rating" />
        </span>
      </span>
    </template>
    <template v-else>
      <button
        v-for="i in max"
        :key="i"
        type="button"
        role="radio"
        :aria-checked="modelValue === i"
        :aria-label="$t('ui2.stars.count', i)"
        class="rounded p-0.5 transition hover:scale-110"
        @click="emit('update:modelValue', modelValue === i ? null : i)"
      >
        <Icon name="star" :size="px" :stroke-width="0" filled :class="i <= (modelValue || 0) ? 'text-rating' : 'text-gray-200'" />
      </button>
    </template>
    <span v-if="showValue" class="ml-1 text-xs font-bold tabular-nums text-rating-text">
      {{ displayValue }}<span v-if="count != null" class="font-semibold text-muted"> ({{ count }})</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './ui/Icon.vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  max: { type: Number, default: 5 },
  size: { type: String, default: 'sm' },
  readonly: { type: Boolean, default: true },
  showValue: { type: Boolean, default: false },
  count: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue'])

const px = computed(() => ({ xs: 12, sm: 14, md: 20, lg: 24 }[props.size] || 14))

function fill(i) {
  const v = Number(props.modelValue) || 0
  if (i <= Math.floor(v)) return 1
  if (i === Math.floor(v) + 1) return Math.round((v - Math.floor(v)) * 2) / 2
  return 0
}

const { locale } = useI18n()

// Decimaalteken volgt de taal: 4,5 (nl) of 4.5 (en).
const displayValue = computed(() => {
  const v = Number(props.modelValue) || 0
  if (Number.isInteger(v)) return v.toFixed(0)
  const fixed = v.toFixed(1)
  return locale.value === 'nl' ? fixed.replace('.', ',') : fixed
})
</script>
