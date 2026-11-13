<template>
  <Modal :model-value="modelValue" :title="$t('postcards.composer.title')" :subtitle="$t('postcards.composer.subtitle')" size="xl" @update:model-value="close">
    <form :id="formId" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" @submit.prevent="send">
      <!-- Live preview -->
      <div class="order-first space-y-2 lg:order-last">
        <PostcardCard :card="previewCard" :start-flipped="showBack" :thumb="false" :lazy="false" />
        <p class="text-center text-xs font-semibold text-muted">{{ $t('postcards.composer.previewHint') }}</p>
      </div>

      <div class="space-y-5">
        <!-- Ontvanger -->
        <fieldset>
          <legend class="label">{{ $t('postcards.composer.to') }}</legend>
          <div class="mb-2 flex flex-wrap gap-1.5">
            <button type="button" class="chip-toggle" :class="mode === 'user' ? 'chip-toggle-active' : ''" :aria-pressed="mode === 'user'" @click="mode = 'user'">
              <Icon name="user" :size="13" /> {{ $t('postcards.composer.toUser') }}
            </button>
            <button type="button" class="chip-toggle" :class="mode === 'email' ? 'chip-toggle-active' : ''" :aria-pressed="mode === 'email'" @click="mode = 'email'">
              <Icon name="mail" :size="13" /> {{ $t('postcards.composer.toEmail') }}
            </button>
          </div>

          <template v-if="mode === 'user'">
            <div v-if="recipient" class="flex items-center gap-3 rounded-2xl border border-line px-3 py-2">
              <Avatar :src="recipient.profilePhotoUrl" :name="recipient.displayName" size="sm" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-bold text-ink">{{ recipient.displayName }}</span>
                <span class="block truncate text-xs text-muted">@{{ recipient.userName }}</span>
              </span>
              <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('postcards.composer.changeRecipient')" @click="recipient = null"><Icon name="x" :size="16" /></button>
            </div>
            <div v-else>
              <label :for="`${formId}-search`" class="sr-only">{{ $t('postcards.composer.searchLabel') }}</label>
              <div class="relative">
                <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input :id="`${formId}-search`" v-model="query" type="search" class="input pl-10" autocomplete="off" :placeholder="$t('postcards.composer.searchPlaceholder')" @input="searchSoon" />
              </div>
              <ul v-if="recipients.length" class="mt-2 max-h-48 space-y-0.5 overflow-y-auto rounded-2xl border border-line p-1">
                <li v-for="r in recipients" :key="r.id">
                  <button type="button" class="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-gray-50" @click="recipient = r">
                    <Avatar :src="r.profilePhotoUrl" :name="r.displayName" size="xs" />
                    <span class="min-w-0 flex-1 truncate text-sm font-bold text-ink">{{ r.displayName }}</span>
                    <span class="truncate text-xs text-muted">@{{ r.userName }}</span>
                  </button>
                </li>
              </ul>
              <p v-else-if="!searching" class="hint">{{ query ? $t('postcards.composer.noRecipients') : $t('postcards.composer.recipientsHint') }}</p>
            </div>
          </template>

          <template v-else>
            <label :for="`${formId}-email`" class="sr-only">{{ $t('postcards.composer.emailLabel') }}</label>
            <input :id="`${formId}-email`" v-model="email" type="email" class="input" maxlength="254" autocomplete="email" :placeholder="$t('postcards.composer.emailPlaceholder')" />
            <p class="hint">{{ $t('postcards.composer.emailHint') }}</p>
          </template>
        </fieldset>

        <!-- Foto -->
        <fieldset>
          <legend class="label">{{ $t('postcards.composer.photo') }}</legend>
          <div class="mb-2">
            <label :for="`${formId}-trip`" class="sr-only">{{ $t('postcards.composer.trip') }}</label>
            <select :id="`${formId}-trip`" v-model="tripId" class="select">
              <option :value="null">{{ $t('postcards.composer.noTrip') }}</option>
              <option v-for="tr in trips" :key="tr.id" :value="tr.id">{{ tr.title }}</option>
            </select>
          </div>
          <div class="flex gap-2 overflow-x-auto pb-1">
            <label class="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line-strong text-muted hover:border-ink hover:text-ink">
              <Icon v-if="!uploading" name="camera" :size="20" />
              <Spinner v-else />
              <input type="file" :accept="accept" class="sr-only" :aria-label="$t('postcards.composer.upload')" @change="onFile" />
            </label>
            <div v-if="loadingPhotos" class="skeleton h-16 w-16 shrink-0 rounded-xl" />
            <button
              v-for="p in photoChoices"
              :key="p.url"
              type="button"
              class="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-offset-2 ring-offset-surface"
              :class="imageUrl === p.url ? 'ring-2 ring-accent-700' : ''"
              :aria-pressed="imageUrl === p.url"
              :aria-label="p.label"
              @click="pickPhoto(p)"
            >
              <img :src="thumbUrl(p.url)" alt="" class="h-full w-full object-cover" loading="lazy" />
            </button>
          </div>
          <p v-if="uploadError" class="hint text-red-600">{{ uploadError }}</p>
        </fieldset>

        <!-- Plaats -->
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-if="trip?.stops?.length">
            <label :for="`${formId}-stop`" class="label">{{ $t('postcards.composer.stop') }}</label>
            <select :id="`${formId}-stop`" v-model="stopId" class="select" @change="onStopChange">
              <option :value="null">{{ $t('postcards.composer.noStop') }}</option>
              <option v-for="s in sortedStops" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div :class="trip?.stops?.length ? '' : 'sm:col-span-2'">
            <label :for="`${formId}-place`" class="label">{{ $t('postcards.composer.place') }}</label>
            <input :id="`${formId}-place`" v-model="placeName" type="text" class="input" maxlength="120" required :placeholder="$t('postcards.composer.placePlaceholder')" />
          </div>
        </div>

        <!-- Bericht -->
        <div>
          <div class="flex items-baseline justify-between">
            <label :for="`${formId}-message`" class="label">{{ $t('postcards.composer.message') }}</label>
            <span class="text-xs font-semibold tabular-nums" :class="message.length > MAX_MESSAGE - 30 ? 'text-ink' : 'text-muted'">{{ message.length }}/{{ MAX_MESSAGE }}</span>
          </div>
          <textarea
            :id="`${formId}-message`"
            v-model="message"
            rows="4"
            :maxlength="MAX_MESSAGE"
            class="textarea"
            required
            :placeholder="$t('postcards.composer.messagePlaceholder')"
            @focus="showBack = true"
          />
        </div>

        <!-- Postzegel -->
        <fieldset>
          <legend class="label">{{ $t('postcards.composer.stamp') }}</legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in STAMP_STYLES"
              :key="s"
              type="button"
              class="rounded-xl p-1.5 ring-offset-2 ring-offset-surface hover:bg-gray-50"
              :class="stampStyle === s ? 'ring-2 ring-accent-700' : ''"
              :aria-pressed="stampStyle === s"
              @click="pickStamp(s)"
            >
              <PostcardStamp :variant="s" :width="40" />
            </button>
          </div>
        </fieldset>

        <p v-if="error" class="text-sm font-semibold text-red-600" role="alert">{{ error }}</p>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="close(false)">{{ $t('common.cancel') }}</button>
      <button type="submit" :form="formId" class="btn btn-primary" :disabled="!canSend">
        <Spinner v-if="sending" /><Icon v-else name="send" :size="15" /> {{ $t('postcards.composer.send') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Spinner from '@/components/ui/Spinner.vue'
import PostcardCard from './PostcardCard.vue'
import PostcardStamp from './PostcardStamp.vue'
import * as postcardsApi from '@/api/postcardsApi'
import * as tripsApi from '@/api/tripsApi'
import * as albumApi from '@/api/albumApi'
import { getCollaboratingTrips } from '@/api/tripCollaboratorsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useImageUpload } from '@/composables/useImageUpload'
import { useDebounceFn } from '@/composables/useDebounce'
import { errorMessage } from '@/utils/errors'
import { thumbUrl } from '@/utils/media'
import { MAX_MESSAGE, STAMP_STYLES, isValidEmail, photoChoicesFor } from '@/utils/postcards'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Optioneel vooraf ingevuld, bv. vanuit het album: { tripId, stopId, imageUrl } */
  initial: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'sent'])

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()
const { upload, uploading, error: uploadError, accept } = useImageUpload()
const formId = `postcard-${useId()}`

