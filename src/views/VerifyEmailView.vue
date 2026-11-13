<template>
  <AuthLayout>
    <div class="text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" :class="state === 'ok' ? 'bg-accent-50 text-accent-800' : state === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-muted'">
        <Spinner v-if="state === 'busy'" />
        <Icon v-else :name="state === 'ok' ? 'check' : 'alert'" :size="26" />
      </div>
      <h1 class="title-display text-[26px] leading-tight">
        {{ state === 'ok' ? $t('account.verify.okTitle') : state === 'error' ? $t('account.verify.errorTitle') : $t('account.verify.busyTitle') }}
      </h1>
      <p class="mx-auto mt-2 max-w-sm text-sm text-muted">
        {{ state === 'ok' ? $t('account.verify.okText') : state === 'error' ? message : $t('account.verify.busyText') }}
      </p>
      <div v-if="state !== 'busy'" class="mt-6 flex flex-wrap justify-center gap-2">
        <RouterLink :to="auth.isAuthenticated ? '/' : '/login'" class="btn btn-dark">{{ auth.isAuthenticated ? $t('account.verify.toApp') : $t('account.verify.toLogin') }}</RouterLink>
        <RouterLink v-if="state === 'error' && auth.isAuthenticated" to="/settings?tab=account" class="btn btn-secondary">{{ $t('account.verify.toSettings') }}</RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import * as authApi from '@/api/authApi'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/utils/errors'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const state = ref('busy')
const message = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    state.value = 'error'
    message.value = t('account.verify.noToken')
    return
  }
  try {
    await authApi.verifyEmail(token)
    state.value = 'ok'
    if (auth.isAuthenticated) auth.loadMe()
  } catch (e) {
    state.value = 'error'
    message.value = errorMessage(e, t('account.verify.invalid'))
  }
})
</script>
