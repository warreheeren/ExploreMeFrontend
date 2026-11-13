<template>
  <Modal :model-value="consent.settingsOpen" :title="$t('consent.dialog.title')" size="md" @update:model-value="onToggle">
    <p class="text-sm leading-relaxed text-body">{{ $t('consent.dialog.intro') }}</p>

    <ul class="mt-4 divide-y divide-line rounded-2xl border border-line">
      <li v-for="cat in categories" :key="cat.id" class="flex items-start gap-4 p-4">
        <span class="min-w-0 flex-1">
          <span :id="`consent-cat-${cat.id}`" class="block text-sm font-bold text-ink">{{ $t(`consent.dialog.categories.${cat.id}.title`) }}</span>
          <span :id="`consent-cat-${cat.id}-text`" class="mt-0.5 block text-sm leading-relaxed text-muted">
            {{ $t(`consent.dialog.categories.${cat.id}.text`) }}
            <template v-if="cat.id === 'analytics'">
              {{ analyticsProvider ? $t('consent.dialog.categories.analytics.provider', { provider: analyticsProvider }) : $t('consent.dialog.categories.analytics.unavailable') }}
            </template>
          </span>
        </span>
        <span v-if="cat.id === 'necessary'" class="chip chip-muted shrink-0">{{ $t('consent.dialog.alwaysOn') }}</span>
        <Toggle
          v-else
          v-model="draft[cat.id]"
          :label="$t(`consent.dialog.categories.${cat.id}.title`)"
          :disabled="cat.id === 'analytics' && !analyticsProvider"
          :aria-describedby="`consent-cat-${cat.id}-text`"
        />
      </li>
    </ul>

    <p v-if="decidedLabel" class="mt-3 text-xs text-muted">{{ decidedLabel }}</p>
    <RouterLink to="/cookies" class="link mt-3 inline-block text-sm" @click="consent.closeSettings()">{{ $t('consent.dialog.cookies') }}</RouterLink>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="choose('reject')">{{ $t('consent.dialog.rejectAll') }}</button>
      <button type="button" class="btn btn-secondary" @click="choose('accept')">{{ $t('consent.dialog.acceptAll') }}</button>
      <button type="button" class="btn btn-dark" @click="choose('save')">{{ $t('consent.dialog.save') }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Toggle from '@/components/ui/Toggle.vue'
import { useConsentStore } from '@/stores/consent'
import { useToastStore } from '@/stores/toast'
import { analyticsConfig } from '@/services/analytics'
import { localeTag } from '@/i18n'

const PROVIDER_NAMES = { plausible: 'Plausible', umami: 'Umami' }

const consent = useConsentStore()
const toast = useToastStore()
const { t, locale } = useI18n()

const categories = [{ id: 'necessary' }, { id: 'functional' }, { id: 'analytics' }]
// Zonder geconfigureerde provider valt er niets toe te staan; de schakelaar staat dan uit en vergrendeld.
const analyticsProvider = PROVIDER_NAMES[analyticsConfig()?.provider] || ''

/** Lokale kopie: pas bij "bewaren" wordt de keuze vastgelegd. */
const draft = reactive({ functional: false, analytics: false })

watch(() => consent.settingsOpen, (open) => {
  if (!open) return
  draft.functional = consent.has('functional')
  draft.analytics = consent.has('analytics')
}, { immediate: true })

const decidedLabel = computed(() => {
  void locale.value
  if (!consent.decided) return ''
  const date = new Date(consent.decidedAt).toLocaleDateString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' })
  return t('consent.dialog.decidedOn', { date })
})

function onToggle(open) {
  if (!open) consent.closeSettings()
}

function choose(kind) {
  if (kind === 'accept') consent.save({ functional: true, analytics: !!analyticsProvider })
  else if (kind === 'reject') consent.rejectAll()
  else consent.save({ functional: draft.functional, analytics: draft.analytics && !!analyticsProvider })
  consent.closeSettings()
  toast.success(t('consent.dialog.saved'))
}
</script>
