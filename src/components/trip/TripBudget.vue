<template>
  <div class="space-y-4">
    <LoadingState v-if="loading">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4"><div v-for="i in 4" :key="i" class="skeleton h-24 rounded-2xl" /></div>
    </LoadingState>

    <EmptyState v-else-if="error" icon="alert" :title="$t('budget.loadError')" :text="error">
      <button type="button" class="btn btn-secondary btn-sm" @click="load">{{ $t('common.retry') }}</button>
    </EmptyState>

    <template v-else-if="budget">
      <!-- Munt van het budget -->
      <div class="flex flex-wrap items-center justify-end gap-2 text-sm">
        <label for="budget-currency" class="font-semibold text-muted">{{ $t('budget.baseCurrency') }}</label>
        <select v-if="budget.canChangeCurrency" id="budget-currency" class="select h-9 w-28" :value="budget.currency" :disabled="changingCurrency" @change="changeCurrency($event.target.value)">
          <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
        </select>
        <span v-else id="budget-currency" class="chip chip-muted">{{ budget.currency }}</span>
      </div>

      <!-- Samenvatting -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="stat-tile">
          <p class="eyebrow">{{ $t('budget.planned') }}</p>
          <p class="stat-value mt-1.5">{{ money(budget.plannedTotal) }}</p>
          <p class="stat-label">{{ $t('budget.plannedHint') }}</p>
        </div>
        <div class="stat-tile">
          <p class="eyebrow">{{ $t('budget.spent') }}</p>
          <p class="stat-value mt-1.5">{{ money(budget.spentTotal) }}</p>
          <p class="stat-label">{{ $t('budget.expenseCount', budget.expenses.length) }}</p>
        </div>
        <div class="stat-tile">
          <p class="eyebrow">{{ $t('budget.perPerson') }}</p>
          <p class="stat-value mt-1.5">{{ money(budget.perPersonShare) }}</p>
          <p class="stat-label">{{ $t('budget.splitEqually') }}</p>
        </div>
        <div class="stat-tile">
          <p class="eyebrow">{{ $t('budget.companions') }}</p>
          <p class="stat-value mt-1.5">{{ budget.participantCount }}</p>
          <p class="stat-label">{{ $t('budget.inclOwner') }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Per categorie -->
        <section class="card card-pad">
          <h3 class="card-title mb-4">{{ $t('budget.perCategory') }}</h3>
          <p v-if="!categories.length" class="text-sm text-muted">{{ $t('budget.noCategories') }}</p>
          <ul class="space-y-3.5">
            <li v-for="c in categories" :key="c.category">
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="inline-flex items-center gap-2 font-bold text-ink"><Icon :name="c.meta.icon" :size="16" class="text-muted" /> {{ c.meta.label }}</span>
                <span class="tabular-nums font-semibold text-body">
                  {{ money(c.spent) }}<span v-if="c.planned" class="text-muted"> / {{ money(c.planned) }}</span>
                </span>
              </div>
              <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="c.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="c.meta.label">
                <div class="h-full rounded-full transition-all" :class="c.over ? 'bg-red-600' : 'bg-accent-700'" :style="{ width: `${Math.min(100, c.percent)}%` }" />
              </div>
            </li>
          </ul>
        </section>

        <!-- Verdeling -->
        <section class="card card-pad">
          <h3 class="card-title mb-4">{{ $t('budget.whoPays') }}</h3>
          <ul class="divide-y divide-line">
            <li v-for="p in budget.participants" :key="p.userName" class="flex items-center gap-3 py-2.5 first:pt-0">
              <Avatar :src="p.profilePhotoUrl" :name="p.displayName" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-ink">{{ p.displayName }}</p>
                <p class="text-xs text-muted">{{ $t('budget.paidShare', { paid: money(p.paid), share: money(p.share) }) }}</p>
              </div>
              <span class="text-sm font-bold tabular-nums" :class="p.balance > 0.004 ? 'text-accent-700' : p.balance < -0.004 ? 'text-red-600' : 'text-muted'">
                {{ p.balance > 0.004 ? '+' : '' }}{{ money(p.balance) }}
              </span>
            </li>
          </ul>
          <div v-if="suggestions.length" class="mt-4 rounded-xl bg-gray-50 p-3">
            <p class="eyebrow mb-2">{{ $t('budget.settleTitle') }}</p>
            <ul class="space-y-2 text-sm">
              <li v-for="(s, i) in suggestions" :key="i" class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-ink">{{ s.fromDisplayName }}</span>
                <Icon name="arrow-right" :size="14" class="text-muted" />
                <span class="font-bold text-ink">{{ s.toDisplayName }}</span>
                <span class="ml-auto font-extrabold tabular-nums text-ink">{{ money(s.amount) }}</span>
                <!-- Alleen de betaler krijgt payToIban mee van de API (en enkel als de ontvanger een IBAN heeft). -->
                <button v-if="s.payToIban" type="button" class="btn btn-primary btn-sm h-7" @click="openPay(s)">
                  <Icon name="wallet" :size="13" /> {{ $t('payQr.pay') }}
                </button>
                <button v-if="canRecord(s)" type="button" class="btn btn-secondary btn-sm h-7" :disabled="recording" @click="recordSettlement(s)">
                  <Icon name="check" :size="13" /> {{ $t('budget.markPaid') }}
                </button>
              </li>
            </ul>
          </div>
          <p v-else-if="budget.spentTotal > 0" class="mt-4 text-sm font-semibold text-accent-700">{{ $t('budget.allSettled') }}</p>

          <div v-if="budget.settlements?.length" class="mt-4 border-t border-line pt-3">
            <p class="eyebrow mb-2">{{ $t('budget.settlements') }}</p>
            <ul class="space-y-1.5 text-sm">
              <li v-for="s in budget.settlements" :key="s.id" class="flex items-center gap-2">
                <Icon name="check-double" :size="14" class="text-accent-700" />
                <span class="min-w-0 flex-1 truncate text-body">{{ $t('budget.settlementLine', { from: s.fromDisplayName, to: s.toDisplayName }) }} <span class="text-xs text-muted">· {{ formatDate(s.createdAtUtc) }}</span></span>
                <span class="font-bold tabular-nums text-ink">{{ money(s.amount) }}</span>
                <button v-if="s.canDelete" type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('budget.undoSettlement')" @click="deleteSettlement(s)"><Icon name="x" :size="14" /></button>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <!-- Betaalverzoeken: een betaling is een terugbetaling vooraf, dus de saldi hierboven bewegen mee. -->
      <TripPaymentRequests :trip-id="tripId" :participants="budget.participants" :currency="budget.currency" :trip-title="tripTitle" @changed="load" @add-expense="prefillExpense" />

      <BudgetOverview v-if="budget.spentTotal > 0" :budget="budget" />

      <!-- Uitgaven -->
      <section class="card">
        <header class="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 class="card-title">{{ $t('budget.expenses') }}</h3>
          <button type="button" class="btn btn-primary btn-sm" @click="openForm()"><Icon name="plus" :size="14" /> {{ $t('budget.expense') }}</button>
        </header>
        <EmptyState v-if="!budget.expenses.length" bare icon="wallet" :title="$t('budget.noExpenses')" :text="$t('budget.noExpensesText')" />
        <ul v-else class="divide-y divide-line">
          <li v-for="e in budget.expenses" :key="e.id" class="flex items-center gap-3 px-4 py-3 sm:px-5">
            <a v-if="e.receiptUrl" :href="resolveMediaUrl(e.receiptUrl)" target="_blank" rel="noopener" class="block h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100" :aria-label="$t('tripExtras.receipt.openFor', { title: e.title })">
              <img :src="thumbUrl(resolveMediaUrl(e.receiptUrl))" alt="" class="h-full w-full object-cover" loading="lazy" />
            </a>
            <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-body"><Icon :name="categoryMeta(e.category).icon" :size="18" /></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-ink">{{ e.title }}</p>
              <p class="truncate text-xs text-muted">{{ formatDate(e.date) }} · {{ $t('budget.paidBy', { name: e.paidByDisplayName }) }}<template v-if="e.items?.length"> · {{ $t('budget.split.itemCount', e.items.length) }}</template><template v-if="e.note"> · {{ e.note }}</template></p>
            </div>
            <span class="text-right">
              <span class="block text-sm font-bold tabular-nums text-ink">{{ formatCurrency(e.amount, e.currency) }}</span>
              <span v-if="e.currency !== budget.currency" class="block text-[11px] font-semibold tabular-nums text-muted">≈ {{ money(e.amountInBase) }}</span>
            </span>
            <div v-if="e.canEdit" class="flex">
              <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('budget.editExpense', { title: e.title })" @click="openForm(e)"><Icon name="edit" :size="16" /></button>
              <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('budget.deleteExpense', { title: e.title })" @click="remove(e)"><Icon name="trash" :size="16" /></button>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <PayQrDialog v-model="payOpen" :suggestion="paying" :currency="budget?.currency || 'EUR'" :trip-title="tripTitle" :busy="recording" @paid="payAndRecord" />

    <!-- Formulier -->
    <Modal v-model="formOpen" :title="editing ? $t('budget.form.editTitle') : $t('budget.form.newTitle')">
      <form id="expense-form" class="space-y-4" @submit.prevent="save">
        <ReceiptField v-model="form.receiptUrl" @apply="applyReceipt" />
        <div>
          <label for="exp-title" class="label">{{ $t('budget.form.title') }}</label>
          <input id="exp-title" v-model.trim="form.title" class="input" maxlength="120" required autofocus :placeholder="$t('budget.form.titlePlaceholder')" />
        </div>
        <div class="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
          <div>
            <label for="exp-amount" class="label">{{ $t('budget.form.amount') }}</label>
            <input id="exp-amount" v-model.number="form.amount" type="number" min="0.01" step="0.01" inputmode="decimal" class="input" required />
          </div>
          <div>
            <label for="exp-currency" class="label">{{ $t('budget.form.currency') }}</label>
            <input id="exp-currency" v-model="form.currency" class="input uppercase" list="exp-currency-list" maxlength="3" autocomplete="off" @change="form.currency = form.currency.toUpperCase()" />
            <datalist id="exp-currency-list">
              <option v-for="c in currencyOptions" :key="c" :value="c" />
            </datalist>
          </div>
        </div>
        <div v-if="isForeign" class="rounded-xl bg-gray-50 p-3">
          <label for="exp-rate" class="label">{{ $t('budget.form.rate', { from: form.currency, to: budget?.currency }) }}</label>
          <input id="exp-rate" v-model="form.rate" type="number" min="0" step="0.0001" inputmode="decimal" class="input" :placeholder="autoRate ? String(autoRate) : $t('budget.form.ratePlaceholder')" />
          <p class="hint">
            <template v-if="autoRate">{{ $t('budget.form.rateAuto', { rate: autoRate, amount: money((Number(form.amount) || 0) * (Number(form.rate) || autoRate)) }) }}</template>
            <template v-else-if="rateLoading">{{ $t('common.loading') }}</template>
            <template v-else>{{ $t('budget.form.rateNeeded') }}</template>
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="exp-date" class="label">{{ $t('budget.form.date') }}</label>
            <input id="exp-date" v-model="form.date" type="date" class="input" />
          </div>
          <div>
            <label for="exp-cat" class="label">{{ $t('budget.form.category') }}</label>
            <select id="exp-cat" v-model="form.category" class="select">
              <option v-for="c in EXPENSE_CATEGORY_ORDER" :key="c" :value="c">{{ categoryMeta(c).label }}</option>
            </select>
          </div>
        </div>
        <div>
          <label for="exp-payer" class="label">{{ $t('budget.form.paidBy') }}</label>
          <!-- Alleen de eigenaar mag een uitgave op naam van een ander zetten; reisgenoten registreren hun eigen betalingen. -->
          <select id="exp-payer" v-model="form.paidByUserName" class="select" :disabled="!isTripOwner" :aria-describedby="isTripOwner ? undefined : 'exp-payer-hint'">
            <option v-for="p in payerOptions" :key="p.userName" :value="p.userName">{{ p.displayName }}</option>
          </select>
          <p v-if="!isTripOwner" id="exp-payer-hint" class="hint">{{ $t('budget.form.payerOwnOnly') }}</p>
        </div>
        <ExpenseItemSplit
          v-model:items="form.items"
          v-model:rest="form.rest"
          :participants="budget?.participants || []"
          :total="Number(form.amount) || 0"
          :currency="form.currency"
          :suggested-items="form.ocrItems"
          @dismiss-suggestion="form.ocrItems = null"
        />
        <div>
          <label for="exp-note" class="label">{{ $t('budget.form.note') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
          <input id="exp-note" v-model.trim="form.note" class="input" maxlength="500" />
        </div>
        <p v-if="formError" class="text-sm font-semibold text-red-600">{{ formError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="formOpen = false">{{ $t('common.cancel') }}</button>
        <button type="submit" form="expense-form" class="btn btn-dark" :disabled="saving">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import LoadingState from '../ui/LoadingState.vue'
import { useI18n } from 'vue-i18n'
import Avatar from '../ui/Avatar.vue'
import Icon from '../ui/Icon.vue'
import Modal from '../ui/Modal.vue'
import EmptyState from '../ui/EmptyState.vue'
import BudgetOverview from './BudgetOverview.vue'
import ReceiptField from './ReceiptField.vue'
import ExpenseItemSplit from './ExpenseItemSplit.vue'
import PayQrDialog from './PayQrDialog.vue'
import TripPaymentRequests from './TripPaymentRequests.vue'
import { resolveMediaUrl, thumbUrl } from '@/utils/media'
import * as tripsApi from '@/api/tripsApi'
import * as geoApi from '@/api/geoApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { nudgeGuestSave } from '@/composables/useGuestSave'
import { useDebounce } from '@/composables/useDebounce'
import { errorMessage } from '@/utils/errors'
import { formatCurrency, formatDate, toDateInput, dateInputToIso } from '@/utils/date'
import { EXPENSE_CATEGORY_ORDER, categoryMeta, summarizeItemSplit } from '@/utils/budget'

const props = defineProps({
  tripId: { type: String, required: true },
  /** Eigenaar van de reis (mag terugbetalingen voor anderen registreren). */
  ownerUserName: { type: String, default: '' },
  /** Voor de omschrijving van de betaal-QR ("ExploreMe – {titel}"). */
  tripTitle: { type: String, default: '' },
})

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const budget = ref(null)
const loading = ref(true)
const error = ref('')
const changingCurrency = ref(false)
const recording = ref(false)

const money = (v) => formatCurrency(v, budget.value?.currency || 'EUR')

const currencyOptions = computed(() => {
  const list = new Set([budget.value?.currency || 'EUR', ...(budget.value?.supportedCurrencies || [])])
  return [...list]
})

const categories = computed(() =>
  (budget.value?.categories || [])
    .filter((c) => c.planned > 0 || c.spent > 0)
    .map((c) => {
      const base = c.planned > 0 ? c.planned : Math.max(budget.value.spentTotal, 1)
      return { ...c, meta: categoryMeta(c.category), percent: Math.round((c.spent / base) * 100), over: c.planned > 0 && c.spent > c.planned }
    })
)

const suggestions = computed(() => budget.value?.suggestions || [])

function canRecord(s) {
  return [s.fromUserName, s.toUserName, props.ownerUserName].includes(auth.userName)
}

const isTripOwner = computed(() => props.ownerUserName === auth.userName)
/** Eigenaar: alle deelnemers; anderen: alleen zichzelf (plus de huidige betaler bij het bewerken). */
const payerOptions = computed(() => {
  const all = budget.value?.participants || []
  return isTripOwner.value ? all : all.filter((p) => p.userName === auth.userName || p.userName === form.paidByUserName)
})

async function load() {
  loading.value = !budget.value
  error.value = ''
  try {
    budget.value = await tripsApi.getBudget(props.tripId)
    // Gast die geld tegoed heeft: een goed moment om het account te bewaren.
    const mine = (budget.value?.participants || []).find((p) => p.userName === auth.userName)
    if (mine?.balance > 0.004) nudgeGuestSave('owedMoney')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

async function changeCurrency(currency) {
  if (currency === budget.value.currency) return
  const ok = await confirm({ title: t('budget.changeCurrencyTitle', { currency }), message: t('budget.changeCurrencyText'), confirmLabel: t('budget.changeCurrencyConfirm') })
  if (!ok) {
    budget.value = { ...budget.value }
    return
  }
  changingCurrency.value = true
  try {
    budget.value = await tripsApi.setBudgetCurrency(props.tripId, currency)
  } catch (e) {
    toast.error(errorMessage(e))
    budget.value = { ...budget.value }
  } finally {
    changingCurrency.value = false
  }
}

async function recordSettlement(s) {
  const ok = await confirm({
    title: t('budget.recordTitle'),
    message: t('budget.recordText', { from: s.fromDisplayName, to: s.toDisplayName, amount: money(s.amount) }),
    confirmLabel: t('budget.markPaid'),
  })
  if (!ok) return
  recording.value = true
  try {
    await tripsApi.addSettlement(props.tripId, { fromUserName: s.fromUserName, toUserName: s.toUserName, amount: s.amount })
    toast.success(t('budget.recorded'))
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    recording.value = false
  }
}

// ---------- betaal-QR ----------
const payOpen = ref(false)
const paying = ref(null)

function openPay(s) {
  paying.value = s
  payOpen.value = true
}

/** "Markeer als betaald" in de dialoog: dialoog dicht en de bestaande registratie (met bevestiging). */
async function payAndRecord() {
  const s = paying.value
  payOpen.value = false
  if (s) await recordSettlement(s)
}

async function deleteSettlement(s) {
  const ok = await confirm({ title: t('budget.undoSettlement'), message: t('budget.settlementLine', { from: s.fromDisplayName, to: s.toDisplayName }) + ` · ${money(s.amount)}`, confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await tripsApi.deleteSettlement(props.tripId, s.id)
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

// ---------- formulier ----------
const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ title: '', amount: null, currency: 'EUR', rate: '', date: '', category: 'Other', paidByUserName: '', note: '', receiptUrl: '', items: [], rest: null, ocrItems: null })

/** Neemt de door de gebruiker bevestigde OCR-waarden van het kasticket over; artikelregels worden een voorstel in "Splits per item". */
function applyReceipt({ amount, date, currency, items } = {}) {
  if (amount != null) form.amount = amount
  if (date) form.date = date
  if (currency) form.currency = currency
  form.ocrItems = items?.length ? items : null
}
const autoRate = ref(null)
const rateLoading = ref(false)

const isForeign = computed(() => !!budget.value && /^[A-Z]{3}$/.test(form.currency) && form.currency !== budget.value.currency)
const rateKey = computed(() => (isForeign.value && formOpen.value ? `${form.currency}|${form.date}` : ''))
const debouncedRateKey = useDebounce(rateKey, 300)

watch(debouncedRateKey, async (key) => {
  autoRate.value = null
  if (!key) return
  rateLoading.value = true
  try {
    const res = await geoApi.getRate(form.currency, budget.value.currency, dateInputToIso(form.date))
    if (key === rateKey.value) autoRate.value = res.rate ? Math.round(res.rate * 10000) / 10000 : null
  } catch {
    autoRate.value = null
  } finally {
    rateLoading.value = false
  }
})

/** Vanuit een betaalverzoek: de echte uitgave invoeren met omschrijving en een geschat totaal (aanpasbaar). */
function prefillExpense({ title, amount }) {
  openForm()
  form.title = title
  form.amount = Math.round(amount * 100) / 100
}

function openForm(expense = null) {
  editing.value = expense
  formError.value = ''
  Object.assign(form, expense
    ? {
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency || budget.value.currency,
        rate: expense.currency !== budget.value.currency ? expense.exchangeRate : '',
        date: toDateInput(expense.date),
        category: expense.category,
        paidByUserName: expense.paidByUserName,
        note: expense.note || '',
        receiptUrl: expense.receiptUrl || '',
        items: (expense.items || []).map((i) => ({ key: i.id, description: i.description, amount: i.amount, userNames: [...i.userNames] })),
        rest: expense.participantUserNames?.length ? [...expense.participantUserNames] : null,
        ocrItems: null,
      }
    : { title: '', amount: null, currency: budget.value?.currency || 'EUR', rate: '', date: toDateInput(new Date()), category: 'Other', paidByUserName: auth.userName, note: '', receiptUrl: '', items: [], rest: null, ocrItems: null })
  formOpen.value = true
}

async function save() {
  if (saving.value) return
  if (!form.title || !(form.amount > 0)) {
    formError.value = t('budget.form.required')
    return
  }
  if (form.items.some((i) => !i.description?.trim() || !(Number(i.amount) > 0))) {
    formError.value = t('budget.split.invalidItem')
    return
  }
  const split = summarizeItemSplit(form.items, form.amount)
  if (split.over) {
    formError.value = t('budget.split.over', { items: formatCurrency(split.itemsTotal, form.currency), total: formatCurrency(form.amount, form.currency) })
    return
  }
  saving.value = true
  formError.value = ''
  const manualRate = isForeign.value && Number(form.rate) > 0 ? Number(form.rate) : null
  const payload = {
    title: form.title,
    amount: Number(form.amount),
    category: form.category,
    date: dateInputToIso(form.date),
    paidByUserName: form.paidByUserName || null,
    note: form.note || null,
    currency: form.currency || null,
    exchangeRate: manualRate,
    receiptUrl: form.receiptUrl || null,
    // Items worden bij elke opslag volledig vervangen; zonder items geldt de rest-selectie niet.
    items: form.items.map((i) => ({ description: i.description.trim(), amount: Number(i.amount), userNames: i.userNames })),
    participantUserNames: form.items.length ? form.rest : null,
  }
  try {
    // version: de API weigert (409) als een reisgenoot deze uitgave intussen wijzigde.
    if (editing.value) await tripsApi.updateExpense(props.tripId, editing.value.id, { ...payload, version: editing.value.version })
    else await tripsApi.addExpense(props.tripId, payload)
    formOpen.value = false
    toast.success(editing.value ? t('budget.updated') : t('budget.added'))
    if (!editing.value) nudgeGuestSave('firstExpense')
    await load()
  } catch (e) {
    if (e?.response?.status === 409) {
      // Verouderd formulier: sluiten en de actuele uitgaven tonen, anders blijft elke nieuwe poging botsen.
      formOpen.value = false
      toast.error(errorMessage(e))
      await load()
    } else {
      formError.value = errorMessage(e)
    }
  } finally {
    saving.value = false
  }
}

async function remove(expense) {
  const ok = await confirm({ title: t('budget.deleteTitle'), message: t('budget.deleteText', { title: expense.title, amount: formatCurrency(expense.amount, expense.currency) }), confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await tripsApi.deleteExpense(props.tripId, expense.id, expense.version)
    toast.success(t('budget.deleted'))
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
    if (e?.response?.status === 409) await load()
  }
}

onMounted(load)
</script>
