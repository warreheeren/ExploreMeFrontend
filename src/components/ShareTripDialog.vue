<template>
  <Modal :model-value="modelValue" :title="$t('share.title')" :size="embedOpen ? 'xl' : 'md'" @update:model-value="$emit('update:modelValue', $event)">
    <div class="space-y-5">
      <!-- Eigenaar: publieke deel-link -->
      <section v-if="trip.isOwner">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="link" :size="18" /></span>
          <div class="min-w-0">
            <h3 class="text-sm font-extrabold text-ink">{{ $t('share.publicTitle') }}</h3>
            <p class="mt-0.5 text-sm text-muted">{{ $t('share.publicText') }}</p>
          </div>
        </div>

        <div v-if="shareUrl" class="mt-4 space-y-2">
          <div class="flex gap-2">
            <input :value="shareUrl" readonly class="input font-mono text-xs" :aria-label="$t('share.shareLink')" @focus="$event.target.select()" />
            <button type="button" class="btn btn-dark" @click="copy(shareUrl)"><Icon name="copy" :size="16" /> {{ $t('share.copy') }}</button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-if="canNativeShare" type="button" class="btn btn-secondary btn-sm" @click="nativeShare(shareUrl)"><Icon name="share" :size="14" /> {{ $t('share.shareVia') }}</button>
            <a :href="shareUrl" target="_blank" rel="noopener" class="btn btn-secondary btn-sm"><Icon name="external" :size="14" /> {{ $t('share.viewAsVisitor') }}</a>
            <button type="button" class="btn btn-danger-ghost btn-sm ml-auto" :disabled="busy" @click="disable">{{ $t('share.revoke') }}</button>
          </div>
        </div>
        <button v-else type="button" class="btn btn-primary mt-4" :disabled="busy" @click="enable">
          <Icon name="link" :size="16" /> {{ busy ? $t('share.busy') : $t('share.create') }}
        </button>
      </section>

      <!-- Eigenaar: insluiten als kaart op een andere site (werkt via de deel-link) -->
      <section v-if="trip.isOwner" class="border-t border-line pt-5">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="map" :size="18" /></span>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-extrabold text-ink">{{ $t('embed.title') }}</h3>
            <p class="mt-0.5 text-sm text-muted">{{ shareUrl ? $t('embed.text') : $t('embed.needsLink') }}</p>
          </div>
          <button v-if="shareUrl && !embedOpen" type="button" class="btn btn-secondary btn-sm shrink-0" @click="embedOpen = true">{{ $t('embed.open') }}</button>
        </div>

        <button v-if="!shareUrl" type="button" class="btn btn-secondary btn-sm mt-3" :disabled="busy" @click="enable">
          <Icon name="link" :size="14" /> {{ busy ? $t('share.busy') : $t('share.create') }}
        </button>

        <div v-else-if="embedOpen" class="mt-4 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="embed-height" class="label">{{ $t('embed.height') }}</label>
              <select id="embed-height" v-model.number="embedHeight" class="select">
                <option v-for="h in EMBED_HEIGHTS" :key="h" :value="h">{{ h }} px</option>
              </select>
            </div>
            <div>
              <label for="embed-theme" class="label">{{ $t('embed.theme') }}</label>
              <select id="embed-theme" v-model="embedTheme" class="select">
                <option v-for="th in EMBED_THEMES" :key="th" :value="th">{{ $t(`embed.themes.${th}`) }}</option>
              </select>
            </div>
          </div>

          <div>
            <p class="label">{{ $t('embed.preview') }}</p>
            <iframe
              :key="previewUrl"
              :src="previewUrl"
              :height="embedHeight"
              :title="`${trip.title} – ExploreMe`"
              class="w-full rounded-xl border border-line"
              loading="lazy"
            />
          </div>

          <div>
            <label for="embed-code" class="label">{{ $t('embed.code') }}</label>
            <textarea id="embed-code" :value="iframeCode" readonly rows="3" class="input font-mono text-xs" @focus="$event.target.select()" />
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="btn btn-dark btn-sm" @click="copy(iframeCode, t('embed.codeCopied'))"><Icon name="copy" :size="14" /> {{ $t('embed.copyCode') }}</button>
            <p class="text-xs text-muted">{{ $t('embed.revokeNote') }}</p>
          </div>
        </div>
      </section>

      <!-- Interne link voor ingelogde gebruikers -->
      <section :class="trip.isOwner ? 'border-t border-line pt-5' : ''">
        <h3 class="text-sm font-extrabold text-ink">{{ $t('share.internalTitle') }}</h3>
        <p class="mt-0.5 text-sm text-muted">
          {{ trip.isPublic ? $t('share.internalPublic') : $t('share.internalPrivate') }}
        </p>
        <div class="mt-3 flex gap-2">
          <input :value="internalUrl" readonly class="input font-mono text-xs" :aria-label="$t('share.internalLink')" @focus="$event.target.select()" />
          <button type="button" class="btn btn-secondary" @click="copy(internalUrl)"><Icon name="copy" :size="16" /> {{ $t('share.copy') }}</button>
        </div>
      </section>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from './ui/Modal.vue'
