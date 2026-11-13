<template>
  <AuthLayout>
    <h1 class="page-title">{{ $t('auth.register.title') }}</h1>
    <p class="mt-1 text-sm text-muted">{{ $t('auth.register.subtitle') }}</p>

    <ExternalSignIn />

    <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="reg-name" class="label">{{ $t('auth.register.name') }}</label>
        <input id="reg-name" v-model.trim="form.displayName" class="input" autocomplete="name" maxlength="60" required autofocus :placeholder="$t('auth.register.namePlaceholder')" />
      </div>
      <div>
        <label for="reg-user" class="label">{{ $t('auth.userName') }}</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">@</span>
          <input id="reg-user" v-model.trim="form.userName" class="input pl-8" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="30" required :aria-invalid="form.userName && !userNameValid" aria-describedby="reg-user-hint" />
        </div>
        <p id="reg-user-hint" class="hint" :class="form.userName && !userNameValid ? 'text-red-600' : ''">{{ $t('auth.register.userNameHint') }}</p>
      </div>
      <div>
        <label for="reg-email" class="label">{{ $t('auth.register.email') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <input id="reg-email" v-model.trim="form.email" type="email" class="input" autocomplete="email" aria-describedby="reg-email-hint" />
        <p id="reg-email-hint" class="hint">{{ $t('auth.register.emailHint') }}</p>
      </div>
      <div>
        <label for="reg-pass" class="label">{{ $t('auth.password') }}</label>
        <div class="relative">
          <input id="reg-pass" v-model="form.password" :type="showPassword ? 'text' : 'password'" class="input pr-11" autocomplete="new-password" minlength="6" required aria-describedby="reg-pass-hint" />
          <button type="button" class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink" :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')" @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
        <p id="reg-pass-hint" class="hint">{{ $t('auth.passwordMin') }}</p>
      </div>
      <div>
        <label for="reg-pass2" class="label">{{ $t('auth.repeatPassword') }}</label>
        <input id="reg-pass2" v-model="form.confirm" :type="showPassword ? 'text' : 'password'" class="input" autocomplete="new-password" required :aria-invalid="form.confirm && form.confirm !== form.password" />
        <p v-if="form.confirm && form.confirm !== form.password" class="hint text-red-600">{{ $t('auth.passwordMismatch') }}</p>
      </div>

      <label class="flex items-start gap-2.5 text-sm text-body">
        <input id="reg-terms" v-model="form.acceptTerms" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-accent-700 focus:ring-accent-700" required />
        <i18n-t keypath="legal.acceptTerms" tag="span" scope="global">
          <template #terms><RouterLink to="/terms" class="link" target="_blank">{{ $t('legal.termsLink') }}</RouterLink></template>
          <template #privacy><RouterLink to="/privacy" class="link" target="_blank">{{ $t('legal.privacyLink') }}</RouterLink></template>
        </i18n-t>
      </label>

      <p v-if="error" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>

      <button type="submit" class="btn btn-dark btn-lg w-full" :disabled="loading || !canSubmit">
        {{ loading ? $t('auth.register.submitting') : $t('auth.register.submit') }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-muted">
      {{ $t('auth.register.haveAccount') }} <RouterLink to="/login" class="link">{{ $t('auth.register.login') }}</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Icon from '@/components/ui/Icon.vue'
import ExternalSignIn from '@/components/auth/ExternalSignIn.vue'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/utils/errors'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const form = reactive({ displayName: '', userName: '', email: '', password: '', confirm: '', acceptTerms: false })
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const userNameValid = computed(() => /^[a-zA-Z0-9._-]{3,30}$/.test(form.userName))
const canSubmit = computed(() => form.displayName && userNameValid.value && form.password.length >= 6 && form.password === form.confirm && form.acceptTerms)

async function onSubmit() {
  if (!canSubmit.value) return
  error.value = ''
  loading.value = true
  try {
    await auth.register({
      userName: form.userName,
      displayName: form.displayName,
      password: form.password,
      email: form.email || null,
      acceptTerms: form.acceptTerms,
    })
    await auth.loadMe()
    router.replace({ name: 'welcome' })
  } catch (e) {
    error.value = errorMessage(e, t('auth.register.failed'))
  } finally {
    loading.value = false
  }
}
</script>
