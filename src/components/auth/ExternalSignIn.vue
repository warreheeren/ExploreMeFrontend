<template>
  <div>
    <!-- Zonder geconfigureerde providers rendert dit niets (ook geen marge). -->
    <ExternalLoginButtons class="mt-6" divider :busy="loading" @credential="onCredential" @error="onError">
      <template #consent>
        <i18n-t keypath="legal.externalConsent" tag="p" class="text-center text-xs text-muted" scope="global">
          <template #terms><RouterLink to="/terms" class="link">{{ $t('legal.termsLink') }}</RouterLink></template>
          <template #privacy><RouterLink to="/privacy" class="link">{{ $t('legal.privacyLink') }}</RouterLink></template>
        </i18n-t>
      </template>
    </ExternalLoginButtons>
    <p v-if="loading" class="mt-3 text-center text-sm font-semibold text-muted" role="status">{{ $t('externalAuth.signingIn') }}</p>
    <p v-if="error" class="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ExternalLoginButtons from './ExternalLoginButtons.vue'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/utils/errors'

// Inloggen/registreren met Google of Apple op de login- en registratiepagina; daarna dezelfde flow als gewoon inloggen.
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const loading = ref(false)
const error = ref('')

async function onCredential({ provider, idToken, nonce, displayName }) {
  error.value = ''
  loading.value = true
  try {
    await auth.externalLogin(provider, { idToken, nonce: nonce || null, displayName: displayName || null })
    if (!auth.onboardingCompleted) {
      router.replace({ name: 'welcome' })
      return
    }
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.replace(redirect)
  } catch (e) {
    error.value = errorMessage(e, t('externalAuth.failed'))
  } finally {
    loading.value = false
  }
}

function onError(provider) {
  error.value = t('externalAuth.unavailable', { provider: provider === 'apple' ? 'Apple' : 'Google' })
}
</script>
