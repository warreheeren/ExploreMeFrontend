<template>
  <!-- Betaalgegevens voor de betaal-QR bij afrekenen. Bewust niet in de auth-store/localStorage: alleen hier nodig. -->
  <form class="card-pad space-y-4 border-t border-line sm:p-6" aria-labelledby="settings-payment" @submit.prevent="save">
    <div>
      <h3 id="settings-payment" class="flex items-center gap-2 text-sm font-extrabold text-ink"><Icon name="wallet" :size="16" class="text-muted" /> {{ $t('payQr.settings.title') }}</h3>
      <p class="mt-1 text-sm text-muted">{{ $t('payQr.settings.intro') }}</p>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label for="set-iban" class="label">{{ $t('payQr.settings.iban') }}</label>
        <input
          id="set-iban"
          v-model="iban"
          class="input font-mono uppercase"
          maxlength="42"
          autocomplete="off"
          spellcheck="false"
          inputmode="text"
          :placeholder="$t('payQr.settings.ibanPlaceholder')"
          :aria-invalid="ibanState === 'invalid'"
          aria-describedby="set-iban-hint"
          @blur="onIbanBlur"
        />
        <p id="set-iban-hint" class="hint flex items-center gap-1" :class="ibanState === 'invalid' ? 'text-red-600' : ibanState === 'valid' ? 'text-accent-700' : ''" aria-live="polite">
          <template v-if="ibanState === 'invalid'"><Icon name="alert" :size="13" /> {{ $t('payQr.settings.ibanInvalid') }}</template>
          <template v-else-if="ibanState === 'valid'"><Icon name="check" :size="13" /> {{ $t('payQr.settings.ibanValid') }}</template>
        </p>
      </div>
      <div>
        <label for="set-iban-holder" class="label">{{ $t('payQr.settings.holder') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <input id="set-iban-holder" v-model="holder" class="input" :maxlength="MAX_HOLDER" autocomplete="name" :placeholder="auth.displayName || ''" />
        <p class="hint">{{ $t('payQr.settings.holderHint', { name: auth.displayName || '' }) }}</p>
      </div>
    </div>

    <p class="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-body">
      <Icon name="shield" :size="14" class="mt-0.5 shrink-0 text-muted" /> {{ $t('payQr.settings.privacy') }}
    </p>

    <div class="flex flex-wrap justify-end gap-2">
      <button v-if="savedIban" type="button" class="btn btn-ghost" :disabled="saving" @click="clear">{{ $t('payQr.settings.clear') }}</button>
      <button type="submit" class="btn btn-dark" :disabled="saving || !dirty || ibanState === 'invalid'">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import * as userApi from '@/api/userApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { formatIban, isValidIban, normalizeIban } from '@/utils/iban'

/** EPC-limiet voor de naam van de begunstigde (zelfde als de backend). */
const MAX_HOLDER = 70

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const iban = ref('')
const holder = ref('')
const savedIban = ref('')
const savedHolder = ref('')
const saving = ref(false)

/** '' (leeg), 'valid' of 'invalid' — live terwijl je typt. */
const ibanState = computed(() => {
  const value = normalizeIban(iban.value)
  if (!value) return ''
  return isValidIban(value) ? 'valid' : 'invalid'
})

const dirty = computed(() => normalizeIban(iban.value) !== savedIban.value || holder.value.trim() !== savedHolder.value)

function onIbanBlur() {
  if (ibanState.value === 'valid') iban.value = formatIban(iban.value)
}

function apply(me) {
  savedIban.value = me?.iban || ''
  savedHolder.value = me?.ibanHolderName || ''
  iban.value = savedIban.value ? formatIban(savedIban.value) : ''
  holder.value = savedHolder.value
}

async function persist(nextIban, nextHolder, message) {
  saving.value = true
  try {
    // Lege string = wissen; de backend normaliseert en valideert opnieuw.
    await auth.updateProfile({ iban: nextIban, ibanHolderName: nextHolder })
    apply({ iban: nextIban || null, ibanHolderName: nextIban ? nextHolder || null : null })
    toast.success(message)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

function save() {
  if (ibanState.value === 'invalid') return
  const next = normalizeIban(iban.value)
  persist(next, holder.value.trim(), next ? t('payQr.settings.saved') : t('payQr.settings.cleared'))
}

function clear() {
  persist('', '', t('payQr.settings.cleared'))
}

onMounted(async () => {
  try {
    apply(await userApi.getMe())
  } catch {
    // Geen betaalgegevens tonen is beter dan een foutmelding op de profielpagina.
  }
})
</script>
