<template>
  <div class="mx-auto max-w-5xl">
    <PageHeader
      :title="isEdit ? $t('editor.header.editTitle') : $t('editor.header.newTitle')"
      :subtitle="isEdit ? $t('editor.header.editSubtitle') : $t('editor.header.newSubtitle')"
      :back-to="isEdit ? `/trips/${tripId}` : '/trips'"
      :back-label="isEdit ? $t('editor.header.backToTrip') : $t('editor.header.allTrips')"
    />

    <div v-if="loadingTrip" class="card flex items-center justify-center gap-3 p-10 text-sm font-semibold text-muted"><Spinner /> {{ $t('editor.loadingTrip') }}</div>

    <EmptyState v-else-if="loadError" icon="alert" :title="$t('editor.loadFailed')" :text="loadError">
      <RouterLink to="/trips" class="btn btn-secondary btn-sm">{{ $t('editor.toAllTrips') }}</RouterLink>
    </EmptyState>

    <form v-else class="space-y-6 pb-24" novalidate @submit.prevent="onSubmit">
      <!-- Over de reis -->
      <section class="card card-pad space-y-5 sm:p-6" aria-labelledby="sec-details">
        <h2 id="sec-details" class="card-title">{{ $t('editor.details.title') }}</h2>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div class="space-y-4">
            <div>
              <label for="trip-title" class="label">{{ $t('editor.details.tripTitle') }}</label>
              <input id="trip-title" ref="titleRef" v-model.trim="form.title" class="input" maxlength="120" :placeholder="$t('editor.details.titlePlaceholder')" required :aria-invalid="showErrors && !form.title" />
              <p v-if="showErrors && !form.title" class="hint text-red-600">{{ $t('editor.validation.title') }}</p>
            </div>
            <div>
              <label for="trip-country" class="label">{{ $t('editor.details.country') }}</label>
              <input id="trip-country" v-model.trim="form.country" class="input" maxlength="80" :placeholder="$t('editor.details.countryPlaceholder')" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="trip-start" class="label">{{ $t('editor.details.start') }}</label>
                <input id="trip-start" v-model="form.startDate" type="date" class="input" required />
              </div>
              <div>
                <label for="trip-end" class="label">{{ $t('editor.details.end') }}</label>
                <input id="trip-end" v-model="form.endDate" type="date" class="input" :min="form.startDate" required :aria-invalid="datesInvalid" />
              </div>
            </div>
            <p v-if="datesInvalid" class="-mt-2 text-xs font-semibold text-red-600">{{ $t('editor.validation.dates') }}</p>
            <div>
              <label for="trip-car" class="label">{{ $t('editor.details.travellersInCar') }}</label>
              <select id="trip-car" v-model.number="form.travellersInCar" class="select w-28" aria-describedby="trip-car-hint">
                <option v-for="n in 9" :key="n" :value="n">{{ n }}</option>
              </select>
              <p id="trip-car-hint" class="hint">{{ $t('editor.details.travellersInCarHint') }}</p>
            </div>
            <div>
              <label for="trip-desc" class="label">{{ $t('editor.details.description') }}</label>
              <textarea id="trip-desc" v-model="form.description" rows="4" maxlength="4000" class="textarea" :placeholder="$t('editor.details.descriptionPlaceholder')" />
            </div>
          </div>

          <!-- Omslagfoto -->
          <div>
            <span class="label">{{ $t('editor.cover.label') }}</span>
            <div class="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-gray-100">
              <CoverImage :src="form.coverImageUrl" :alt="$t('editor.cover.previewAlt')" :seed="form.title || 'nieuw'" eager />
              <span v-if="coverUploading" class="absolute inset-0 flex items-center justify-center bg-surface/60"><Spinner /></span>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <label class="btn btn-secondary btn-sm cursor-pointer">
                <Icon name="image" :size="14" /> {{ form.coverImageUrl ? $t('editor.cover.replace') : $t('editor.cover.upload') }}
                <input type="file" :accept="accept" class="sr-only" @change="onCoverFile" />
              </label>
              <button type="button" class="btn btn-ghost btn-sm" @click="showCoverUrl = !showCoverUrl"><Icon name="link" :size="14" /> URL</button>
              <button v-if="form.coverImageUrl" type="button" class="btn btn-ghost btn-sm" @click="form.coverImageUrl = ''">{{ $t('common.delete') }}</button>
            </div>
            <input v-if="showCoverUrl" v-model.trim="form.coverImageUrl" class="input mt-2" placeholder="https://…" :aria-label="$t('editor.cover.urlLabel')" />
            <p v-if="uploadError" class="hint text-red-600">{{ uploadError }}</p>
          </div>
        </div>

        <!-- Zichtbaarheid -->
        <fieldset :disabled="isEdit && !isOwner">
          <legend class="label">{{ $t('editor.visibility.legend') }}</legend>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label class="flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition" :class="form.isPublic ? 'border-ink bg-gray-50' : 'border-line hover:border-line-strong'">
              <input v-model="form.isPublic" type="radio" :value="true" class="mt-0.5 h-4 w-4 border-line-strong text-accent-700 focus:ring-accent-500" />
              <span><span class="flex items-center gap-1.5 text-sm font-bold text-ink"><Icon name="globe" :size="15" /> {{ $t('common.public') }}</span><span class="text-xs text-muted">{{ $t('editor.visibility.publicText') }}</span></span>
            </label>
            <label class="flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition" :class="!form.isPublic ? 'border-ink bg-gray-50' : 'border-line hover:border-line-strong'">
              <input v-model="form.isPublic" type="radio" :value="false" class="mt-0.5 h-4 w-4 border-line-strong text-accent-700 focus:ring-accent-500" />
              <span><span class="flex items-center gap-1.5 text-sm font-bold text-ink"><Icon name="lock" :size="15" /> {{ $t('common.private') }}</span><span class="text-xs text-muted">{{ $t('editor.visibility.privateText') }}</span></span>
            </label>
          </div>
          <p v-if="isEdit && !isOwner" class="hint">{{ $t('editor.visibility.ownerOnly') }}</p>
        </fieldset>
      </section>

      <!-- Kaart -->
      <section class="card overflow-hidden" aria-labelledby="sec-map">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <h2 id="sec-map" class="card-title">{{ $t('editor.map.title') }}</h2>
            <p class="text-xs font-semibold text-muted">{{ $t('editor.map.hint') }}</p>
          </div>
          <span class="chip chip-muted">{{ $t('editor.stops.count', form.stops.length) }}</span>
          <PlaceSearch class="w-full" :near="mapCenter" @select="addPlace" />
        </header>
        <div ref="mapRef" class="h-[380px] w-full sm:h-[440px]" role="application" :aria-label="$t('editor.map.label')" />
      </section>

      <!-- Stops -->
      <section class="space-y-3" :aria-label="$t('editor.stops.label')">
        <EmptyState v-if="!form.stops.length" icon="pin" :title="$t('editor.stops.emptyTitle')" :text="$t('editor.stops.emptyText')" />

        <article
          v-for="(stop, idx) in form.stops"
          :key="stop._key"
          :ref="(el) => setStopRef(stop._key, el)"
          class="card card-pad transition"
          :class="[selectedKey === stop._key ? 'border-accent-700 ring-2 ring-accent-100' : '', dragKey === stop._key ? 'opacity-50' : '', dropKey === stop._key && dragKey !== stop._key ? 'border-dashed border-accent-700' : '']"
          @dragover.prevent="onDragOver(stop)"
          @drop.prevent="onDrop"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="-ml-1 flex h-7 w-6 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
              draggable="true"
              :title="$t('editor.dragHint')"
              :aria-label="$t('editor.dragHint')"
              @dragstart="onDragStart($event, stop)"
              @dragend="onDragEnd"
            ><Icon name="grip" :size="16" /></span>
            <span class="flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-xs font-bold text-white" :style="{ background: stopTypeMeta(stop.type).color }">{{ idx + 1 }}</span>
            <div class="flex flex-wrap gap-1" role="radiogroup" :aria-label="$t('editor.stops.typeLabel', { n: idx + 1 })">
              <button
                v-for="t in STOP_TYPE_ORDER"
                :key="t"
                type="button"
                role="radio"
                :aria-checked="stop.type === t"
                class="chip border transition"
                :class="stop.type === t ? [stopTypeMeta(t).chip, 'border-transparent'] : 'border-line bg-surface text-muted hover:text-ink'"
                @click="stop.type = t"
              >
                <Icon :name="stopTypeMeta(t).icon" :size="13" /> {{ stopTypeMeta(t).singular }}
              </button>
            </div>
            <div class="ml-auto flex items-center">
              <button type="button" class="btn-icon btn-icon-sm" :disabled="idx === 0" :aria-label="$t('editor.stops.moveUp', { n: idx + 1 })" @click="move(idx, -1)"><Icon name="arrow-up" :size="16" /></button>
              <button type="button" class="btn-icon btn-icon-sm" :disabled="idx === form.stops.length - 1" :aria-label="$t('editor.stops.moveDown', { n: idx + 1 })" @click="move(idx, 1)"><Icon name="arrow-down" :size="16" /></button>
              <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('editor.stops.showOnMap', { n: idx + 1 })" @click="focusOnMap(stop)"><Icon name="locate" :size="16" /></button>
              <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('editor.stops.remove', { n: idx + 1 })" @click="removeStop(idx)"><Icon name="trash" :size="16" /></button>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
            <div class="space-y-3">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label :for="`stop-name-${stop._key}`" class="label">{{ $t('editor.stops.name') }}</label>
                  <input :id="`stop-name-${stop._key}`" v-model.trim="stop.name" class="input" maxlength="120" :placeholder="$t('editor.stops.namePlaceholder')" :aria-invalid="showErrors && !stop.name" />
                  <p v-if="showErrors && !stop.name" class="hint text-red-600">{{ $t('editor.validation.stopName') }}</p>
                </div>
                <div>
                  <label :for="`stop-addr-${stop._key}`" class="label">{{ $t('editor.stops.address') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
                  <input :id="`stop-addr-${stop._key}`" v-model.trim="stop.address" class="input" maxlength="200" />
                </div>
              </div>
              <div>
                <label :for="`stop-desc-${stop._key}`" class="label">{{ $t('editor.stops.description') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
                <textarea :id="`stop-desc-${stop._key}`" v-model="stop.description" rows="2" maxlength="1000" class="textarea" />
              </div>

              <!-- Planning: vaste dag, tijd en hoe je hier komt -->
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label :for="`stop-day-${stop._key}`" class="label">{{ $t('editor.schedule.day') }}</label>
                  <select :id="`stop-day-${stop._key}`" v-model.number="stop.dayNumber" class="select">
                    <option :value="null">{{ $t('editor.schedule.dayAuto') }}</option>
                    <option v-for="d in dayOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
                  </select>
                </div>
                <div>
                  <label :for="`stop-time-${stop._key}`" class="label">{{ $t('editor.schedule.time') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
                  <input :id="`stop-time-${stop._key}`" v-model="stop.startTime" type="time" class="input" />
                </div>
                <div>
                  <label :for="`stop-mode-${stop._key}`" class="label">{{ $t('editor.schedule.arrivalMode') }}</label>
                  <div class="relative">
                    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"><Icon :name="travelModeMeta(stop.arrivalMode).icon" :size="16" /></span>
                    <select :id="`stop-mode-${stop._key}`" v-model="stop.arrivalMode" class="select pl-9">
                      <option v-for="m in TRAVEL_MODE_ORDER" :key="m" :value="m">{{ travelModeMeta(m).label }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Vlucht: nummer + lokale vertrekdatum voor de vluchtstatus (alleen bij aankomst per vliegtuig) -->
              <div v-if="stop.arrivalMode === 'Plane'" class="grid grid-cols-1 gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
                <div>
                  <label :for="`stop-flight-${stop._key}`" class="label">{{ $t('editor.flight.number') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
                  <input
                    :id="`stop-flight-${stop._key}`"
                    v-model.trim="stop.flightNumber"
                    class="input uppercase"
                    maxlength="10"
                    autocomplete="off"
                    :placeholder="$t('editor.flight.numberPlaceholder')"
                    :aria-invalid="flightNumberInvalid(stop)"
                    :aria-describedby="`stop-flight-hint-${stop._key}`"
                  />
                  <p v-if="flightNumberInvalid(stop)" :id="`stop-flight-hint-${stop._key}`" class="hint text-red-600">{{ $t('editor.flight.numberInvalid') }}</p>
                  <p v-else :id="`stop-flight-hint-${stop._key}`" class="hint">{{ $t('editor.flight.numberHint') }}</p>
                </div>
                <div>
                  <label :for="`stop-flightdate-${stop._key}`" class="label">{{ $t('editor.flight.date') }}</label>
                  <input :id="`stop-flightdate-${stop._key}`" v-model="stop.flightDate" type="date" class="input" :aria-invalid="showErrors && flightDateMissing(stop)" />
                  <p v-if="showErrors && flightDateMissing(stop)" class="hint text-red-600">{{ $t('editor.flight.dateRequired') }}</p>
                  <p v-else class="hint">{{ $t('editor.flight.dateHint') }}</p>
                </div>
              </div>

              <!-- Extra velden per type -->
              <div v-if="stop.type === 'FoodSpot'" class="grid grid-cols-1 gap-3 rounded-xl bg-orange-50/60 p-3 sm:grid-cols-3">
                <div>
                  <span class="label">{{ $t('editor.food.rating') }}</span>
                  <StarRating v-model="stop.rating" :readonly="false" size="md" />
                </div>
                <div>
                  <label :for="`stop-cuisine-${stop._key}`" class="label">{{ $t('editor.food.cuisine') }}</label>
                  <input :id="`stop-cuisine-${stop._key}`" v-model.trim="stop.cuisineType" class="input" maxlength="60" :placeholder="$t('editor.food.cuisinePlaceholder')" />
                </div>
                <div>
                  <label :for="`stop-price-${stop._key}`" class="label">{{ $t('editor.food.priceLevel') }}</label>
                  <select :id="`stop-price-${stop._key}`" v-model.number="stop.priceLevel" class="select">
                    <option :value="null">{{ $t('editor.food.priceUnknown') }}</option>
                    <option :value="1">{{ $t('editor.food.priceCheap') }}</option>
                    <option :value="2">{{ $t('editor.food.priceMid') }}</option>
                    <option :value="3">{{ $t('editor.food.priceHigh') }}</option>
                  </select>
                </div>
              </div>

              <div v-else-if="stop.type === 'Accommodation'" class="grid grid-cols-1 gap-3 rounded-xl bg-violet-50/60 p-3 sm:grid-cols-3">
                <div>
                  <label :for="`stop-in-${stop._key}`" class="label">{{ $t('editor.hotel.checkIn') }}</label>
                  <input :id="`stop-in-${stop._key}`" v-model="stop.checkInDate" type="date" class="input" :min="form.startDate" :max="form.endDate" />
                </div>
                <div>
                  <label :for="`stop-out-${stop._key}`" class="label">{{ $t('editor.hotel.checkOut') }}</label>
                  <input :id="`stop-out-${stop._key}`" v-model="stop.checkOutDate" type="date" class="input" :min="stop.checkInDate || form.startDate" :aria-invalid="checkoutInvalid(stop)" />
                </div>
                <div>
                  <label :for="`stop-ppn-${stop._key}`" class="label">{{ $t('editor.hotel.pricePerNight') }}</label>
                  <input :id="`stop-ppn-${stop._key}`" v-model.number="stop.pricePerNight" type="number" min="0" step="1" inputmode="decimal" class="input" />
                </div>
                <p v-if="checkoutInvalid(stop)" class="text-xs font-semibold text-red-600 sm:col-span-3">{{ $t('editor.hotel.checkoutBeforeCheckin') }}</p>
              </div>

              <div v-else-if="stop.type === 'Activity'" class="grid grid-cols-1 gap-3 rounded-xl bg-emerald-50/60 p-3 sm:grid-cols-2">
                <div>
                  <label :for="`stop-dur-${stop._key}`" class="label">{{ $t('editor.activity.duration') }}</label>
                  <input :id="`stop-dur-${stop._key}`" v-model.trim="stop.duration" class="input" maxlength="40" :placeholder="$t('editor.activity.durationPlaceholder')" />
                </div>
                <div>
                  <label :for="`stop-cost-${stop._key}`" class="label">{{ $t('editor.activity.cost') }}</label>
                  <input :id="`stop-cost-${stop._key}`" v-model.number="stop.cost" type="number" min="0" step="1" inputmode="decimal" class="input" :placeholder="$t('editor.activity.costPlaceholder')" />
                </div>
              </div>

              <p class="text-xs font-semibold text-muted">{{ stop.latitude.toFixed(4) }}, {{ stop.longitude.toFixed(4) }}</p>
            </div>

            <!-- Foto van de stop -->
            <div>
              <span class="label">{{ $t('editor.stops.photo') }}</span>
              <div class="relative aspect-square overflow-hidden rounded-xl border border-line bg-gray-50">
                <img v-if="stop.imageUrl" :src="stop.imageUrl" alt="" class="h-full w-full object-cover" />
                <span v-else class="flex h-full w-full items-center justify-center" :class="stopTypeMeta(stop.type).soft"><Icon :name="stopTypeMeta(stop.type).icon" :size="22" /></span>
                <span v-if="stop._uploading" class="absolute inset-0 flex items-center justify-center bg-surface/60"><Spinner /></span>
              </div>
              <div class="mt-2 flex gap-1">
                <label class="btn btn-secondary btn-sm flex-1 cursor-pointer px-2">
                  {{ stop.imageUrl ? $t('editor.stops.changePhoto') : $t('editor.stops.uploadPhoto') }}
                  <input type="file" :accept="accept" class="sr-only" @change="(e) => onStopFile(e, stop)" />
                </label>
                <button v-if="stop.imageUrl" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('editor.stops.removePhoto')" @click="stop.imageUrl = ''"><Icon name="x" :size="14" /></button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <!-- Opslaan -->
      <div class="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface/95 backdrop-blur md:sticky md:bottom-4 md:mx-0 md:rounded-2xl md:border">
        <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <p v-if="error" class="min-w-0 flex-1 text-sm font-semibold text-red-600" role="alert">{{ error }}</p>
          <p v-else class="hidden min-w-0 flex-1 text-sm text-muted sm:block">{{ $t('editor.stops.count', form.stops.length) }} · {{ formatDateRange(form.startDate, form.endDate) }}</p>
          <RouterLink :to="isEdit ? `/trips/${tripId}` : '/trips'" class="btn btn-ghost ml-auto">{{ $t('common.cancel') }}</RouterLink>
          <button type="submit" class="btn btn-dark" :disabled="saving || anyUploading">
            {{ saving ? $t('common.saving') : isEdit ? $t('editor.saveChanges') : $t('editor.saveTrip') }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import StarRating from '@/components/StarRating.vue'
import PlaceSearch from '@/components/trip/PlaceSearch.vue'
import * as tripsApi from '@/api/tripsApi'
import * as geoApi from '@/api/geoApi'
import { useToastStore } from '@/stores/toast'
import { useImageUpload } from '@/composables/useImageUpload'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'
import { addDays, dateInputToIso, formatDate, formatDateRange, toDateInput, tripDays } from '@/utils/date'
import { STOP_TYPE_ORDER, stopTypeMeta } from '@/utils/stopTypes'
import { TRAVEL_MODE_ORDER, travelModeMeta } from '@/utils/travelModes'
import { normalizeFlightNumber } from '@/utils/flights'
import { addBaseTiles, observeMapSize, pinIcon } from '@/utils/leaflet'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { upload, error: uploadError, accept } = useImageUpload()

const tripId = computed(() => route.params.id)
const isEdit = computed(() => route.name === 'trip-edit')
const isOwner = ref(true)

const loadingTrip = ref(false)
const loadError = ref('')
const saving = ref(false)
const error = ref('')
const showErrors = ref(false)
const showCoverUrl = ref(false)
const coverUploading = ref(false)
const selectedKey = ref(null)
const titleRef = ref(null)

const today = toDateInput(new Date())
const form = reactive({
  title: '',
  description: '',
  coverImageUrl: '',
  country: '',
  startDate: today,
  endDate: today,
  isPublic: true,
  travellersInCar: 1,
  stops: [],
})

let keySeq = 0
const newKey = () => `s${Date.now().toString(36)}${(keySeq++).toString(36)}`

function makeStop(partial = {}) {
  return reactive({
    _key: newKey(),
    _uploading: false,
    name: '',
    description: '',
    address: '',
    imageUrl: '',
    latitude: 0,
    longitude: 0,
    type: 'Waypoint',
    rating: null,
    cuisineType: '',
    priceLevel: null,
    checkInDate: '',
    checkOutDate: '',
    pricePerNight: null,
    duration: '',
    cost: null,
    placeId: null,
    dayNumber: null,
    startTime: '',
    arrivalMode: 'Car',
    flightNumber: '',
    flightDate: '',
    ...partial,
  })
}

const datesInvalid = computed(() => !!form.startDate && !!form.endDate && form.endDate < form.startDate)
const anyUploading = computed(() => coverUploading.value || form.stops.some((s) => s._uploading))
const checkoutInvalid = (s) => !!s.checkInDate && !!s.checkOutDate && s.checkOutDate < s.checkInDate
// Vluchtnummer (optioneel) moet geldig zijn en heeft dan een vertrekdatum nodig voor de vluchtstatus.
const flightNumberInvalid = (s) => s.arrivalMode === 'Plane' && !!s.flightNumber && !normalizeFlightNumber(s.flightNumber)
const flightDateMissing = (s) => s.arrivalMode === 'Plane' && !!s.flightNumber && !s.flightDate
const flightInvalid = (s) => flightNumberInvalid(s) || flightDateMissing(s)

// Reisdagen voor de dagkiezer ("Dag 2 · 5 nov.").
const dayCount = computed(() => (form.startDate && !datesInvalid.value ? tripDays(form.startDate, form.endDate) : 1))
const dayOptions = computed(() =>
  Array.from({ length: dayCount.value }, (_, i) => ({
    value: i + 1,
    label: t('editor.schedule.dayN', { n: i + 1, date: formatDate(addDays(form.startDate, i)) }),
  })),
)
// Wordt de reis korter, dan vallen vastgezette dagen buiten de reis terug op automatisch.
watch(dayCount, (count) => {
  for (const s of form.stops) if (s.dayNumber > count) s.dayNumber = null
})

// ---------- kaart ----------
const mapRef = ref(null)
let map = null
let markerLayer = null
let stopObserving = () => {}
const stopEls = new Map()

function setStopRef(key, el) {
  if (el) stopEls.set(key, el)
  else stopEls.delete(key)
}

function renderMarkers() {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  form.stops.forEach((stop, idx) => {
    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: pinIcon(stop.type, { label: idx + 1, selected: stop._key === selectedKey.value }),
      draggable: true,
      title: stop.name || t('editor.stops.fallbackName', { n: idx + 1 }),
      zIndexOffset: stop._key === selectedKey.value ? 1000 : 0,
    })
    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng()
      stop.latitude = lat
      stop.longitude = lng
    })
    marker.on('click', () => selectStop(stop, true))
    marker.addTo(markerLayer)
  })
}

function selectStop(stop, scroll = false) {
  selectedKey.value = stop._key
  if (scroll) nextTick(() => stopEls.get(stop._key)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

function focusOnMap(stop) {
  selectStop(stop)
  map?.flyTo([stop.latitude, stop.longitude], Math.max(map.getZoom(), 12), { duration: 0.6 })
  mapRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function fitToStops() {
  if (!map || !form.stops.length) return
  map.fitBounds(L.latLngBounds(form.stops.map((s) => [s.latitude, s.longitude])), { padding: [40, 40], maxZoom: 12 })
}

function initMap() {
  map = L.map(mapRef.value, { scrollWheelZoom: true }).setView([48.5, 9], 4)
  addBaseTiles(map)
  markerLayer = L.layerGroup().addTo(map)
  map.on('click', (e) => addStop(e.latlng.lat, e.latlng.lng))
  const updateCenter = () => {
    const c = map.getCenter()
    mapCenter.value = map.getZoom() >= 5 ? { lat: c.lat, lon: c.lng } : null
  }
  map.on('moveend', updateCenter)
  stopObserving = observeMapSize(map, mapRef.value)
  renderMarkers()
  fitToStops()
}

watch(
  () => form.stops.map((s) => `${s._key}|${s.type}|${s.latitude}|${s.longitude}|${s.name}`).join(';') + `#${selectedKey.value}`,
  renderMarkers
)

// ---------- stops ----------
const mapCenter = ref(null)

/** Klik op de kaart: stop toevoegen en (op de achtergrond) naam en adres invullen via OpenStreetMap. */
/** Zelfde maximum als de API (TripService). */
const MAX_STOPS = 100

function addStop(lat, lng, extra = null) {
  if (form.stops.length >= MAX_STOPS) {
    toast.error(t('editor.stops.maxReached', { n: MAX_STOPS }))
    return
  }
  const stop = makeStop({ latitude: lat, longitude: lng, ...(extra || {}) })
  form.stops.push(stop)
  selectedKey.value = stop._key
  nextTick(() => {
    const el = stopEls.get(stop._key)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.querySelector('input')?.focus({ preventScroll: true })
  })
  if (!extra) fillFromReverse(stop)
  return stop
}

async function fillFromReverse(stop) {
  try {
    const place = await geoApi.reverseGeocode(stop.latitude, stop.longitude)
    if (!place) return
    if (!stop.address) stop.address = place.address || ''
    if (!stop.name) stop.name = place.name || ''
  } catch { /* adres blijft gewoon leeg */ }
}

/** Gekozen uit plaatszoeken: naam, adres, soort en OSM-id komen mee. */
function addPlace(place) {
  addStop(place.latitude, place.longitude, {
    name: place.name,
    address: place.address || '',
    type: place.suggestedType || 'Waypoint',
    placeId: place.placeId,
  })
  map?.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 12), { duration: 0.6 })
}

// ---------- slepen om de volgorde te wijzigen ----------
const dragKey = ref(null)
const dropKey = ref(null)

function onDragStart(e, stop) {
  dragKey.value = stop._key
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', stop._key)
  const card = stopEls.get(stop._key)
  if (card) e.dataTransfer.setDragImage(card, 24, 24)
}

function onDragOver(stop) {
  if (!dragKey.value || stop._key === dragKey.value) return
  dropKey.value = stop._key
  const from = form.stops.findIndex((s) => s._key === dragKey.value)
  const to = form.stops.findIndex((s) => s._key === stop._key)
  if (from < 0 || to < 0) return
  const [item] = form.stops.splice(from, 1)
  form.stops.splice(to, 0, item)
}

function onDrop() {
  onDragEnd()
}

function onDragEnd() {
  dragKey.value = null
  dropKey.value = null
}

async function removeStop(idx) {
  const stop = form.stops[idx]
  if (stop.name || stop.description) {
    const ok = await confirm({
      title: t('editor.stops.removeTitle'),
      message: t('editor.stops.removeMessage', { name: stop.name || t('editor.stops.fallbackName', { n: idx + 1 }) }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (!ok) return
  }
  form.stops.splice(idx, 1)
}

function move(idx, delta) {
  const target = idx + delta
  if (target < 0 || target >= form.stops.length) return
  const [item] = form.stops.splice(idx, 1)
  form.stops.splice(target, 0, item)
}

// ---------- uploads ----------
async function onCoverFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  coverUploading.value = true
  const url = await upload(file)
  coverUploading.value = false
  if (url) form.coverImageUrl = url
}

async function onStopFile(e, stop) {
  const file = e.target.files?.[0]
  e.target.value = ''
  stop._uploading = true
  const url = await upload(file)
  stop._uploading = false
  if (url) stop.imageUrl = url
  else if (uploadError.value) toast.error(uploadError.value)
}

// ---------- laden & opslaan ----------
async function loadTrip() {
  loadingTrip.value = true
  try {
    const trip = await tripsApi.getTripById(tripId.value)
    if (!trip.canEdit) {
      loadError.value = t('editor.noPermission')
      return
    }
    isOwner.value = !!trip.isOwner
    Object.assign(form, {
      title: trip.title || '',
      description: trip.description || '',
      coverImageUrl: trip.coverImageUrl || '',
      country: trip.country || '',
      startDate: toDateInput(trip.startDate) || today,
      endDate: toDateInput(trip.endDate) || today,
      isPublic: trip.isPublic,
      travellersInCar: trip.travellersInCar || 1,
      stops: (trip.stops || [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => makeStop({
          name: s.name || '',
          description: s.description || '',
          address: s.address || '',
          imageUrl: s.imageUrl || '',
          latitude: s.latitude,
          longitude: s.longitude,
          type: s.type || 'Waypoint',
          rating: s.rating ?? null,
          cuisineType: s.cuisineType || '',
          priceLevel: s.priceLevel ?? null,
          checkInDate: toDateInput(s.checkInDate),
          checkOutDate: toDateInput(s.checkOutDate),
          pricePerNight: s.pricePerNight ?? null,
          duration: s.duration || '',
          cost: s.cost ?? null,
          placeId: s.placeId || null,
          dayNumber: s.dayNumber ?? null,
          startTime: s.startTime ? String(s.startTime).slice(0, 5) : '',
          arrivalMode: s.arrivalMode || 'Car',
          flightNumber: s.flightNumber || '',
          flightDate: toDateInput(s.flightDate),
        })),
    })
  } catch (e) {
    loadError.value = errorMessage(e, t('editor.tryLater'))
  } finally {
    loadingTrip.value = false
  }
}

function validate() {
  if (!form.title) return { message: t('editor.validation.title'), focus: () => titleRef.value?.focus() }
  if (datesInvalid.value) return { message: t('editor.validation.dates') }
  const unnamed = form.stops.findIndex((s) => !s.name)
  if (unnamed >= 0) return { message: t('editor.validation.stopNameN', { n: unnamed + 1 }), focus: () => selectStop(form.stops[unnamed], true) }
  const badHotel = form.stops.findIndex(checkoutInvalid)
  if (badHotel >= 0) return { message: t('editor.validation.checkoutN', { n: badHotel + 1 }), focus: () => selectStop(form.stops[badHotel], true) }
  const badFlight = form.stops.findIndex(flightInvalid)
  if (badFlight >= 0) return { message: t('editor.validation.flightN', { n: badFlight + 1 }), focus: () => selectStop(form.stops[badFlight], true) }
  return null
}

const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))

async function onSubmit() {
  showErrors.value = true
  error.value = ''
  const problem = validate()
  if (problem) {
    error.value = problem.message
    problem.focus?.()
    return
  }

  saving.value = true
  const payload = {
    title: form.title,
    description: form.description?.trim() || null,
    coverImageUrl: form.coverImageUrl || null,
    country: form.country || null,
    startDate: dateInputToIso(form.startDate),
    endDate: dateInputToIso(form.endDate),
    isPublic: form.isPublic,
    travellersInCar: form.travellersInCar,
    stops: form.stops.map((s, i) => ({
      name: s.name,
      description: s.description?.trim() || null,
      address: s.address || null,
      imageUrl: s.imageUrl || null,
      latitude: s.latitude,
      longitude: s.longitude,
      orderIndex: i,
      type: s.type,
      rating: s.rating || null,
      cuisineType: s.cuisineType || null,
      priceLevel: num(s.priceLevel),
      checkInDate: dateInputToIso(s.checkInDate),
      checkOutDate: dateInputToIso(s.checkOutDate),
      pricePerNight: num(s.pricePerNight),
      duration: s.duration || null,
      cost: num(s.cost),
      placeId: s.placeId || null,
      dayNumber: s.dayNumber && s.dayNumber <= dayCount.value ? s.dayNumber : null,
      startTime: s.startTime || null,
      arrivalMode: s.arrivalMode || 'Car',
      // Alleen bij een vlucht; de backend normaliseert ("kl 0123" → "KL123") en valideert.
      ...(s.arrivalMode === 'Plane' && s.flightNumber
        ? { flightNumber: s.flightNumber, flightDate: dateInputToIso(s.flightDate) }
        : { flightNumber: null, flightDate: null }),
    })),
  }

  try {
    const saved = isEdit.value
      ? await tripsApi.updateTrip(tripId.value, payload)
      : await tripsApi.createTrip(payload)
    toast.success(isEdit.value ? t('editor.saved') : t('editor.created'))
    router.push(`/trips/${saved.id}`)
  } catch (e) {
    error.value = errorMessage(e, t('editor.saveFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) await loadTrip()
  if (loadError.value) return
  await nextTick()
  initMap()
})

onBeforeUnmount(() => {
  stopObserving()
  map?.remove()
  map = null
})
</script>
