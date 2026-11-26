<template>
  <AuthLayout>
    <template v-if="!token">
      <h1 class="page-title">{{ $t('auth.reset.invalidTitle') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ $t('auth.reset.invalidText') }}</p>
      <RouterLink to="/forgot-password" class="btn btn-dark mt-6">{{ $t('auth.reset.requestNew') }}</RouterLink>
    </template>

    <template v-else-if="!done">
      <h1 class="page-title">{{ $t('auth.reset.title') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ $t('auth.reset.subtitle') }}</p>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label for="rp-pass" class="label">{{ $t('auth.reset.newPassword') }}</label>
          <input id="rp-pass" v-model="password" type="password" class="input" autocomplete="new-password" minlength="8" required autofocus />
          <p class="hint">{{ $t('auth.passwordMin') }}</p>
        </div>
        <div>
          <label for="rp-pass2" class="label">{{ $t('auth.repeatPassword') }}</label>
          <input id="rp-pass2" v-model="confirmPassword" type="password" class="input" autocomplete="new-password" required />
          <p v-if="confirmPassword && confirmPassword !== password" class="hint text-red-600">{{ $t('auth.passwordMismatch') }}</p>
        </div>
        <p v-if="error" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">
          {{ error }} <RouterLink to="/forgot-password" class="underline">{{ $t('auth.reset.requestNewLink') }}</RouterLink>.
        </p>
        <button type="submit" class="btn btn-dark btn-lg w-full" :disabled="loading || password.length < 8 || password !== confirmPassword">
          {{ loading ? $t('auth.reset.submitting') : $t('auth.reset.submit') }}
        </button>
      </form>
    </template>

    <div v-else class="text-center">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="check" :size="26" /></span>
      <h1 class="page-title mt-4">{{ $t('auth.reset.doneTitle') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ $t('auth.reset.doneText') }}</p>
      <RouterLink to="/login" class="btn btn-dark mt-6">{{ $t('auth.toLogin') }}</RouterLink>
    </div>
  </AuthLayout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Icon from '@/components/ui/Icon.vue'
import * as authApi from '@/api/authApi'
import { errorMessage } from '@/utils/errors'

const route = useRoute()
const { t } = useI18n()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const done = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authApi.resetPassword(token.value, password.value)
    done.value = true
  } catch (e) {
    error.value = errorMessage(e, t('auth.reset.failed'))
  } finally {
    loading.value = false
  }
}
</script>
