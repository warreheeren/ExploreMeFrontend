<template>
  <!-- Instellingen → Privacy: huidige cookiekeuze + het venster (dat zelf in ConsentBanner/App.vue hangt). -->
  <section class="card card-pad sm:p-6" aria-labelledby="settings-consent">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div class="min-w-0 flex-1">
        <h2 id="settings-consent" class="card-title">{{ $t('consent.settings.title') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t('consent.settings.text') }}</p>
        <p class="mt-2 text-sm font-semibold text-body">
          <template v-if="consent.decided">
            {{ $t('consent.settings.status', { functional: label(consent.has('functional')), analytics: label(consent.has('analytics')) }) }}
          </template>
          <template v-else>{{ $t('consent.settings.undecided') }}</template>
        </p>
      </div>
      <button type="button" class="btn btn-secondary shrink-0" @click="consent.openSettings()">
        <Icon name="settings" :size="16" /> {{ $t('consent.settings.manage') }}
      </button>
    </div>
    <nav class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4 text-sm" :aria-label="$t('consent.settings.title')">
      <RouterLink to="/cookies" class="link">{{ $t('consent.settings.cookies') }}</RouterLink>
      <RouterLink to="/privacy" class="link">{{ $t('consent.settings.privacy') }}</RouterLink>
      <RouterLink to="/privacy-rights" class="link">{{ $t('consent.settings.rights') }}</RouterLink>
    </nav>
  </section>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import { useConsentStore } from '@/stores/consent'

const consent = useConsentStore()
const { t } = useI18n()

const label = (on) => (on ? t('consent.settings.on') : t('consent.settings.off'))
</script>
