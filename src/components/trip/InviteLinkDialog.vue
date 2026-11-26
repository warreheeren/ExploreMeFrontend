<template>
  <Modal :model-value="modelValue" :title="$t('join.link.title')" size="md" @update:model-value="$emit('update:modelValue', $event)">
    <div class="space-y-4">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="users" :size="18" /></span>
        <div class="min-w-0">
          <p class="text-sm font-bold text-ink">{{ $t('join.link.lead') }}</p>
          <p class="mt-0.5 text-sm text-muted">{{ $t('join.link.text') }}</p>
        </div>
      </div>

      <div v-if="loading" class="skeleton h-10 rounded-xl" aria-busy="true" />

      <template v-else-if="url">
        <div class="flex gap-2">
          <input :value="url" readonly class="input font-mono text-xs" :aria-label="$t('join.link.title')" @focus="$event.target.select()" />
          <button type="button" class="btn btn-dark shrink-0" @click="copy"><Icon name="copy" :size="16" /> {{ $t('share.copy') }}</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-if="canNativeShare" type="button" class="btn btn-secondary btn-sm" @click="share"><Icon name="share" :size="14" /> {{ $t('share.shareVia') }}</button>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="reset"><Icon name="refresh" :size="14" /> {{ $t('join.link.reset') }}</button>
          <button type="button" class="btn btn-danger-ghost btn-sm ml-auto" :disabled="busy" @click="disable">{{ $t('join.link.disable') }}</button>
        </div>
        <p class="text-xs text-muted">{{ $t('join.link.warning') }}</p>
      </template>

      <template v-else>
        <p v-if="error" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="create()">
          <Icon name="link" :size="16" /> {{ busy ? $t('share.busy') : $t('join.link.create') }}
        </button>
      </template>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import * as invitesApi from '@/api/invitesApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'
import { canShare, shareContent } from '@/services/share'
import { publicWebOrigin } from '@/services/native'

// Uitnodigingslink van een reis (alleen de eigenaar): wie hem opent kan meedoen, ook zonder account.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  trip: { type: Object, required: true },
})
defineEmits(['update:modelValue'])

const toast = useToastStore()
const { t } = useI18n()
const canNativeShare = canShare()
// In de native app is window.location.origin https://localhost: de link wijst naar de gehoste webapp.
const origin = publicWebOrigin()

const token = ref('')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const url = computed(() => (token.value ? `${origin}/join/${token.value}` : ''))

// Openen is de vraag om te delen: bestaat er nog geen link, dan maken we er meteen een.
watch(() => props.modelValue, async (open) => {
  if (!open) return
  loading.value = true
  error.value = ''
  try {
    const link = (await invitesApi.getInviteLink(props.trip.id)) || (await invitesApi.createInviteLink(props.trip.id))
    token.value = link.token
  } catch (e) {
    token.value = ''
    error.value = errorMessage(e, t('join.link.failed'))
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function create(options) {
  busy.value = true
  error.value = ''
  try {
    token.value = (await invitesApi.createInviteLink(props.trip.id, options)).token
    return true
  } catch (e) {
    toast.error(errorMessage(e, t('join.link.failed')))
    return false
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    toast.success(t('share.copied'))
  } catch {
    toast.error(t('share.copyFailed'))
  }
}

async function share() {
  // Geannuleerd of niet beschikbaar: de link staat ernaast om te kopiëren.
  await shareContent({ title: props.trip.title, text: t('join.link.shareText', { title: props.trip.title }), url: url.value })
}

async function reset() {
  const ok = await confirm({ title: t('join.link.resetTitle'), message: t('join.link.resetText'), confirmLabel: t('join.link.reset') })
  if (ok && (await create({ reset: true }))) toast.success(t('join.link.resetDone'))
}

async function disable() {
  const ok = await confirm({ title: t('join.link.disableTitle'), message: t('join.link.disableText'), confirmLabel: t('join.link.disable'), variant: 'danger' })
  if (!ok) return
  busy.value = true
  try {
    await invitesApi.deleteInviteLink(props.trip.id)
    token.value = ''
    toast.success(t('join.link.disabled'))
  } catch (e) {
    toast.error(errorMessage(e, t('join.link.failed')))
  } finally {
    busy.value = false
  }
}
</script>
