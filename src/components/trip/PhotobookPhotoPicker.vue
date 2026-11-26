<template>
  <Modal :model-value="modelValue" :title="title" :subtitle="subtitle" size="md" @update:model-value="$emit('update:modelValue', $event)">
    <p v-if="!photos.length" class="text-sm text-muted">{{ $t('photobook.edit.pickerEmpty') }}</p>
    <ul v-else class="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      <li v-for="p in photos" :key="p.id">
        <button
          type="button"
          class="relative block aspect-square w-full overflow-hidden rounded-xl bg-gray-100"
          :class="chosenId === p.id ? 'ring-[3px] ring-accent-700 ring-offset-2 ring-offset-surface' : ''"
          :aria-pressed="chosenId === p.id"
          :aria-label="$t('photobook.edit.pickPhoto', { name: p.caption || p.stopName || p.uploadedByDisplayName || '' })"
          @click="chosenId = p.id"
          @dblclick="confirm"
        >
          <img :src="thumbUrl(p.imageUrl)" alt="" class="h-full w-full object-cover" loading="lazy" decoding="async" />
          <span v-if="p.likeCount" class="absolute bottom-1 right-1 inline-flex h-6 items-center gap-1 rounded-full bg-surface/90 px-1.5 text-[11px] font-bold text-ink">
            <Icon name="heart" :size="12" filled class="text-red-600" /> {{ p.likeCount }}
          </span>
        </button>
      </li>
    </ul>
    <p v-if="photos.length && hint" class="mt-3 text-xs text-muted">{{ hint }}</p>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button type="button" class="btn btn-dark" :disabled="!chosenId" @click="confirm">{{ confirmLabel }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import { thumbUrl } from '@/utils/media'

// Eén foto kiezen uit een lijst albumfoto's (meeste hartjes eerst): voor wisselen, toevoegen en de omslag van het fotoboek.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  hint: { type: String, default: '' },
  confirmLabel: { type: String, required: true },
  /** TripPhotoDto's; de volgorde bepaalt de aanroeper. */
  photos: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'pick'])

const chosenId = ref(null)
// Elke keer opnieuw kiezen: een eerdere keuze hoort bij een andere foto of dag.
watch(() => props.modelValue, (open) => { if (open) chosenId.value = null })

function confirm() {
  if (!chosenId.value) return
  emit('pick', chosenId.value)
  emit('update:modelValue', false)
}
</script>
