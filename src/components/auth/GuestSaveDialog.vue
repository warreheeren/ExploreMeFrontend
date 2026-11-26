<template>
  <Modal :model-value="state.open" :title="$t('join.save.title')" size="md" @update:model-value="state.open = $event">
    <div class="space-y-5">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="lock" :size="18" /></span>
        <div class="min-w-0">
          <p class="text-sm font-bold text-ink">{{ $t(`join.save.moments.${momentKey}`) }}</p>
          <p class="mt-1 text-sm text-muted">{{ $t('join.save.risk') }}</p>
        </div>
      </div>

      <!-- Google/Apple: één tik en het account werkt op elk toestel. Verborgen zonder geconfigureerde providers. -->
      <ExternalLoginButtons divider :busy="busy" @credential="onCredential" @error="onExternalError" />

      <form class="space-y-4" novalidate @submit.prevent="onSubmit">
        <div>
          <label for="guest-save-user" class="label">{{ $t('auth.userName') }}</label>
          <input id="guest-save-user" v-model.trim="form.userName" class="input" autocomplete="username" autocapitalize="none" spellcheck="false" required />
          <p class="mt-1 text-xs text-muted">{{ $t('join.save.userNameHint') }}</p>
        </div>
        <div>
          <label for="guest-save-pass" class="label">{{ $t('auth.password') }}</label>
          <input id="guest-save-pass" v-model="form.password" type="password" class="input" autocomplete="new-password" required />
          <p class="mt-1 text-xs text-muted">{{ $t('join.save.passwordHint') }}</p>
        </div>
        <div>
          <label for="guest-save-email" class="label">{{ $t('join.save.email') }}</label>
          <input id="guest-save-email" v-model.trim="form.email" type="email" class="input" autocomplete="email" />
          <p class="mt-1 text-xs text-muted">{{ $t('join.save.emailHint') }}</p>
        </div>

        <p v-if="error" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" class="btn btn-ghost" :disabled="busy" @click="state.open = false">{{ $t('join.save.later') }}</button>
          <button type="submit" class="btn btn-dark" :disabled="busy || !canSubmit">{{ busy ? $t('join.save.saving') : $t('join.save.submit') }}</button>
        </div>
      </form>
    </div>
  </Modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import ExternalLoginButtons from './ExternalLoginButtons.vue'
import { GUEST_NUDGE_MOMENTS, useGuestSave } from '@/composables/useGuestSave'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'

// Eén dialoog voor de hele app (gemount in App.vue); openen via openGuestSave() / nudgeGuestSave().
const state = useGuestSave()
const auth = useAuthStore()
const toast = useToastStore()
const { t } = useI18n()

const form = reactive({ userName: '', password: '', email: '' })
const busy = ref(false)
const error = ref('')

const momentKey = computed(() => (GUEST_NUDGE_MOMENTS.includes(state.moment) ? state.moment : 'default'))
const canSubmit = computed(() => /^[a-zA-Z0-9._-]{3,30}$/.test(form.userName) && form.password.length >= 6)

watch(() => state.open, (open) => {
  if (!open) return
  error.value = ''
  form.password = ''
})

function done() {
  state.open = false
  toast.success(t('join.save.done'))
}

async function onSubmit() {
  if (!canSubmit.value) return
  error.value = ''
  busy.value = true
  try {
    await auth.upgradeGuest({ userName: form.userName, password: form.password, email: form.email || null })
    done()
  } catch (e) {
    error.value = errorMessage(e, t('join.save.failed'))
  } finally {
    busy.value = false
  }
}

async function onCredential({ provider, idToken, nonce }) {
  error.value = ''
  busy.value = true
  try {
    await auth.upgradeGuestExternal(provider, { idToken, nonce: nonce || null })
    done()
  } catch (e) {
    error.value = errorMessage(e, t('join.save.failed'))
  } finally {
    busy.value = false
  }
}

function onExternalError(provider) {
  error.value = t('externalAuth.unavailable', { provider: provider === 'apple' ? 'Apple' : 'Google' })
}
</script>
