<template>
  <Modal :model-value="modelValue" size="xl" :title="$t('bookingImport.title')" :subtitle="$t('bookingImport.subtitle')" :dismissible="!busy" @update:model-value="close">
    <!-- Stap 1: tekst plakken of PDF kiezen -->
    <form v-if="step === 'input'" id="booking-import-form" class="space-y-4" @submit.prevent="analyze">
      <div>
        <label for="booking-text" class="label">{{ $t('bookingImport.pasteLabel') }}</label>
        <textarea
          id="booking-text"
          v-model="text"
          class="textarea min-h-[180px] font-mono text-xs"
          :placeholder="$t('bookingImport.pastePlaceholder')"
          :disabled="busy"
        />
        <p v-if="tooLong" class="mt-1 text-sm font-semibold text-red-600">{{ $t('bookingImport.tooLong', { n: text.length, max: MAX_BOOKING_TEXT }) }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm font-semibold text-muted">{{ $t('bookingImport.or') }}</span>
        <input ref="fileRef" type="file" accept="application/pdf,.pdf" class="sr-only" tabindex="-1" @change="onPdf" />
        <button type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="fileRef?.click()">
          <Icon name="file" :size="16" /> {{ readingPdf ? $t('bookingImport.readingPdf') : $t('bookingImport.choosePdf') }}
        </button>
        <span v-if="pdfFile" class="chip chip-muted h-7 max-w-full">
          <Icon name="paperclip" :size="12" />
          <span class="truncate">{{ $t('bookingImport.pdfLoaded', { name: pdfFile.name, n: text.length }, text.length) }}</span>
          <button type="button" class="-mr-1 ml-0.5 rounded-full p-0.5 hover:text-ink" :aria-label="$t('bookingImport.removePdf')" @click="clearPdf">
            <Icon name="x" :size="12" />
          </button>
        </span>
      </div>

      <p class="rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-body">
        {{ $t('bookingImport.privacy') }}
        {{ aiStatus.remainingToday > 0 ? $t('ai.remaining', aiStatus.remainingToday) : $t('ai.limitReached') }}
      </p>
      <p v-if="analyzing" class="flex items-center gap-2 text-sm font-semibold text-muted" role="status"><Icon name="sparkle" :size="16" class="animate-pulse" /> {{ $t('bookingImport.analyzing') }}</p>
      <p v-if="error" class="text-sm font-semibold text-red-600" role="alert">{{ error }}</p>
    </form>

    <!-- Stap 2: voorstellen nakijken -->
    <div v-else class="space-y-3">
      <p class="text-sm font-bold text-ink">{{ $t('bookingImport.found', items.length) }}</p>

      <article v-for="item in items" :key="item._key" class="rounded-2xl border border-line" :class="item.include ? 'bg-surface' : 'bg-gray-50 opacity-70'">
        <header class="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap">
          <label class="inline-flex shrink-0 items-center" :title="$t('bookingImport.include')">
            <input v-model="item.include" type="checkbox" class="checkbox" :aria-label="$t('bookingImport.include')" />
          </label>
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700"><Icon :name="KIND_ICONS[item.kind]" :size="16" /></span>
          <select :value="item.kind" class="select h-9 w-auto shrink-0 py-0 text-sm" :aria-label="$t('bookingImport.kind')" @change="setKind(item, $event.target.value)">
            <option v-for="k in BOOKING_KINDS" :key="k" :value="k">{{ $t(`bookingImport.kinds.${k}`) }}</option>
          </select>
          <input v-model="item.name" class="input h-9 min-w-0 flex-1 text-sm font-bold" maxlength="200" :aria-label="$t('bookingImport.name')" />
        </header>

        <div v-if="item.include" class="space-y-3 border-t border-line p-3">
          <!-- Locatie -->
          <div v-if="createsStop(item)">
            <p class="label">{{ $t('bookingImport.location') }}</p>
            <div v-if="hasLocation(item) && !item._searching" class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span class="inline-flex min-w-0 items-center gap-1.5 text-body"><Icon name="pin" :size="14" class="shrink-0 text-muted" /> <span class="truncate">{{ item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}` }}</span></span>
              <button type="button" class="btn btn-ghost btn-sm" @click="item._searching = true">{{ $t('bookingImport.changeLocation') }}</button>
            </div>
            <template v-else>
              <p v-if="!hasLocation(item)" class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><Icon name="alert" :size="14" /> {{ $t('bookingImport.chooseLocation') }}</p>
              <PlaceSearch :near="near" @select="(r) => pickPlace(item, r)" />
            </template>
          </div>
          <p v-else class="text-xs text-muted">{{ $t('bookingImport.noStop') }}</p>

          <!-- Datums en tijden -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label :for="`${item._key}-start`" class="label">{{ labels(item).start }}</label>
              <input :id="`${item._key}-start`" v-model="item.startDate" type="date" class="input" />
            </div>
            <div v-if="showStartTime(item)">
              <label :for="`${item._key}-start-time`" class="label">{{ $t('bookingImport.time') }}</label>
              <input :id="`${item._key}-start-time`" v-model="item.startTime" type="time" class="input" />
            </div>
            <div>
              <label :for="`${item._key}-end`" class="label">{{ labels(item).end }}</label>
              <input :id="`${item._key}-end`" v-model="item.endDate" type="date" class="input" :min="item.startDate || undefined" />
            </div>
            <div v-if="isTransport(item.kind)">
              <label :for="`${item._key}-end-time`" class="label">{{ $t('bookingImport.time') }}</label>
              <input :id="`${item._key}-end-time`" v-model="item.endTime" type="time" class="input" />
            </div>
          </div>
          <!-- Vlucht: nummer voor de vluchtstatus (de vertrekdatum is de begindatum hierboven). -->
          <div v-if="item.kind === 'flight'" class="sm:max-w-xs">
            <label :for="`${item._key}-flight`" class="label">{{ $t('editor.flight.number') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
            <input
              :id="`${item._key}-flight`"
              v-model.trim="item.flightNumber"
              class="input uppercase"
              maxlength="10"
              autocomplete="off"
              :placeholder="$t('editor.flight.numberPlaceholder')"
              :aria-invalid="!!item.flightNumber && !normalizeFlightNumber(item.flightNumber)"
            />
            <p v-if="item.flightNumber && !normalizeFlightNumber(item.flightNumber)" class="hint text-red-600">{{ $t('editor.flight.numberInvalid') }}</p>
          </div>
          <p v-if="outsideTrip(item)" class="text-xs text-muted">{{ $t('bookingImport.dayOutside') }}</p>
          <!-- Autohuur: prijzen vergelijken bij DiscoverCars voor dezelfde plaats en data. -->
          <p v-if="rentalUrl(item)" class="text-xs">
            <PartnerLink :href="rentalUrl(item)" icon="car">{{ $t('integrations.rentCar') }}</PartnerLink>
          </p>

          <!-- Prijs -->
          <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 sm:max-w-sm">
            <div>
              <label :for="`${item._key}-price`" class="label">{{ $t('bookingImport.price') }}</label>
              <input :id="`${item._key}-price`" v-model="item.price" type="number" min="0" step="0.01" inputmode="decimal" class="input" @input="item.createExpense = Number(item.price) > 0" />
            </div>
            <div>
              <label :for="`${item._key}-currency`" class="label">{{ $t('bookingImport.currency') }}</label>
              <select :id="`${item._key}-currency`" v-model="item.currency" class="select">
                <option v-for="c in currencyOptions(item)" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <p v-if="createsStop(item) && Number(item.price) > 0 && item.currency !== baseCurrency" class="text-xs text-muted">{{ $t('bookingImport.otherCurrency', { currency: item.currency }) }}</p>

          <div>
            <label :for="`${item._key}-notes`" class="label">{{ $t('bookingImport.notes') }}</label>
            <textarea :id="`${item._key}-notes`" v-model="item.description" rows="2" class="textarea text-sm" maxlength="2000" />
          </div>

          <div class="flex flex-col gap-2 text-sm">
            <label class="inline-flex items-center gap-2" :class="Number(item.price) > 0 ? '' : 'opacity-50'">
              <input v-model="item.createExpense" type="checkbox" class="checkbox" :disabled="!(Number(item.price) > 0)" /> {{ $t('bookingImport.createExpense') }}
            </label>
            <label v-if="pdfFile && createsStop(item)" class="inline-flex items-center gap-2">
              <input v-model="item.attachPdf" type="checkbox" class="checkbox" /> {{ $t('bookingImport.attachPdf') }}
            </label>
          </div>

          <p v-if="missingFor(item)" class="text-sm font-semibold text-red-600">{{ $t(`bookingImport.missing.${missingFor(item)}`) }}</p>
        </div>
      </article>

      <p class="text-xs text-muted">{{ $t('ai.disclaimer') }}</p>
      <p v-if="error" class="text-sm font-semibold text-red-600" role="alert">{{ error }}</p>
    </div>

    <template #footer>
      <template v-if="step === 'input'">
        <button type="button" class="btn btn-ghost" :disabled="busy" @click="close(false)">{{ $t('common.cancel') }}</button>
        <button type="submit" form="booking-import-form" class="btn btn-dark" :disabled="!canAnalyze">
          <Icon name="sparkle" :size="16" /> {{ analyzing ? $t('bookingImport.analyzing') : $t('bookingImport.analyze') }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="btn btn-ghost mr-auto" :disabled="busy" @click="step = 'input'">{{ $t('bookingImport.back') }}</button>
        <button type="button" class="btn btn-dark" :disabled="!canCreate" @click="create">
          <Icon name="plus" :size="16" /> {{ creating ? $t('bookingImport.creating') : $t('bookingImport.create', includedCount) }}
        </button>
      </template>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/Modal.vue'
import Icon from '../ui/Icon.vue'
import PlaceSearch from './PlaceSearch.vue'
import * as aiApi from '@/api/aiApi'
import * as tripsApi from '@/api/tripsApi'
import { useAiStatus } from '@/composables/useAiStatus'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { extractPdfText } from '@/utils/pdfText'
import { normalizeFlightNumber } from '@/utils/flights'
import {
  BOOKING_KINDS, KIND_ICONS, MAX_BOOKING_TEXT,
  changeKind, createsStop, dayNumberFor, hasLocation, isTransport, missingFor, toEditable, toExpensePayload, toStopPayload,
} from '@/utils/bookingImport'
import PartnerLink from '../ui/PartnerLink.vue'
import { useIntegrations } from '@/composables/useIntegrations'
import { splitCountries } from '@/utils/countries'
import { placeFromAddress } from '@/utils/stayLinks'
import { discoverCarsUrl } from '@/utils/travelLinks'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  trip: { type: Object, required: true },
  /** Vooraf gevuld bij het openen (bv. "Delen naar ExploreMe"): een PDF of tekstbestand, en/of tekst. */
  initialFiles: { type: Array, default: () => [] },
  initialText: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'imported'])

const { t } = useI18n()
const toast = useToastStore()
const { status: aiStatus, setRemaining } = useAiStatus()

const step = ref('input')
const text = ref('')
const pdfFile = ref(null)
const fileRef = ref(null)
const readingPdf = ref(false)
const analyzing = ref(false)
const creating = ref(false)
const error = ref('')
const items = ref([])

const busy = computed(() => readingPdf.value || analyzing.value || creating.value)
const tooLong = computed(() => text.value.length > MAX_BOOKING_TEXT)
const canAnalyze = computed(() => !busy.value && text.value.trim().length > 0 && !tooLong.value && aiStatus.value.remainingToday > 0)
const included = computed(() => items.value.filter((i) => i.include))
const includedCount = computed(() => included.value.length)
const canCreate = computed(() => !busy.value && includedCount.value > 0 && included.value.every((i) => !missingFor(i)))
const baseCurrency = computed(() => props.trip.baseCurrency || 'EUR')

/** Zoeken in de buurt van de eerste stop van de reis. */
const near = computed(() => {
  const first = [...(props.trip.stops || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))[0]
  return first ? { lat: first.latitude, lon: first.longitude } : null
})

// Bij openen: altijd met een lege lei beginnen (de tekst wordt nergens bewaard), of met de meegegeven inhoud.
// `immediate`: de dialoog kan al open gemount worden (ShareView).
watch(() => props.modelValue, (open) => {
  if (!open) return
  step.value = 'input'
  text.value = props.initialText.slice(0, MAX_BOOKING_TEXT)
  pdfFile.value = null
  items.value = []
  error.value = ''
  applyInitialFile()
}, { immediate: true })

/** Eerste bruikbare meegegeven bestand: een PDF (tekst eruit halen) of een tekstbestand. */
async function applyInitialFile() {
  const files = props.initialFiles.filter(Boolean)
  const pdf = files.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''))
  if (pdf) return readPdf(pdf)
  const plain = files.find((f) => f.type === 'text/plain' || /\.txt$/i.test(f.name || ''))
  if (!plain) return
  try {
    text.value = (await plain.text()).trim()
  } catch {
    error.value = t('bookingImport.analyzeFailed')
  }
}

function close(value) {
  if (busy.value && !value) return
  emit('update:modelValue', value)
}

function clearPdf() {
  pdfFile.value = null
  text.value = ''
}

async function onPdf(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  await readPdf(file)
}

async function readPdf(file) {
  if (!file) return
  error.value = ''
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    error.value = t('bookingImport.pdfOnly')
    return
  }
  readingPdf.value = true
  try {
    const extracted = (await extractPdfText(file)).trim()
    if (!extracted) {
      error.value = t('bookingImport.pdfNoText')
      return
    }
    text.value = extracted
    pdfFile.value = file
  } catch {
    error.value = t('bookingImport.pdfFailed')
  } finally {
    readingPdf.value = false
  }
}

async function analyze() {
  if (!canAnalyze.value) return
  analyzing.value = true
  error.value = ''
  try {
    const result = await aiApi.importBooking(props.trip.id, text.value.trim())
    setRemaining(result.remainingToday)
    items.value = result.bookings.map((b, i) => ({ ...toEditable(b, i), _searching: false }))
    step.value = 'review'
  } catch (e) {
    error.value = errorMessage(e, t('bookingImport.analyzeFailed'))
  } finally {
    analyzing.value = false
  }
}

function setKind(item, kind) {
  Object.assign(item, changeKind(item, kind))
}

function pickPlace(item, place) {
  item.latitude = place.latitude
  item.longitude = place.longitude
  item.placeId = place.placeId || null
  item.address = place.address || place.displayName || place.name || ''
  item._searching = false
}

function labels(item) {
  if (item.kind === 'accommodation') return { start: t('bookingImport.checkIn'), end: t('bookingImport.checkOut') }
  if (isTransport(item.kind)) return { start: t('bookingImport.departure'), end: t('bookingImport.arrival') }
  return { start: t('bookingImport.startDate'), end: t('bookingImport.endDate') }
}

const showStartTime = (item) => item.kind !== 'accommodation' && item.kind !== 'car_rental'

const { status: integrations, load: loadIntegrations } = useIntegrations()
loadIntegrations()

/**
 * DiscoverCars-link voor een autohuur-boeking (wordt geen stop, dus alleen hier): plaats uit het ophaaladres, anders
 * het hele adres, anders het (eerste) land van de reis.
 */
function rentalUrl(item) {
  if (item.kind !== 'car_rental') return null
  const place = placeFromAddress(item.address, item.name) || String(item.address || '').trim() || splitCountries(props.trip.country)[0] || ''
  return discoverCarsUrl({ place, pickup: item.startDate, dropoff: item.endDate, affiliateId: integrations.value.discoverCarsAffiliateId })
}

function outsideTrip(item) {
  if (!createsStop(item) || item.kind === 'accommodation') return false
  const date = isTransport(item.kind) ? item.endDate || item.startDate : item.startDate
  return !!date && dayNumberFor(item, props.trip) === null
}

function currencyOptions(item) {
  return [...new Set([item.currency, baseCurrency.value].filter(Boolean))]
}

/**
 * Eerst alle stops in één keer (achteraan), daarna per boeking de uitgave en de PDF-bijlage.
 * Mislukt een uitgave of bijlage, dan blijven de stops staan en melden we wat er misliep.
 */
async function create() {
  if (!canCreate.value) return
  creating.value = true
  error.value = ''
  const chosen = included.value
  const withStop = chosen.filter(createsStop)
  const stopFor = new Map()
  let updatedTrip = null

  try {
    if (withStop.length) {
      const before = new Set((props.trip.stops || []).map((s) => s.id))
      updatedTrip = await tripsApi.addStops(props.trip.id, withStop.map((i) => toStopPayload(i, props.trip)))
      const added = updatedTrip.stops.filter((s) => !before.has(s.id)).sort((a, b) => a.orderIndex - b.orderIndex)
      withStop.forEach((item, i) => { if (added[i]) stopFor.set(item._key, added[i].id) })
    }
  } catch (e) {
    error.value = errorMessage(e, t('bookingImport.createFailed'))
    creating.value = false
    return
  }

  let firstError = ''
  for (const item of chosen) {
    try {
      const expense = item.createExpense ? toExpensePayload(item) : null
      if (expense) await tripsApi.addExpense(props.trip.id, expense)
      if (item.attachPdf && pdfFile.value && stopFor.has(item._key)) {
        await tripsApi.uploadAttachment(props.trip.id, pdfFile.value, { tripStopId: stopFor.get(item._key), note: item.name.slice(0, 200) })
      }
    } catch (e) {
      firstError ||= errorMessage(e, t('bookingImport.createFailed'))
    }
  }

  creating.value = false
  emit('imported', updatedTrip)
  if (firstError) toast.error(t('bookingImport.partial', { error: firstError }))
  else toast.success(t('bookingImport.created', chosen.length))
  emit('update:modelValue', false)
}
</script>
