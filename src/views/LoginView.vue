<template>
  <AuthLayout>
    <h1 class="page-title">{{ $t('auth.login.title') }}</h1>
    <p class="mt-1 text-sm text-muted">{{ $t('auth.login.subtitle') }}</p>

    <p v-if="route.query.expired" class="mt-5 flex items-start gap-2 rounded-xl bg-accent-50 px-3.5 py-3 text-sm font-semibold text-accent-800">
      <Icon name="info" :size="16" class="mt-0.5" /> {{ $t('auth.login.expired') }}
    </p>

    <ExternalSignIn />

    <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="login-user" class="label">{{ $t('auth.userName') }}</label>
        <input id="login-user" v-model.trim="userName" class="input" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus />
      </div>
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label for="login-pass" class="text-xs font-bold text-body">{{ $t('auth.password') }}</label>
          <RouterLink to="/forgot-password" class="text-xs font-bold text-accent-700 hover:underline">{{ $t('auth.login.forgot') }}</RouterLink>
        </div>
        <div class="relative">
          <input id="login-pass" v-model="password" :type="showPassword ? 'text' : 'password'" class="input pr-11" autocomplete="current-password" required />
          <button type="button" class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink" :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')" @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
      </div>

      <p v-if="error" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>

      <button type="submit" class="btn btn-dark btn-lg w-full" :disabled="loading || !userName || !password">
        {{ loading ? $t('auth.login.submitting') : $t('auth.login.submit') }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-muted">
      {{ $t('auth.login.noAccount') }} <RouterLink to="/register" class="link">{{ $t('auth.login.createFree') }}</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Icon from '@/components/ui/Icon.vue'
import ExternalSignIn from '@/components/auth/ExternalSignIn.vue'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/utils/errors'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const userName = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  if (!userName.value || !password.value) return
  error.value = ''
  loading.value = true
  try {
    await auth.login(userName.value, password.value)
    if (!auth.onboardingCompleted) {
      router.replace({ name: 'welcome' })
      return
    }
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.replace(redirect)
  } catch (e) {
    // Ook bij 403 (geblokkeerd account) toont errorMessage de melding van de server.
    error.value = errorMessage(e, t('auth.login.failed'))
  } finally {
    loading.value = false
  }
}
</script>