import Icon from './ui/Icon.vue'
import * as tripsApi from '@/api/tripsApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'
import { EMBED_HEIGHTS, EMBED_THEMES, embedCode, embedUrl } from '@/utils/embed'
import { canShare, shareContent } from '@/services/share'
import { publicWebOrigin } from '@/services/native'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  trip: { type: Object, required: true },
})
const emit = defineEmits(['update:modelValue', 'updated'])

const toast = useToastStore()
const { t } = useI18n()
const busy = ref(false)
// Deelmenu: @capacitor/share in de native app, anders de Web Share API (services/share.js).
const canNativeShare = canShare()
// In de native app is window.location.origin https://localhost: links naar buiten gaan naar de gehoste webapp.
const origin = publicWebOrigin()

const shareUrl = computed(() => (props.trip.shareToken ? `${origin}/share/${props.trip.shareToken}` : ''))
const internalUrl = computed(() => `${origin}/trips/${props.trip.id}`)

const embedOpen = ref(false)
const embedHeight = ref(420)
const embedTheme = ref('auto')
const previewUrl = computed(() => (props.trip.shareToken ? embedUrl(origin, props.trip.shareToken, embedTheme.value) : ''))
const iframeCode = computed(() => (props.trip.shareToken
  ? embedCode({ origin, token: props.trip.shareToken, theme: embedTheme.value, height: embedHeight.value, title: props.trip.title })
  : ''))

async function copy(text, successMessage = t('share.copied')) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error(t('share.copyFailed'))
  }
}

async function nativeShare(url) {
  // Geannuleerd of niet beschikbaar: niets te doen (de link staat ernaast om te kopiëren).
  await shareContent({ title: props.trip.title, url })
}

async function enable() {
  busy.value = true
  try {
    const { shareToken } = await tripsApi.enableShare(props.trip.id)
    emit('updated', shareToken)
    toast.success(t('share.created'))
  } catch (e) {
    toast.error(errorMessage(e, t('share.createFailed')))
  } finally {
    busy.value = false
  }
}

async function disable() {
  const ok = await confirm({
    title: t('share.revokeTitle'),
    message: t('share.revokeText'),
    confirmLabel: t('share.revokeConfirm'),
    variant: 'danger',
  })
  if (!ok) return
  busy.value = true
  try {
    await tripsApi.disableShare(props.trip.id)
    emit('updated', null)
    embedOpen.value = false
    toast.success(t('share.revoked'))
  } catch (e) {
    toast.error(errorMessage(e, t('share.revokeFailed')))
  } finally {
    busy.value = false
  }
}
</script>
