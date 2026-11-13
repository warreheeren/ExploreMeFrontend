<template>
  <div v-if="visible" class="border-b border-line bg-amber-50" role="status">
    <div class="mx-auto flex max-w-content items-center gap-3 px-4 py-2 text-sm sm:px-6">
      <Icon name="mail" :size="16" class="shrink-0 text-rating-text" />
      <p class="min-w-0 flex-1 text-body">{{ $t('account.banner.text', { email: auth.email }) }}</p>
      <button type="button" class="shrink-0 font-bold text-ink underline disabled:no-underline disabled:opacity-60" :disabled="sent || busy" @click="resend">
        {{ sent ? $t('account.banner.resent') : $t('account.banner.resend') }}
      </button>
      <button type="button" class="btn-icon btn-icon-sm shrink-0" :aria-label="$t('account.banner.dismiss')" @click="dismiss"><Icon name="x" :size="15" /></button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import * as authApi from '@/api/authApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'

const auth = useAuthStore()
const toast = useToastStore()
const busy = ref(false)
const sent = ref(false)
// Per e-mailadres wegklikken (voor deze sessie).
const dismissedFor = ref(sessionStorage.getItem('verifyBannerDismissed') || '')

const visible = computed(() => auth.needsEmailVerification && dismissedFor.value !== auth.email)

async function resend() {
  busy.value = true
  try {
    await authApi.resendVerification()
    sent.value = true
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

function dismiss() {
  dismissedFor.value = auth.email || ''
  try { sessionStorage.setItem('verifyBannerDismissed', dismissedFor.value) } catch { /* geen storage */ }
}
</script>
