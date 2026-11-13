<template>
  <!-- Affiliate-link: altijd nieuw tabblad, rel="sponsored" en een zichtbaar label "partnerlink". -->
  <a
    :href="href"
    v-bind="PARTNER_LINK_ATTRS"
    class="inline-flex max-w-full items-center gap-1.5"
    :class="linkClass"
    :title="$t('integrations.partnerLinkHint')"
  >
    <Icon v-if="icon" :name="icon" :size="14" class="shrink-0" />
    <span class="truncate"><slot /></span>
    <Icon name="external" :size="12" class="shrink-0 opacity-70" />
    <span class="shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-muted">{{ $t('integrations.partnerLink') }}</span>
    <span class="sr-only">({{ $t('integrations.opensInNewTab') }})</span>
  </a>
</template>

<script setup>
import Icon from './Icon.vue'
import { PARTNER_LINK_ATTRS } from '@/utils/travelLinks'

defineProps({
  href: { type: String, required: true },
  icon: { type: String, default: '' },
  /** Stijl van de link zelf ("link" voor tekst, of bv. "btn btn-secondary btn-sm"). */
  linkClass: { type: String, default: 'link' },
})
</script>
