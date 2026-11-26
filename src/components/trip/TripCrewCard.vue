<template>
  <section class="card card-pad" aria-labelledby="crew-title">
    <!-- flex-wrap: in de smalle kolom van het overzicht komen de knoppen onder de titel. -->
    <div class="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2 id="crew-title" class="card-title whitespace-nowrap">{{ $t('trip.crew.title') }} <span class="font-bold text-muted">{{ accepted.length + 1 }}</span></h2>
      <div v-if="trip.isOwner" class="flex flex-wrap gap-2">
        <button type="button" class="btn btn-dark btn-sm" @click="$emit('invite-link')"><Icon name="link" :size="14" /> {{ $t('join.link.button') }}</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="$emit('invite')"><Icon name="plus" :size="14" /> {{ $t('trip.crew.invite') }}</button>
      </div>
    </div>
    <ul class="flex flex-wrap gap-2">
      <li>
        <RouterLink :to="`/u/${trip.userName}`" class="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-3 hover:border-line-strong">
          <Avatar :src="trip.profilePhotoUrl" :name="trip.displayName" size="sm" />
          <span class="text-sm font-bold text-ink">{{ trip.displayName }}</span>
          <span class="chip chip-accent h-5 px-2 text-[10px]">{{ $t('trip.crew.owner') }}</span>
        </RouterLink>
      </li>
      <li v-for="c in accepted" :key="c.userName" class="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-1.5">
        <!-- Een gast heeft geen profiel om naartoe te linken. -->
        <span v-if="c.isGuest" class="inline-flex items-center gap-2 pr-1.5">
          <Avatar :src="c.profilePhotoUrl" :name="c.displayName" size="sm" />
          <span class="text-sm font-bold text-ink">{{ c.displayName }}</span>
          <span class="chip h-5 px-2 text-[10px]">{{ $t('join.guestChip') }}</span>
        </span>
        <RouterLink v-else :to="`/u/${c.userName}`" class="inline-flex items-center gap-2 pr-1.5">
          <Avatar :src="c.profilePhotoUrl" :name="c.displayName" size="sm" />
          <span class="text-sm font-bold text-ink hover:underline">{{ c.displayName }}</span>
        </RouterLink>
        <button v-if="trip.isOwner" type="button" class="btn-icon h-7 w-7 hover:text-red-600" :aria-label="$t('trip.crew.removeAria', { name: c.displayName })" @click="$emit('remove', c)">
          <Icon name="x" :size="14" />
        </button>
      </li>
      <li v-for="c in pending" :key="c.userName" class="inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-line-strong bg-gray-50 pl-1 pr-1.5">
        <Avatar :src="c.profilePhotoUrl" :name="c.displayName" size="sm" class="opacity-70" />
        <span class="text-sm font-semibold text-body">{{ c.displayName }}</span>
        <span class="text-xs font-semibold text-muted">{{ $t('trip.crew.invited') }}</span>
        <button type="button" class="btn-icon h-7 w-7 hover:text-red-600" :aria-label="$t('trip.crew.revokeAria', { name: c.displayName })" @click="$emit('remove', c)">
          <Icon name="x" :size="14" />
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'

// Wie er meegaat. Staat voor deelnemers op het tabblad Overzicht en voor kijkers bij de route.
const props = defineProps({
  /** TripDto met `collaborators` (openstaande uitnodigingen zitten er alleen in voor deelnemers). */
  trip: { type: Object, required: true },
})
defineEmits(['invite-link', 'invite', 'remove'])

const accepted = computed(() => (props.trip.collaborators || []).filter((c) => c.status === 'Accepted'))
const pending = computed(() => (props.trip.collaborators || []).filter((c) => c.status === 'Pending'))
</script>
