<template>
  <div class="postcard-scene">
    <button
      type="button"
      class="postcard-inner"
      :class="{ 'is-flipped': flipped }"
      :aria-pressed="flipped"
      :aria-label="flipped ? $t('postcards.card.showFront') : $t('postcards.card.showBack', { place: card.placeName })"
      @click="toggle"
    >
      <!-- Voorkant: foto + plaatsnaam -->
      <span class="postcard-face postcard-front bg-gray-100">
        <img v-if="card.imageUrl" :src="thumb ? thumbUrl(card.imageUrl) : resolveMediaUrl(card.imageUrl)" alt="" class="absolute inset-0 h-full w-full object-cover" :loading="lazy ? 'lazy' : 'eager'" />
        <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 pb-3 pt-12 text-left">
          <span class="block text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">{{ $t('postcards.card.greetingsFrom') }}</span>
          <span class="block truncate text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-3xl">{{ card.placeName || '…' }}</span>
        </span>
        <span class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white">
          <Icon name="refresh" :size="12" /> {{ $t('postcards.card.turnOver') }}
        </span>
      </span>

      <!-- Achterkant: bericht links, postzegel + poststempel + adres rechts -->
      <span class="postcard-face postcard-back grid grid-cols-[minmax(0,1.25fr)_1px_minmax(0,1fr)] gap-3 bg-surface p-3 text-left sm:gap-4 sm:p-4">
        <span class="flex min-h-0 flex-col">
          <span class="postcard-message min-h-0 flex-1 overflow-y-auto whitespace-pre-line break-words pr-1 text-[13px] italic leading-relaxed text-body sm:text-sm">{{ card.message || $t('postcards.card.emptyMessage') }}</span>
          <span v-if="card.senderDisplayName" class="mt-2 block truncate text-sm font-bold text-ink">— {{ card.senderDisplayName }}</span>
        </span>
        <span class="bg-line" aria-hidden="true" />
        <span class="relative flex min-h-0 flex-col">
          <span class="flex justify-end">
            <PostcardStamp :variant="card.stampStyle || 'classic'" :width="stampWidth" />
          </span>
          <PostcardPostmark :place="card.placeName" :date="card.createdAtUtc" class="pointer-events-none absolute -left-2 top-3 w-[78%] text-muted opacity-70 mix-blend-multiply dark:mix-blend-screen" />
          <span class="mt-auto space-y-2 pb-1">
            <span v-if="recipientLabel" class="block truncate border-b border-line pb-1 text-xs font-bold text-ink">{{ recipientLabel }}</span>
            <span v-else class="block border-b border-line pb-1" aria-hidden="true">&nbsp;</span>
            <span class="block border-b border-line" aria-hidden="true">&nbsp;</span>
          </span>
        </span>
      </span>
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import PostcardStamp from './PostcardStamp.vue'
import PostcardPostmark from './PostcardPostmark.vue'
import { resolveMediaUrl, thumbUrl } from '@/utils/media'

const props = defineProps({
  /** { imageUrl, placeName, message, stampStyle, senderDisplayName, recipientName, createdAtUtc } */
  card: { type: Object, required: true },
  /** Startkant; de kaart draait daarna zelf om bij een klik. */
  startFlipped: { type: Boolean, default: false },
  /** Thumbnail voor lijsten; de publieke view toont de volle foto. */
  thumb: { type: Boolean, default: true },
  lazy: { type: Boolean, default: true },
  stampWidth: { type: Number, default: 48 },
})

const emit = defineEmits(['flip'])
const { t } = useI18n()

const flipped = ref(props.startFlipped)
watch(() => props.startFlipped, (v) => (flipped.value = v))

const recipientLabel = computed(() => (props.card.recipientName ? t('postcards.card.to', { name: props.card.recipientName }) : ''))

function toggle() {
  flipped.value = !flipped.value
  emit('flip', flipped.value)
}
</script>

<style scoped>
.postcard-scene {
  perspective: 1400px;
}
.postcard-inner {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  border-radius: 1rem;
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.postcard-inner.is-flipped {
  transform: rotateY(180deg);
}
.postcard-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 1rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(0 0 0 / 0.06);
}
.postcard-back {
  transform: rotateY(180deg);
}
@media (prefers-reduced-motion: reduce) {
  .postcard-inner {
    transition: none;
  }
}
</style>
