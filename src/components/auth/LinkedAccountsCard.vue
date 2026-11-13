<template>
  <!-- Verborgen wanneer geen enkele provider geconfigureerd is en er niets gekoppeld is. -->
  <section v-if="available || linked.length" class="card card-pad mb-5 space-y-4 sm:p-6" aria-labelledby="settings-linked">
    <div>
      <h2 id="settings-linked" class="card-title">{{ $t('externalAuth.linked.title') }}</h2>
      <p class="mt-0.5 text-sm text-muted">{{ $t('externalAuth.linked.text') }}</p>
    </div>

    <div v-if="loading" class="space-y-2"><div v-for="i in 2" :key="i" class="skeleton h-12 rounded-xl" /></div>
    <ul v-else-if="linked.length" class="-mx-2 divide-y divide-line">
      <li v-for="l in linked" :key="l.provider" class="flex items-center gap-3 px-2 py-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-ink" aria-hidden="true">{{ providerName(l.provider).charAt(0) }}</span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-ink">{{ providerName(l.provider) }}</span>
          <span class="block truncate text-xs text-muted">{{ l.email || $t('externalAuth.linked.noEmail') }}</span>
        </span>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="busy"
          :aria-label="$t('externalAuth.linked.unlinkLabel', { provider: providerName(l.provider) })"
          @click="unlink(l.provider)"
        >
          {{ $t('externalAuth.linked.unlink') }}
        </button>
      </li>
    </ul>
    <p v-else class="text-sm font-semibold text-muted">{{ $t('externalAuth.linked.none') }}</p>

    <div v-if="canLinkMore" class="border-t border-line pt-4">
      <p class="mb-2.5 text-xs font-bold text-body">{{ $t('externalAuth.linked.add') }}</p>
      <ExternalLoginButtons :exclude="linked.map((l) => l.provider)" :busy="busy" @credential="link" @error="onError" />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ExternalLoginButtons from './ExternalLoginButtons.vue'
import * as externalAuthApi from '@/api/externalAuthApi'
import { loadExternalAuthConfig } from '@/services/externalAuth'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'

// "Gekoppelde accounts" in Instellingen → Account: Google/Apple koppelen en ontkoppelen.
const PROVIDERS = { google: 'Google', apple: 'Apple' }

const { t } = useI18n()
const toast = useToastStore()
const confirm = useConfirm()

const linked = ref([])
const loading = ref(true)
const busy = ref(false)

const config = ref({ google: null, apple: null })
const available = computed(() => !!config.value.google || !!config.value.apple)
// Alleen providers die geconfigureerd zijn én nog niet gekoppeld.
const canLinkMore = computed(() => !loading.value && Object.keys(PROVIDERS).some((p) => config.value[p] && !linked.value.some((l) => l.provider === p)))

function providerName(provider) {
  return PROVIDERS[provider] || provider
}

async function load() {
  loading.value = true
  try {
    linked.value = await externalAuthApi.getExternalLogins()
  } catch {
    linked.value = []
  } finally {
    loading.value = false
  }
}

async function link({ provider, idToken, nonce }) {
  busy.value = true
  try {
    linked.value = await externalAuthApi.linkExternalLogin(provider, { idToken, nonce: nonce || null })
    toast.success(t('externalAuth.linked.linked', { provider: providerName(provider) }))
  } catch (e) {
    toast.error(errorMessage(e, t('externalAuth.failed')))
  } finally {
    busy.value = false
  }
}

async function unlink(provider) {
  const ok = await confirm({
    title: t('externalAuth.linked.confirmTitle', { provider: providerName(provider) }),
    message: t('externalAuth.linked.confirmText', { provider: providerName(provider) }),
    confirmLabel: t('externalAuth.linked.unlink'),
    variant: 'danger',
  })
  if (!ok) return
  busy.value = true
  try {
    linked.value = await externalAuthApi.unlinkExternalLogin(provider)
    toast.success(t('externalAuth.linked.unlinked', { provider: providerName(provider) }))
  } catch (e) {
    // De server legt uit waarom het niet kan (geen andere manier meer om in te loggen).
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

function onError(provider) {
  toast.error(t('externalAuth.unavailable', { provider: providerName(provider) }))
}

onMounted(async () => {
  loadExternalAuthConfig().then((c) => { config.value = c })
  await load()
})
</script>