const mode = ref('user')
const query = ref('')
const recipients = ref([])
const searching = ref(false)
const recipient = ref(null)
const email = ref('')

const trips = ref([])
const tripId = ref(null)
const trip = ref(null)
const album = ref([])
const loadingPhotos = ref(false)
const uploads = ref([])

const imageUrl = ref(null)
const stopId = ref(null)
const placeName = ref('')
const message = ref('')
const stampStyle = ref('classic')
const showBack = ref(false)
const sending = ref(false)
const error = ref('')

const sortedStops = computed(() => [...(trip.value?.stops || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)))
const photoChoices = computed(() => photoChoicesFor(trip.value, album.value, uploads.value))

const previewCard = computed(() => ({
  imageUrl: imageUrl.value,
  placeName: placeName.value.trim(),
  message: message.value.trim(),
  stampStyle: stampStyle.value,
  senderDisplayName: auth.displayName || auth.userName,
  recipientName: mode.value === 'user' ? recipient.value?.displayName : email.value.trim(),
  createdAtUtc: new Date(),
}))

const canSend = computed(() => {
  if (sending.value || uploading.value || !imageUrl.value || !placeName.value.trim() || !message.value.trim()) return false
  return mode.value === 'user' ? !!recipient.value : isValidEmail(email.value)
})

