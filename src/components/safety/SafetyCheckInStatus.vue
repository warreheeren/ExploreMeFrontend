<template>
  <div v-if="checkIn" class="space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-extrabold text-ink">{{ $t('safety.status.dueAt', { time: dueLabel }) }}</p>
        <p class="mt-0.5 line-clamp-2 text-sm text-body">{{ checkIn.description }}</p>
      </div>
      <span class="chip shrink-0 font-extrabold tabular-nums" :class="stateClass">{{ state === 'overdue' ? $t('safety.chip.overdue') : countdown }}</span>
    </div>

    <p v-if="state === 'overdue'" class="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ $t('safety.status.overdue', { name: checkIn.emergencyContactName }) }}
    </p>

    <ul class="space-y-1 text-xs text-muted">
      <li>{{ $t('safety.status.contact', { name: checkIn.emergencyContactName }) }}</li>
      <li v-if="checkIn.tripTitle">{{ $t('safety.status.trip', { title: checkIn.tripTitle }) }}</li>
    </ul>

    <div class="rounded-2xl border border-line p-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-extrabold text-ink">{{ $t('safety.location.title') }}</p>
          <p class="text-xs text-muted">{{ $t('safety.location.hint') }}</p>
        </div>
        <Toggle :model-value="safety.sharingLocation" :label="$t('safety.location.title')" @update:model-value="safety.setSharing($event)" />
      </div>
      <p v-if="safety.sharingLocation && safety.locationError" class="mt-2 text-xs font-semibold text-red-600">{{ $t('safety.location.error') }}</p>
      <p v-else-if="safety.sharingLocation" class="mt-2 text-xs font-semibold text-muted">
        {{ checkIn.lastLocationAtUtc ? $t('safety.location.last', { time: timeAgo(checkIn.lastLocationAtUtc) }) : $t('safety.location.never') }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn btn-primary flex-1" :disabled="busy" @click="markSafe">
        <Icon name="check" :size="16" :stroke-width="2.5" /> {{ $t('safety.actions.safe') }}
      </button>
      <button
        v-for="m in EXTEND_OPTIONS"
        :key="m"
        type="button"
        class="btn btn-secondary"
        :disabled="busy"
        :aria-label="$t('safety.actions.extendAria', { label: extendLabel(m) })"
        @click="extend(m)"
      >
        {{ $t('safety.actions.extend', { label: extendLabel(m) }) }}
      </button>
      <button type="button" class="btn btn-ghost" :disabled="busy" @click="cancel">{{ $t('safety.actions.cancel') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Toggle from '@/components/ui/Toggle.vue'
import { useSafetyStore } from '@/stores/safety'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { localeTag } from '@/i18n'
import { parseTimestamp, timeAgo } from '@/utils/date'
import { errorMessage } from '@/utils/errors'
import { EXTEND_OPTIONS, countdownState, formatCountdown, msUntil } from '@/utils/safety'

const emit = defineEmits(['done'])

const { t } = useI18n()
const safety = useSafetyStore()
const toast = useToastStore()
const busy = ref(false)
const now = ref(new Date())

const checkIn = computed(() => safety.active)
const remaining = computed(() => (checkIn.value ? msUntil(checkIn.value.dueAtUtc, now.value) : 0))
const countdown = computed(() => formatCountdown(remaining.value))
const state = computed(() => countdownState(remaining.value))
const stateClass = computed(() => ({
  ok: 'bg-accent-50 text-accent-800',
  warning: 'bg-amber-50 text-amber-800',
  overdue: 'bg-red-600 text-white',
}[state.value]))

const dueLabel = computed(() => {
  const d = parseTimestamp(checkIn.value?.dueAtUtc)
  if (!d) return ''
  const sameDay = d.toDateString() === now.value.toDateString()
  return d.toLocaleString(localeTag(), sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
})

function extendLabel(minutes) {
  return minutes < 60 ? t('safety.form.inMinutes', { n: minutes }) : t('safety.form.inHours', { n: minutes / 60 })
}

async function run(action, message) {
  busy.value = true
  try {
    await action()
    toast.success(message)
    emit('done')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

const markSafe = () => run(() => safety.checkIn(), t('safety.safeDone'))
const extend = (minutes) => run(() => safety.extend(minutes), t('safety.extended'))

async function cancel() {
  const ok = await confirm({
    title: t('safety.actions.cancelConfirmTitle'),
    message: t('safety.actions.cancelConfirmText'),
    confirmLabel: t('safety.actions.cancel'),
    variant: 'danger',
  })
  if (ok) run(() => safety.cancel(), t('safety.cancelled'))
}

// Elke seconde tikken: in de laatste minuten telt de chip in seconden af.
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
</script>
