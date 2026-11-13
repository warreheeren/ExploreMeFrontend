<template>
  <!-- Postzegel als inline SVG: getande rand (wit vlak met halve cirkels uit de rand) + een motief per stijl. -->
  <svg :width="width" :height="width * 1.2" viewBox="0 0 60 72" role="img" :aria-label="$t(`postcards.stamps.${variant}`)" class="postcard-stamp shrink-0">
    <defs>
      <mask :id="maskId">
        <rect x="0" y="0" width="60" height="72" fill="white" />
        <circle v-for="x in edgeX" :key="`t${x}`" :cx="x" cy="0" r="2.2" fill="black" />
        <circle v-for="x in edgeX" :key="`b${x}`" :cx="x" cy="72" r="2.2" fill="black" />
        <circle v-for="y in edgeY" :key="`l${y}`" cx="0" :cy="y" r="2.2" fill="black" />
        <circle v-for="y in edgeY" :key="`r${y}`" cx="60" :cy="y" r="2.2" fill="black" />
      </mask>
      <clipPath :id="clipId"><rect x="6" y="6" width="48" height="52" rx="1" /></clipPath>
    </defs>

    <rect x="0" y="0" width="60" height="72" fill="#FFFDF8" :mask="`url(#${maskId})`" />

    <g :clip-path="`url(#${clipId})`">
      <template v-if="variant === 'mountain'">
        <rect x="6" y="6" width="48" height="52" fill="#CDE8E3" />
        <circle cx="42" cy="18" r="5" fill="#F6C453" />
        <path d="M6 58 22 28l9 14 7-9 16 25z" fill="#0F766E" />
        <path d="m22 28-4 7 4-2 3 3zM38 33l-3 4 3-1 2 2z" fill="#FFFDF8" />
      </template>
      <template v-else-if="variant === 'beach'">
        <rect x="6" y="6" width="48" height="52" fill="#BFE3F5" />
        <circle cx="30" cy="30" r="9" fill="#F6A43C" />
        <rect x="6" y="38" width="48" height="20" fill="#2B8CC4" />
        <path d="M6 42c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0M6 50c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0" stroke="#FFFDF8" stroke-width="1.6" fill="none" />
      </template>
      <template v-else-if="variant === 'city'">
        <rect x="6" y="6" width="48" height="52" fill="#3B3363" />
        <circle cx="16" cy="16" r="3.5" fill="#F8E7A1" />
        <path d="M6 58V40h7v-8h6v14h5V24h8v10h5v-6h7v14h4v-6h6v28z" fill="#1E1A38" />
        <g fill="#F8E7A1">
          <rect x="26" y="28" width="2" height="2" /><rect x="29" y="33" width="2" height="2" /><rect x="15" y="36" width="2" height="2" /><rect x="41" y="38" width="2" height="2" /><rect x="26" y="40" width="2" height="2" />
        </g>
      </template>
      <template v-else-if="variant === 'retro'">
        <rect x="6" y="6" width="48" height="52" fill="#F4E1C1" />
        <g transform="translate(30 46)">
          <path v-for="a in rays" :key="a" d="M0 0 L-3 -40 L3 -40z" fill="#E4572E" :transform="`rotate(${a})`" />
        </g>
        <circle cx="30" cy="46" r="11" fill="#F3A712" />
        <rect x="6" y="46" width="48" height="12" fill="#29335C" />
      </template>
      <template v-else>
        <!-- classic: luchtpost met wereldbol -->
        <rect x="6" y="6" width="48" height="52" fill="#E8EEF7" />
        <circle cx="30" cy="32" r="15" fill="#2F5D9E" />
        <path d="M15 32h30M30 17c-6 8-6 22 0 30M30 17c6 8 6 22 0 30M18 24h24M18 40h24" stroke="#E8EEF7" stroke-width="1.2" fill="none" />
        <path d="M6 6h6l-6 6zM54 6h-6l6 6zM6 58h6l-6-6zM54 58h-6l6-6z" fill="#C8102E" />
      </template>
    </g>

    <rect x="6" y="6" width="48" height="52" fill="none" stroke="#1F2937" stroke-opacity=".15" />
    <text x="30" y="67" text-anchor="middle" font-size="6.5" font-weight="800" letter-spacing=".08em" fill="#374151">EXPLOREME</text>
  </svg>
</template>

<script setup>
import { useId } from 'vue'

defineProps({
  variant: { type: String, default: 'classic' },
  width: { type: Number, default: 52 },
})

const uid = useId()
const maskId = `stamp-mask-${uid}`
const clipId = `stamp-clip-${uid}`
const edgeX = [3, 9, 15, 21, 27, 33, 39, 45, 51, 57]
const edgeY = [3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69]
const rays = [-80, -60, -40, -20, 0, 20, 40, 60, 80]
</script>