watch(() => props.modelValue, (open) => {
  if (open) reset()
})

watch(tripId, async (id) => {
  trip.value = null
  album.value = []
  stopId.value = null
  if (!id) return
  loadingPhotos.value = true
  try {
    const [detail, photos] = await Promise.all([tripsApi.getTripById(id), albumApi.getPhotos(id).catch(() => [])])
    if (tripId.value !== id) return
    trip.value = detail
    album.value = photos
    if (props.initial?.tripId === id && props.initial.stopId) selectStop(props.initial.stopId)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loadingPhotos.value = false
  }
})

async function reset() {
  error.value = ''
  mode.value = 'user'
  query.value = ''
  recipient.value = null
  email.value = ''
  uploads.value = []
  imageUrl.value = props.initial?.imageUrl || null
  placeName.value = ''
  message.value = ''
  stampStyle.value = 'classic'
  showBack.value = false
  tripId.value = props.initial?.tripId || null
  // Zelfde reis als de vorige keer: de watcher vuurt niet, dus de stop hier zetten.
  if (trip.value && trip.value.id === tripId.value) {
    stopId.value = null
    if (props.initial?.stopId) selectStop(props.initial.stopId)
  }
  searchRecipients()
  loadTrips()
}

async function loadTrips() {
  try {
    const [own, shared] = await Promise.all([
      auth.userName ? tripsApi.getUserTrips(auth.userName, 50) : [],
      getCollaboratingTrips(50).catch(() => []),
    ])
    const seen = new Set()
    trips.value = [...own, ...shared].filter((tr) => !seen.has(tr.id) && seen.add(tr.id))
  } catch {
    trips.value = []
  }
}

async function searchRecipients() {
  searching.value = true
  try {
    recipients.value = await postcardsApi.searchRecipients(query.value.trim())
  } catch {
    recipients.value = []
  } finally {
    searching.value = false
  }
}
const searchSoon = useDebounceFn(searchRecipients, 250)

function selectStop(id) {
  stopId.value = id
  onStopChange()
}

function onStopChange() {
  const stop = sortedStops.value.find((s) => s.id === stopId.value)
  if (stop) placeName.value = stop.name
}

function pickPhoto(p) {
  imageUrl.value = p.url
  showBack.value = false
  // Een albumfoto of stopfoto weet waar ze genomen is.
  if (p.stopId) selectStop(p.stopId)
}

function pickStamp(s) {
  stampStyle.value = s
  showBack.value = true
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  const url = await upload(file)
  if (url) {
    uploads.value = [url, ...uploads.value]
    imageUrl.value = url
    showBack.value = false
  }
}

async function send() {
  if (!canSend.value) return
  sending.value = true
  error.value = ''
  try {
    const card = await postcardsApi.sendPostcard({
      recipientUserId: mode.value === 'user' ? recipient.value.id : null,
      recipientEmail: mode.value === 'email' ? email.value.trim() : null,
      tripId: tripId.value,
      stopId: stopId.value,
      imageUrl: imageUrl.value,
      message: message.value.trim(),
      placeName: placeName.value.trim(),
      stampStyle: stampStyle.value,
    })
    toast.success(t('postcards.composer.sent'))
    emit('sent', card)
    emit('update:modelValue', false)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    sending.value = false
  }
}

function close(value) {
  if (!value) emit('update:modelValue', false)
}
</script>
