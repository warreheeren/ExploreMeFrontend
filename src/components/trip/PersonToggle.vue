<template>
  <!-- Avatar + voornaam als aan/uit-knop (wie deelt mee in een item). -->
  <button
    type="button"
    :aria-pressed="String(pressed)"
    class="inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-bold transition"
    :class="pressed ? 'border-accent-700 bg-accent-50 text-ink' : 'border-line text-muted opacity-60 hover:opacity-100'"
    @click="emit('toggle')"
  >
    <Avatar :src="person.profilePhotoUrl || ''" :name="person.displayName" size="xs" />
    <span>{{ person.displayName.split(' ')[0] }}</span>
  </button>
</template>

<script setup>
import Avatar from '../ui/Avatar.vue'

defineProps({
  /** { userName, displayName, profilePhotoUrl } */
  person: { type: Object, required: true },
  pressed: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle'])
</script>
