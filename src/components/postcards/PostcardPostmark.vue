<template>
  <!-- Poststempel: dubbele ring met de plaatsnaam langs de rand, de datum in het midden en golvende vernietigingslijnen. -->
  <svg viewBox="0 0 150 84" class="postcard-postmark" aria-hidden="true">
    <defs>
      <path :id="arcId" d="M14 42a28 28 0 0 1 56 0" />
    </defs>
    <g fill="none" stroke="currentColor" stroke-width="1.6">
      <circle cx="42" cy="42" r="36" />
      <circle cx="42" cy="42" r="24" stroke-width="1" />
      <path d="M80 26c7-5 14-5 21 0s14 5 21 0 14-5 21 0M80 38c7-5 14-5 21 0s14 5 21 0 14-5 21 0M80 50c7-5 14-5 21 0s14 5 21 0 14-5 21 0M80 62c7-5 14-5 21 0s14 5 21 0 14-5 21 0" />
    </g>
    <text fill="currentColor" font-size="8.5" font-weight="800" letter-spacing=".12em">
      <textPath :href="`#${arcId}`" startOffset="50%" text-anchor="middle">{{ placeLabel }}</textPath>
    </text>
    <text x="42" y="45" fill="currentColor" font-size="9" font-weight="800" text-anchor="middle">{{ dateLabel }}</text>
    <text x="42" y="66" fill="currentColor" font-size="7" font-weight="700" text-anchor="middle" letter-spacing=".1em">{{ yearLabel }}</text>
  </svg>
</template>

<script setup>
import { computed, useId } from 'vue'
import { parseTimestamp } from '@/utils/date'
import { localeTag } from '@/i18n'

const props = defineProps({
  place: { type: String, default: '' },
  date: { type: [String, Date], default: null },
})

const arcId = `postmark-arc-${useId()}`
const when = computed(() => (props.date instanceof Date ? props.date : parseTimestamp(props.date)) || new Date())

// Langs de bovenste boog passen ±16 tekens.
const placeLabel = computed(() => {
  const name = (props.place || '').trim().toUpperCase()
  return name.length > 16 ? `${name.slice(0, 15)}…` : name
})
const dateLabel = computed(() => when.value.toLocaleDateString(localeTag(), { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase())
const yearLabel = computed(() => String(when.value.getFullYear()))
</script>
