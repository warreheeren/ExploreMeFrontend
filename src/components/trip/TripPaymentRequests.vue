<template>
  <section class="card" aria-labelledby="payment-requests-title">
    <header class="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div class="min-w-0">
        <h3 id="payment-requests-title" class="card-title">{{ $t('payments.title') }}</h3>
        <p class="text-xs text-muted">{{ $t('payments.subtitle') }}</p>
      </div>
      <button v-if="others.length" type="button" class="btn btn-secondary btn-sm shrink-0" @click="openForm"><Icon name="plus" :size="14" /> {{ $t('payments.new') }}</button>
    </header>

    <div v-if="loading" class="space-y-2 p-4 sm:p-5" aria-busy="true"><div class="skeleton h-16 rounded-xl" /></div>

    <p v-else-if="error" class="p-4 text-sm font-semibold text-red-600 sm:p-5" role="alert">{{ error }}</p>

    <p v-else-if="!requests.length" class="p-4 text-sm text-muted sm:p-5">
      {{ others.length ? $t('payments.empty') : $t('payments.emptyAlone') }}
    </p>

    <ul v-else class="divide-y divide-line">
      <li v-for="r in requests" :key="r.id" class="px-4 py-4 sm:px-5" :class="r.isCancelled ? 'opacity-70' : ''">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div class="min-w-0">
            <p class="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
              {{ r.title }}
              <span v-if="r.isCancelled" class="chip chip-muted h-5 px-2 text-[10px]">{{ $t('payments.cancelled') }}</span>
            </p>
            <p class="mt-0.5 text-xs text-muted">
              {{ $t('payments.requestedBy', { name: r.requestedByDisplayName }) }}
              <template v-if="r.dueDate">
                · <span :class="dueClass(r)">{{ $t('payments.dueBy', { date: formatDate(r.dueDate) }) }}</span>
              </template>
            </p>
          </div>
          <p class="shrink-0 text-right">
            <span class="block text-base font-extrabold tabular-nums text-ink">{{ formatCurrency(r.amountPerPerson, r.currency) }}</span>
            <span class="block text-[11px] font-semibold text-muted">{{ $t('payments.perPerson') }}</span>
          </p>
        </div>

        <!-- Voortgang: wie heeft betaald -->
        <div class="mt-3 flex items-center gap-3">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="r.paidCount" aria-valuemin="0" :aria-valuemax="r.totalCount" :aria-label="$t('payments.progress', { paid: r.paidCount, total: r.totalCount })">
            <div class="h-full rounded-full bg-accent-700 transition-all" :style="{ width: `${percent(r)}%` }" />
          </div>
          <span class="shrink-0 text-xs font-bold text-body">{{ $t('payments.progress', { paid: r.paidCount, total: r.totalCount }) }}</span>
        </div>

        <ul class="mt-2.5 flex flex-wrap gap-1.5">
          <li v-for="s in r.shares" :key="s.userName">
            <!-- Aanvrager of eigenaar: tik om een (contante) betaling van iemand anders af te vinken. -->
            <component
              :is="canToggle(r, s) ? 'button' : 'span'"
              :type="canToggle(r, s) ? 'button' : undefined"
              class="inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-bold"
              :class="[s.paidAtUtc ? 'border-accent-700 bg-accent-50 text-ink' : 'border-line text-muted', canToggle(r, s) ? 'transition hover:border-line-strong' : '']"
              :disabled="canToggle(r, s) ? busyId === r.id : undefined"
              :aria-label="canToggle(r, s) ? $t(s.paidAtUtc ? 'payments.unmarkFor' : 'payments.markFor', { name: s.displayName }) : undefined"
              :title="s.paidAtUtc ? $t('payments.paidOn', { name: s.displayName, date: formatDate(s.paidAtUtc) }) : $t('payments.notPaid', { name: s.displayName })"
              @click="canToggle(r, s) && toggleFor(r, s)"
            >
              <Avatar :src="s.profilePhotoUrl || ''" :name="s.displayName" size="xs" />
              <span>{{ s.displayName.split(' ')[0] }}</span>
              <Icon v-if="s.paidAtUtc" name="check" :size="12" class="text-accent-700" />
            </component>
          </li>
        </ul>

        <div v-if="!r.isCancelled && (r.isMine || r.canManage)" class="mt-3 flex flex-wrap items-center gap-2">
          <template v-if="r.isMine && !r.paidByMe">
            <!-- Alleen wie nog moet betalen krijgt het IBAN van de aanvrager mee. -->
            <button v-if="r.payToIban" type="button" class="btn btn-primary btn-sm" :disabled="busyId === r.id" @click="openPay(r)"><Icon name="wallet" :size="14" /> {{ $t('payQr.pay') }}</button>
            <button type="button" class="btn btn-sm" :class="r.payToIban ? 'btn-secondary' : 'btn-primary'" :disabled="busyId === r.id" @click="markMine(r)"><Icon name="check" :size="14" /> {{ $t('payments.iPaid') }}</button>
          </template>
          <template v-else-if="r.isMine">
            <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700"><Icon name="check-double" :size="15" /> {{ $t('payments.youPaid') }}</span>
            <button type="button" class="text-xs font-bold text-muted hover:text-ink hover:underline" :disabled="busyId === r.id" @click="unmarkMine(r)">{{ $t('payments.undo') }}</button>
          </template>
          <button v-if="r.canManage" type="button" class="btn btn-danger-ghost btn-sm ml-auto" :disabled="busyId === r.id" @click="cancel(r)">{{ $t('payments.withdraw') }}</button>
        </div>

        <!-- Een betaling is een voorschot: tot de echte uitgave erin staat lijkt het alsof de aanvrager geld terug moet geven. -->
        <div v-if="r.paidCount && r.requestedByUserName === auth.userName" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-gray-50 px-3.5 py-2.5">
          <p class="min-w-0 flex-1 text-xs text-body">{{ $t('payments.advanceHint') }}</p>
          <button type="button" class="btn btn-secondary btn-sm" @click="$emit('add-expense', { title: r.title, amount: r.amountPerPerson * (r.totalCount + 1) })">
            <Icon name="plus" :size="14" /> {{ $t('payments.addExpense') }}
          </button>
        </div>
      </li>
    </ul>

    <PayQrDialog v-model="payOpen" :suggestion="paying" :currency="payingCurrency" :trip-title="tripTitle" :busy="!!busyId" @paid="payAndMark" />

    <Modal v-model="formOpen" :title="$t('payments.form.title')" :subtitle="$t('payments.form.subtitle')">
      <form id="payment-request-form" class="space-y-4" novalidate @submit.prevent="save">
        <div>
          <label for="pr-title" class="label">{{ $t('payments.form.what') }}</label>
          <input id="pr-title" v-model.trim="form.title" class="input" maxlength="120" :placeholder="$t('payments.form.whatPlaceholder')" required />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="pr-amount" class="label">{{ $t('payments.form.amount', { currency }) }}</label>
            <input id="pr-amount" v-model.number="form.amount" type="number" inputmode="decimal" min="0.01" step="0.01" class="input" required />
          </div>
          <div>
            <label for="pr-due" class="label">{{ $t('payments.form.due') }}</label>
            <input id="pr-due" v-model="form.due" type="date" class="input" :min="today" />
          </div>
        </div>
        <fieldset>
          <legend class="label">{{ $t('payments.form.who') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            <PersonToggle v-for="p in others" :key="p.userName" :person="p" :pressed="form.userNames.includes(p.userName)" @toggle="togglePerson(p.userName)" />
          </div>
        </fieldset>
        <p v-if="form.userNames.length && form.amount > 0" class="rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm text-body">
          {{ $t('payments.form.total', { total: formatCurrency(form.amount * form.userNames.length, currency), n: form.userNames.length }, form.userNames.length) }}
        </p>
        <p v-if="formError" class="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" :disabled="saving" @click="formOpen = false">{{ $t('common.cancel') }}</button>
        <button type="submit" form="payment-request-form" class="btn btn-dark" :disabled="saving || !canSave">{{ saving ? $t('payments.form.sending') : $t('payments.form.send') }}</button>
      </template>
    </Modal>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from '../ui/Avatar.vue'
import Icon from '../ui/Icon.vue'
import Modal from '../ui/Modal.vue'
import PersonToggle from './PersonToggle.vue'
import PayQrDialog from './PayQrDialog.vue'
import * as tripsApi from '@/api/tripsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { dateInputToIso, daysUntil, formatCurrency, formatDate, toDateInput } from '@/utils/date'

// Betaalverzoeken ("€ 150 p.p. voor het huisje"). Een betaling wordt in de API een gewone terugbetaling aan de
// aanvrager; daarom meldt dit onderdeel elke wijziging (`changed`) zodat het budget de saldi herlaadt.
const props = defineProps({
  tripId: { type: String, required: true },
  /** Deelnemers van het budget: [{ userName, displayName, profilePhotoUrl }]. */
  participants: { type: Array, default: () => [] },
  /** Basismunt van de reis; nieuwe verzoeken zijn in deze munt. */
  currency: { type: String, default: 'EUR' },
  tripTitle: { type: String, default: '' },
})
const emit = defineEmits(['changed', 'add-expense'])

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const requests = ref([])
const loading = ref(true)
const error = ref('')
const busyId = ref('')

/** Iedereen behalve jij: wie het verzoek doet ontvangt het geld en betaalt dus niet mee. */
const others = computed(() => props.participants.filter((p) => p.userName !== auth.userName))
const today = toDateInput(new Date())

const percent = (r) => (r.totalCount ? Math.round((r.paidCount / r.totalCount) * 100) : 0)

/** Deadline voorbij of bijna: alleen opvallend voor wie zelf nog moet betalen. */
function dueClass(r) {
  if (r.isCancelled || !r.isMine || r.paidByMe) return ''
  const days = daysUntil(r.dueDate)
  return days < 0 ? 'font-bold text-red-600' : days <= 2 ? 'font-bold text-rating-text' : ''
}

/** Voor een ander afvinken mag alleen de aanvrager of eigenaar; je eigen aandeel loopt via de knoppen eronder. */
const canToggle = (r, s) => r.canManage && !r.isCancelled && s.userName !== auth.userName

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    requests.value = await tripsApi.getPaymentRequests(props.tripId)
    error.value = ''
  } catch (e) {
    if (!silent) error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

function replace(updated) {
  requests.value = requests.value.map((r) => (r.id === updated.id ? updated : r))
}

/** Voert een wijziging uit, toont het resultaat en laat het budget de saldi herladen. */
async function run(r, action, successMessage) {
  busyId.value = r.id
  try {
    const updated = await action()
    if (updated) replace(updated)
    if (successMessage) toast.success(successMessage)
    emit('changed')
    return true
  } catch (e) {
    toast.error(errorMessage(e))
    await load({ silent: true })
    return false
  } finally {
    busyId.value = ''
  }
}

const markMine = (r) => run(r, () => tripsApi.markPaymentPaid(r.id), t('payments.markedPaid'))
const unmarkMine = (r) => run(r, () => tripsApi.unmarkPaymentPaid(r.id))
const toggleFor = (r, s) => run(r, () => (s.paidAtUtc ? tripsApi.unmarkPaymentPaid(r.id, s.userName) : tripsApi.markPaymentPaid(r.id, s.userName)))

async function cancel(r) {
  const ok = await confirm({
    title: t('payments.withdrawTitle'),
    message: r.paidCount ? t('payments.withdrawTextPaid') : t('payments.withdrawText'),
    confirmLabel: t('payments.withdraw'),
    variant: 'danger',
  })
  if (!ok) return
  if (await run(r, () => tripsApi.cancelPaymentRequest(r.id), t('payments.withdrawn'))) await load({ silent: true })
}

// ---------- betaal-QR ----------
const payOpen = ref(false)
const payingRequest = ref(null)
/** PayQrDialog verwacht de vorm van een afrekensuggestie. */
const paying = computed(() => (payingRequest.value
  ? { payToIban: payingRequest.value.payToIban, payToName: payingRequest.value.payToName, toDisplayName: payingRequest.value.requestedByDisplayName, amount: payingRequest.value.amountPerPerson }
  : null))
const payingCurrency = computed(() => payingRequest.value?.currency || props.currency)

function openPay(r) {
  payingRequest.value = r
  payOpen.value = true
}

async function payAndMark() {
  const r = payingRequest.value
  payOpen.value = false
  if (r) await markMine(r)
}

// ---------- nieuw verzoek ----------
const formOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ title: '', amount: null, due: '', userNames: [] })
const canSave = computed(() => form.title.length > 0 && form.amount > 0 && form.userNames.length > 0)

function openForm() {
  Object.assign(form, { title: '', amount: null, due: '', userNames: others.value.map((p) => p.userName) })
  formError.value = ''
  formOpen.value = true
}

function togglePerson(userName) {
  form.userNames = form.userNames.includes(userName) ? form.userNames.filter((n) => n !== userName) : [...form.userNames, userName]
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  formError.value = ''
  try {
    const created = await tripsApi.createPaymentRequest(props.tripId, {
      title: form.title,
      amountPerPerson: Number(form.amount),
      dueDate: form.due ? dateInputToIso(form.due) : null,
      userNames: form.userNames,
    })
    requests.value = [created, ...requests.value]
    formOpen.value = false
    toast.success(t('payments.sent', form.userNames.length))
    emit('changed')
  } catch (e) {
    formError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

let off = null
onMounted(() => {
  load()
  // Een reisgenoot betaalt of doet een verzoek: de API meldt dat als wijziging in het budget.
  off = onRealtime('tripChanged', (e) => {
    if (e?.tripId !== props.tripId || e?.area !== 'budget') return
    load({ silent: true })
    emit('changed')
  })
})
onBeforeUnmount(() => off?.())
</script>
