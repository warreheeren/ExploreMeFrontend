<template>
  <section id="capsules" class="card card-pad space-y-5 sm:p-6">
    <header class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-800"><Icon name="mail" :size="18" /></span>
      <div class="min-w-0">
        <h2 class="text-lg font-extrabold text-ink">{{ $t('capsule.title') }}</h2>
        <p class="text-sm text-muted">{{ $t('capsule.intro') }}</p>
      </div>
    </header>

    <!-- Schrijven -->
    <button v-if="!composing" type="button" class="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-left hover:border-ink" @click="startCompose">
      <span class="flex-1">
        <span class="block text-sm font-extrabold text-ink">{{ $t('capsule.write') }}</span>
        <span class="block text-xs text-muted">{{ $t('capsule.writeHint') }}</span>
      </span>
      <Icon name="plus" :size="18" class="text-muted" />
    </button>

    <form v-else class="space-y-4 rounded-2xl border border-line p-4" @submit.prevent="save">
      <div>
        <label for="tc-message" class="label">{{ $t('capsule.message') }}</label>
        <textarea id="tc-message" ref="messageRef" v-model="form.message" rows="5" maxlength="5000" class="textarea" :placeholder="$t('capsule.messagePlaceholder')" />
      </div>

      <div>
        <span class="label">{{ $t('capsule.photo') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></span>
        <div v-if="form.imageUrl" class="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
          <img :src="thumbUrl(form.imageUrl)" alt="" class="h-full w-full object-cover" />
          <button type="button" class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white" :aria-label="$t('capsule.removePhoto')" @click="form.imageUrl = null"><Icon name="x" :size="12" /></button>
        </div>
        <label v-else class="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line-strong text-muted hover:border-ink hover:text-ink">
          <Icon v-if="!uploading" name="camera" :size="20" />
          <span v-else class="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
          <input type="file" :accept="accept" class="sr-only" :aria-label="$t('capsule.addPhoto')" @change="onFile" />
        </label>
        <p v-if="uploadError" class="hint text-red-600">{{ uploadError }}</p>
      </div>

      <fieldset>
        <legend class="label">{{ $t('capsule.opensWhen') }}</legend>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="trigger in TRIGGERS"
            :key="trigger"
            type="button"
            class="chip-toggle"
            :class="form.trigger === trigger ? 'chip-toggle-active' : ''"
            :disabled="trigger === 'TripEnd' && tripEndPassed"
            :aria-pressed="form.trigger === trigger"
            @click="form.trigger = trigger"
          >{{ $t(`capsule.triggers.${trigger}`) }}</button>
        </div>
        <p v-if="form.trigger !== 'Custom' && previewOpenAt" class="hint">{{ $t('capsule.opensAt', { date: formatMoment(previewOpenAt) }) }}</p>
        <p v-else-if="tripEndPassed && form.trigger !== 'Custom'" class="hint">{{ $t('capsule.tripEnded') }}</p>
        <div v-if="form.trigger === 'Custom'" class="mt-2 max-w-xs">
          <label for="tc-open-at" class="sr-only">{{ $t('capsule.customLabel') }}</label>
          <input id="tc-open-at" v-model="form.customOpenAt" type="datetime-local" class="input" :min="minCustom" required />
        </div>
      </fieldset>

      <fieldset>
        <legend class="label">{{ $t('capsule.audience') }}</legend>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="audience in AUDIENCES"
            :key="audience"
            type="button"
            class="chip-toggle"
            :class="form.audience === audience ? 'chip-toggle-active' : ''"
            :aria-pressed="form.audience === audience"
            @click="form.audience = audience"
          >
            <Icon :name="audience === 'Self' ? 'lock' : 'users'" :size="13" /> {{ $t(`capsule.audiences.${audience}`) }}
          </button>
        </div>
      </fieldset>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost" @click="composing = false">{{ $t('common.cancel') }}</button>
        <button type="submit" class="btn btn-dark" :disabled="!canSave">
          <Icon name="lock" :size="14" /> {{ $t('capsule.seal') }}
        </button>
      </div>
    </form>

    <!-- Capsules -->
    <LoadingState v-if="loading"><div class="grid gap-3 sm:grid-cols-2"><div v-for="i in 2" :key="i" class="skeleton aspect-[16/10] rounded-2xl" /></div></LoadingState>
    <p v-else-if="!capsules.length" class="text-center text-sm text-muted">{{ $t('capsule.emptyText') }}</p>

    <ul v-else class="grid gap-4 sm:grid-cols-2">
      <li v-for="c in capsules" :key="c.id" :class="isLetter(c) ? 'sm:col-span-2' : ''">
        <!-- Geopende brief -->
        <article v-if="isLetter(c)" class="capsule-letter-in overflow-hidden rounded-2xl border border-accent-200 bg-accent-50">
          <div class="p-4 sm:p-5">
            <header class="flex items-center gap-3">
              <Avatar :src="c.authorProfilePhotoUrl" :name="c.authorDisplayName" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-extrabold text-ink">{{ $t('capsule.from', { name: c.authorDisplayName }) }}</p>
                <p class="text-xs font-semibold text-muted">{{ $t('capsule.openedOn', { date: formatMoment(c.openAtUtc) }) }}</p>
              </div>
              <Icon v-if="c.audience === 'Self'" name="lock" :size="14" class="text-muted" :aria-label="$t('capsule.forSelf')" />
            </header>
            <p class="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-body">{{ c.message }}</p>
          </div>
          <a v-if="c.imageUrl" :href="resolveMediaUrl(c.imageUrl)" target="_blank" rel="noopener" class="block aspect-[16/10] bg-gray-100">
            <img :src="c.imageUrl" alt="" class="h-full w-full object-cover" loading="lazy" />
          </a>
        </article>

        <!-- Envelop (verzegeld, klaar om te openen, of privé) -->
        <div v-else class="space-y-2">
          <component
            :is="canOpen(c) ? 'button' : 'div'"
            :type="canOpen(c) ? 'button' : undefined"
            class="capsule-envelope relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-accent-50 text-left"
            :class="[{ 'is-opening': openingId === c.id, 'is-ready': canOpen(c) }, c.isOpen && !c.canRead ? 'opacity-60' : '']"
            :aria-label="canOpen(c) ? $t('capsule.openAria', { name: c.authorDisplayName }) : $t('capsule.lockedAria', { name: c.authorDisplayName, date: formatMoment(c.openAtUtc) })"
            @click="canOpen(c) && unseal(c)"
          >
            <span class="capsule-paper absolute inset-x-5 bottom-3 top-5 rounded-lg bg-surface shadow-sm" aria-hidden="true" />
            <span class="capsule-pocket absolute inset-0 bg-accent-100" aria-hidden="true" />
            <span class="capsule-flap absolute inset-x-0 top-0 h-[58%] bg-accent-200" aria-hidden="true" />
            <span class="capsule-seal absolute left-1/2 top-[58%] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-700 text-white shadow-md" aria-hidden="true">
              <Icon :name="canOpen(c) ? 'mail' : 'lock'" :size="18" />
            </span>
            <span class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
              <span class="flex min-w-0 items-center gap-2">
                <Avatar :src="c.authorProfilePhotoUrl" :name="c.authorDisplayName" size="xs" />
                <span class="truncate text-xs font-bold text-ink">{{ c.authorDisplayName }}</span>
              </span>
              <span v-if="canOpen(c)" class="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-surface">{{ $t('capsule.tapToOpen') }}</span>
              <span v-else-if="!c.isOpen" class="rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold tabular-nums text-ink">{{ countdownText(c) }}</span>
            </span>
          </component>
          <div class="flex items-center justify-between gap-2 px-1">
            <p class="text-xs font-semibold text-muted">
              <template v-if="c.isOpen && !c.canRead">{{ $t('capsule.privateOpen', { name: c.authorDisplayName }) }}</template>
              <template v-else>{{ c.isOpen ? $t('capsule.openedOn', { date: formatMoment(c.openAtUtc) }) : $t('capsule.opensOn', { date: formatMoment(c.openAtUtc) }) }}</template>
              <template v-if="c.audience === 'Self' && c.canRead"> · {{ $t('capsule.forSelf') }}</template>
            </p>
            <button v-if="c.canDelete" type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('common.delete')" @click="remove(c)"><Icon name="trash" :size="15" /></button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import * as tripsApi from '@/api/tripsApi'
import { useToastStore } from '@/stores/toast'
import { useImageUpload } from '@/composables/useImageUpload'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { parseTimestamp } from '@/utils/date'
import { localeTag } from '@/i18n'
import { resolveMediaUrl, thumbUrl } from '@/utils/media'
import { capsuleCountdown, capsuleOpenAt, defaultCustomOpenInput, isUnsealed, markUnsealed, toDateTimeInput } from '@/utils/capsule'

const props = defineProps({
  trip: { type: Object, required: true },
})

const TRIGGERS = ['TripEnd', 'OneYear', 'Custom']
const AUDIENCES = ['Participants', 'Self']
/** Duur van de openanimatie (flap → brief omhoog), zie de CSS hieronder. */
const OPEN_ANIMATION_MS = 900

const { t } = useI18n()
const toast = useToastStore()
const { upload, uploading, error: uploadError, accept } = useImageUpload()
const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const capsules = ref([])
const loading = ref(true)
const composing = ref(false)
const saving = ref(false)
const messageRef = ref(null)
const openingId = ref(null)
// Id's die de kijker al openmaakte (ook bewaard in localStorage, zodat de animatie één keer speelt).
const unsealed = ref(new Set())
const now = ref(new Date())
const form = reactive({ message: '', imageUrl: null, trigger: 'TripEnd', customOpenAt: '', audience: 'Participants' })

const tripEndPassed = computed(() => capsuleOpenAt('TripEnd', props.trip.endDate) <= now.value)
const previewOpenAt = computed(() => {
  const at = capsuleOpenAt(form.trigger, props.trip.endDate)
  return at && at > now.value ? at : null
})
const minCustom = computed(() => toDateTimeInput(now.value))
const canSave = computed(() => {
  if (!form.message.trim() || saving.value || uploading.value) return false
  return form.trigger === 'Custom' ? !!form.customOpenAt : !!previewOpenAt.value
})

function isLetter(c) {
  return c.canRead && unsealed.value.has(c.id) && openingId.value !== c.id
}

function canOpen(c) {
  return c.canRead && !unsealed.value.has(c.id)
}

function formatMoment(value) {
  const d = value instanceof Date ? value : parseTimestamp(value)
  return d ? d.toLocaleString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
}

function countdownText(c) {
  const { days, hours, minutes } = capsuleCountdown(c.openAtUtc, now.value)
  if (days > 0) return t('capsule.countdown.days', { d: days, h: hours })
  if (hours > 0) return t('capsule.countdown.hours', { h: hours, m: minutes })
  return t('capsule.countdown.minutes', { m: Math.max(1, minutes) })
}

function startCompose() {
  Object.assign(form, {
    message: '',
    imageUrl: null,
    trigger: tripEndPassed.value ? 'OneYear' : 'TripEnd',
    customOpenAt: defaultCustomOpenInput(),
    audience: 'Participants',
  })
  composing.value = true
  nextTick(() => messageRef.value?.focus())
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  const url = await upload(file)
  if (url) form.imageUrl = url
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  try {
    const openAtUtc = form.trigger === 'Custom' ? new Date(form.customOpenAt).toISOString() : null
    const created = await tripsApi.createCapsule(props.trip.id, {
      message: form.message,
      imageUrl: form.imageUrl,
      trigger: form.trigger,
      openAtUtc,
      audience: form.audience,
    })
    capsules.value = sortCapsules([...capsules.value, created])
    composing.value = false
    toast.success(t('capsule.sealed'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function remove(c) {
  const ok = await confirm({ title: t('capsule.deleteTitle'), message: t('capsule.deleteText'), confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await tripsApi.deleteCapsule(props.trip.id, c.id)
    capsules.value = capsules.value.filter((x) => x.id !== c.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

function unseal(c) {
  if (openingId.value) return
  markUnsealed(c.id)
  if (reducedMotion) {
    unsealed.value = new Set([...unsealed.value, c.id])
    return
  }
  openingId.value = c.id
  unsealed.value = new Set([...unsealed.value, c.id])
  setTimeout(() => { openingId.value = null }, OPEN_ANIMATION_MS)
}

function sortCapsules(list) {
  return [...list].sort((a, b) => String(a.openAtUtc).localeCompare(String(b.openAtUtc)))
}

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const list = await tripsApi.getCapsules(props.trip.id)
    capsules.value = sortCapsules(list)
    unsealed.value = new Set(list.filter((c) => c.canRead && isUnsealed(c.id)).map((c) => c.id))
  } catch (e) {
    if (!silent) toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

// Aftelling bijwerken; gaat er intussen een capsule open, dan halen we de inhoud op.
let timer = 0
function tick() {
  now.value = new Date()
  if (capsules.value.some((c) => !c.isOpen && capsuleCountdown(c.openAtUtc, now.value).open)) load({ silent: true })
}

const off = onRealtime('tripChanged', (p) => {
  if (p?.tripId === props.trip.id && p.area === 'capsules') load({ silent: true })
})
onMounted(() => {
  load()
  timer = setInterval(tick, 30000)
})
onBeforeUnmount(() => {
  off()
  clearInterval(timer)
})
</script>

<style scoped>
/* Envelop: twee driehoeken (zak + flap) over een vel papier. */
.capsule-pocket {
  clip-path: polygon(0 100%, 0 30%, 50% 72%, 100% 30%, 100% 100%);
}
.capsule-flap {
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: top;
  transition: transform 0.45s ease;
  z-index: 1;
}
.capsule-seal {
  z-index: 2;
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.capsule-paper {
  transition: transform 0.45s ease 0.35s;
}
.capsule-envelope.is-ready:hover .capsule-flap {
  transform: rotateX(18deg);
}
.capsule-envelope.is-ready .capsule-seal {
  animation: capsule-pulse 1.8s ease-in-out infinite;
}

/* Openen: zegel weg, flap kantelt open, brief schuift omhoog. */
.capsule-envelope.is-opening .capsule-seal {
  animation: none;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
}
.capsule-envelope.is-opening .capsule-flap {
  transform: rotateX(180deg);
  z-index: 0;
}
.capsule-envelope.is-opening .capsule-paper {
  transform: translateY(-38%);
}

.capsule-letter-in {
  animation: capsule-unfold 0.4s ease both;
}

@keyframes capsule-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.08); }
}
@keyframes capsule-unfold {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .capsule-flap,
  .capsule-seal,
  .capsule-paper {
    transition: none;
  }
  .capsule-envelope.is-ready .capsule-seal,
  .capsule-letter-in {
    animation: none;
  }
}
</style>
