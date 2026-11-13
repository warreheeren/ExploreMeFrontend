<template>
  <div v-if="hasAny" class="space-y-2.5">
    <!-- Google tekent zijn eigen knop (verplicht voor de ID-token-flow); de container houdt de hoogte vast tegen verspringen. -->
    <div v-if="showGoogle && functionalAllowed" ref="googleEl" class="flex h-10 justify-center overflow-hidden rounded-full" :aria-busy="!googleReady" />
    <!-- Zonder toestemming voor functionele inhoud laden we Googles script niet: eerst deze knop (= toestemming). -->
    <button v-else-if="showGoogle" type="button" class="btn btn-secondary w-full" :disabled="busy" @click="consent.grant('functional')">
      {{ $t('consent.gate.google') }}
    </button>
    <button
      v-if="showApple"
      type="button"
      class="btn w-full bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
      :disabled="busy || appleBusy"
      @click="onApple"
    >
      <svg viewBox="0 0 17 20" width="15" height="18" aria-hidden="true" fill="currentColor">
        <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.6 3c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.5-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.4z" />
      </svg>
      {{ $t('externalAuth.continueApple') }}
    </button>
    <p v-if="!functionalAllowed" class="text-center text-xs leading-relaxed text-muted">{{ $t('consent.gate.loginHint') }}</p>

    <!-- Bv. "Door verder te gaan ga je akkoord met …" op de login-/registratiepagina. -->
    <slot name="consent" />

    <div v-if="divider" class="flex items-center gap-3 pt-2 text-xs font-bold uppercase tracking-wide text-muted" role="separator" :aria-label="$t('externalAuth.or')">
      <span class="h-px flex-1 bg-line" aria-hidden="true" />
      <span aria-hidden="true">{{ $t('externalAuth.or') }}</span>
      <span class="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferencesStore } from '@/stores/preferences'
import { useConsentStore } from '@/stores/consent'
import { loadExternalAuthConfig, renderGoogleButton, signInWithApple } from '@/services/externalAuth'
import { isNative } from '@/services/native'

const props = defineProps({
  /** Providers die niet getoond moeten worden (bv. al gekoppeld in de instellingen). */
  exclude: { type: Array, default: () => [] },
  /** Toont "of" onder de knoppen (boven het gewone formulier). */
  divider: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})

/** credential: { provider, idToken, nonce?, displayName? } · error: 'google' | 'apple' */
const emit = defineEmits(['credential', 'error', 'available'])

const { locale } = useI18n()
const prefs = usePreferencesStore()
const consent = useConsentStore()
/** De SDK's van Google/Apple zijn externe inhoud (categorie "functioneel"). */
const functionalAllowed = computed(() => consent.has('functional'))

const config = ref({ google: null, apple: null })
const googleEl = ref(null)
const googleReady = ref(false)
const appleBusy = ref(false)

const showGoogle = computed(() => !!config.value.google && !props.exclude.includes('google'))
const showApple = computed(() => !!config.value.apple && !props.exclude.includes('apple'))
const hasAny = computed(() => showGoogle.value || showApple.value)

async function drawGoogle() {
  await nextTick()
  if (!showGoogle.value || !functionalAllowed.value || !googleEl.value) return
  try {
    await renderGoogleButton(googleEl.value, {
      clientId: config.value.google,
      locale: locale.value,
      dark: prefs.isDark,
      width: googleEl.value.clientWidth,
      onCredential: ({ idToken }) => emit('credential', { provider: 'google', idToken }),
    })
    googleReady.value = true
  } catch {
    emit('error', 'google')
  }
}

async function onApple() {
  // De klik is een expliciete keuze voor Apple; de hint onder de knoppen meldt dat dit externe inhoud laadt.
  if (!functionalAllowed.value) consent.grant('functional')
  appleBusy.value = true
  try {
    const result = await signInWithApple(config.value.apple)
    if (result) emit('credential', { provider: 'apple', ...result })
  } catch {
    emit('error', 'apple')
  } finally {
    appleBusy.value = false
  }
}

// Thema of taal gewijzigd, of net toestemming gegeven → Google-knop (opnieuw) tekenen in de juiste stijl.
watch([() => prefs.isDark, locale, showGoogle, functionalAllowed], () => {
  if (showGoogle.value && functionalAllowed.value) drawGoogle()
})
watch(hasAny, (v) => emit('available', v))

onMounted(async () => {
  // Native app: de web-SDK's van Google/Apple werken niet in de WebView (origin https://localhost) en de stores
  // eisen native sign-in. Zonder native plugin blijven de knoppen dus verborgen (zie docs/native-app.md).
  if (isNative) {
    emit('available', false)
    return
  }
  // De watcher op showGoogle tekent de Google-knop zodra de configuratie binnen is.
  config.value = await loadExternalAuthConfig()
  emit('available', hasAny.value)
})
</script>
