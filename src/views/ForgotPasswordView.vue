<template>
  <AuthLayout>
    <RouterLink to="/login" class="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
      <Icon name="chevron-left" :size="16" /> {{ $t('auth.backToLogin') }}
    </RouterLink>

    <template v-if="!sent">
      <h1 class="page-title">{{ $t('auth.forgot.title') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ $t('auth.forgot.intro') }}</p>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label for="fp-input" class="label">{{ $t('auth.forgot.input') }}</label>
          <input id="fp-input" v-model.trim="value" class="input" autocomplete="username" autocapitalize="none" required autofocus />
        </div>
        <p v-if="error" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>
        <button type="submit" class="btn btn-dark btn-lg w-full" :disabled="loading || !value">{{ loading ? $t('auth.forgot.submitting') : $t('auth.forgot.submit') }}</button>
      </form>
    </template>

    <div v-else class="text-center">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="mail" :size="26" /></span>
      <h1 class="page-title mt-4">{{ $t('auth.forgot.sentTitle') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ $t('auth.forgot.sentText') }}</p>
      <p v-if="isDev" class="mt-4 rounded-xl bg-gray-100 px-3.5 py-3 text-left text-xs font-semibold text-body">
        {{ $t('auth.forgot.devNoteBefore') }} <code class="font-mono">outbox</code> {{ $t('auth.forgot.devNoteAfter') }}
      </p>
      <RouterLink to="/login" class="btn btn-secondary mt-6">{{ $t('auth.backToLogin') }}</RouterLink>
    </div>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Icon from '@/components/ui/Icon.vue'
import * as authApi from '@/api/authApi'
import { errorMessage } from '@/utils/errors'

const { t } = useI18n()
const isDev = import.meta.env.DEV
const value = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authApi.forgotPassword(value.value)
    sent.value = true
  } catch (e) {
    error.value = errorMessage(e, t('auth.forgot.failed'))
  } finally {
    loading.value = false
  }
}
</script>
