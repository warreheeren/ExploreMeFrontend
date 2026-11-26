<template>
  <!-- Geen overflow-hidden op de kaart: dan zou het uitklapmenu in de actions-slot afgeknipt worden. -->
  <section class="card">
    <div class="relative h-52 overflow-hidden rounded-t-[15px] bg-gray-100 sm:h-72 lg:h-80">
      <CoverImage :src="trip.coverImageUrl" :alt="trip.title" :seed="trip.id" eager />
      <div v-if="$slots.overlay" class="absolute right-3 top-3 flex gap-2"><slot name="overlay" /></div>
    </div>

    <div class="p-5 sm:p-6">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="eyebrow-accent">{{ [flagFor(trip.country), trip.country || $t('trip.hero.unknownCountry')].filter(Boolean).join(' ') }}</span>
        <span class="text-xs font-semibold text-muted">{{ formatDateRange(trip.startDate, trip.endDate) }} · {{ $t('trip.hero.days', days) }}</span>
        <span v-if="!trip.isPublic" class="chip chip-muted h-6"><Icon name="lock" :size="12" /> {{ $t('common.private') }}</span>
        <span v-if="countdown" class="chip h-6 bg-ink text-surface">{{ countdown }}</span>
        <span v-if="trip.copyCount" class="chip chip-accent h-6"><Icon name="copy" :size="12" /> {{ $t('tripExtras.copy.count', { n: trip.copyCount }) }}</span>
      </div>
      <h1 class="title-display mt-1.5 text-[28px] leading-[1.1] text-balance sm:text-[40px]">{{ trip.title }}</h1>
      <p v-if="trip.copiedFrom" class="mt-1.5 inline-flex flex-wrap items-center gap-1 text-sm text-muted">
        <Icon name="copy" :size="14" />
        <i18n-t keypath="tripExtras.copy.basedOn" tag="span">
          <!-- De bron is meestal een publieke reis van iemand anders: alleen linken met ontdekken aan. -->
          <template #trip><RouterLink v-if="features.discover" :to="`/trips/${trip.copiedFrom.id}`" class="link">{{ trip.copiedFrom.title }}</RouterLink><span v-else class="font-bold text-ink">{{ trip.copiedFrom.title }}</span></template>
          <template #name><RouterLink :to="`/u/${trip.copiedFrom.ownerUserName}`" class="font-bold text-ink hover:underline">{{ trip.copiedFrom.ownerDisplayName }}</RouterLink></template>
        </i18n-t>
      </p>
      <p v-if="trip.description" class="mt-2 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-body">{{ translatedDescription ?? trip.description }}</p>
      <TranslateButton
        v-if="trip.description && trip.userName !== auth.userName"
        v-model="translatedDescription"
        kind="tripDescription"
        :id="trip.id"
        :text="trip.description"
        class="mt-1"
      />

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <component :is="linkOwner ? 'RouterLink' : 'span'" :to="linkOwner ? `/u/${trip.userName}` : undefined" class="group inline-flex items-center gap-2.5">
          <Avatar :src="trip.profilePhotoUrl" :name="trip.displayName" size="sm" />
          <span class="text-sm">
            <span class="mr-1 text-muted">{{ $t('trip.hero.by') }}</span>
            <span class="font-extrabold text-ink" :class="linkOwner ? 'group-hover:underline' : ''">{{ trip.displayName }}</span>
          </span>
        </component>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from '../ui/Avatar.vue'
import Icon from '../ui/Icon.vue'
import CoverImage from '../ui/CoverImage.vue'
import TranslateButton from '../TranslateButton.vue'
import { useAuthStore } from '@/stores/auth'
import { countdownLabel, daysUntil, formatDateRange, tripDays } from '@/utils/date'
import { flagFor } from '@/utils/countries'
import { features } from '@/config/features'

const props = defineProps({
  trip: { type: Object, required: true },
  linkOwner: { type: Boolean, default: true },
})

const { t } = useI18n()
const auth = useAuthStore()
const translatedDescription = ref(null)

const days = computed(() => tripDays(props.trip.startDate, props.trip.endDate))
const countdown = computed(() => (daysUntil(props.trip.startDate) > 0 ? countdownLabel(props.trip.startDate, props.trip.endDate) : daysUntil(props.trip.endDate) >= 0 ? t('common.countdown.underway') : ''))
</script>
