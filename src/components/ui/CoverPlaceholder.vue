<template>
  <!-- Rustige landschapsillustratie als vervanger voor een ontbrekende omslagfoto. -->
  <svg
    viewBox="0 0 720 240"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    class="block"
  >
    <rect width="720" height="240" :fill="palette.sky" />
    <circle :cx="sunX" cy="78" r="30" :fill="palette.sun" />
    <path d="M0 150 L120 92 L220 136 L320 80 L430 140 L540 100 L640 128 L720 96 L720 240 L0 240Z" :fill="palette.far" />
    <path d="M0 176 L90 140 L190 168 L300 132 L400 170 L520 150 L620 176 L720 150 L720 240 L0 240Z" :fill="palette.near" />
    <rect y="188" width="720" height="52" :fill="palette.sea" />
    <path d="M40 206q20-8 40 0t40 0M300 218q20-8 40 0t40 0M560 210q20-8 40 0t40 0" :stroke="palette.wave" stroke-width="3" fill="none" stroke-linecap="round" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const PALETTES = [
  { sky: '#DCE7F0', sun: '#F3D27A', far: '#9FB4C7', near: '#6F8CA6', sea: '#2F6F8F', wave: '#5A93B3' },
  { sky: '#E3EFEA', sun: '#F3D27A', far: '#A7C4B5', near: '#6E9A86', sea: '#0F766E', wave: '#4FA699' },
  { sky: '#EFE8DE', sun: '#EDB866', far: '#C7B49B', near: '#9C8467', sea: '#4F6B7D', wave: '#7E97A7' },
]

const props = defineProps({
  seed: { type: String, default: '' },
})

const index = computed(() => {
  let h = 0
  for (const ch of props.seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % PALETTES.length
})
const palette = computed(() => PALETTES[index.value])
const sunX = computed(() => 420 + index.value * 90)
</script>
