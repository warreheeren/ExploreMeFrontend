<template>
  <section v-if="loading || suggestions.length" class="border-b border-line px-4 py-4 sm:px-5" aria-labelledby="packing-suggestions-title">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <h4 id="packing-suggestions-title" class="inline-flex items-center gap-1.5 text-sm font-extrabold text-ink"><Icon name="sparkle" :size="16" class="text-accent-700" /> {{ $t('tripExtras.packing.title') }}</h4>
        <p class="text-xs text-muted">{{ $t('tripExtras.packing.subtitle') }}</p>
      </div>
      <button v-if="suggestions.length > 1" type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="addAll">
        <Icon name="plus" :size="14" /> {{ $t('tripExtras.packing.addAll') }}
      </button>
    </div>

    <div v-if="loading" class="mt-3 flex flex-wrap gap-2"><div v-for="i in 4" :key="i" class="skeleton h-8 w-28 rounded-full" /></div>
    <ul v-else class="mt-3 space-y-2.5">
      <li v-for="g in groups" :key="g.signature">
        <p class="mb-1.5 text-xs font-semibold text-muted">{{ packingReason(g) }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in g.items"
            :key="s.key"
            type="button"
            class="chip-toggle"
            :disabled="busy"
            :aria-label="$t('tripExtras.packing.addAria', { item: packingLabel(s.key) })"
            @click="add(s)"
          >
            <Icon name="plus" :size="12" /> {{ packingLabel(s.key) }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import * as tripsApi from '@/api/tripsApi'
import * as tripExtrasApi from '@/api/tripExtrasApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { groupByReason, packingLabel, packingReason } from '@/utils/packing'

const props = defineProps({
  tripId: { type: String, required: true },
  /** Huidige items; verandert de lijst (bv. realtime), dan halen we de suggesties opnieuw op. */
  itemCount: { type: Number, default: 0 },
})
const emit = defineEmits(['added'])

const { t } = useI18n()
const toast = useToastStore()
const suggestions = ref([])
const loading = ref(true)
const busy = ref(false)

const groups = computed(() => groupByReason(suggestions.value))

async function load() {
  try {
    suggestions.value = await tripExtrasApi.getChecklistSuggestions(props.tripId)
  } catch {
    // Suggesties zijn een extraatje: bij een fout tonen we gewoon niets.
    suggestions.value = []
  } finally {
    loading.value = false
  }
}

/** Maakt het item aan in de huidige taal van de app. */
async function create(s) {
  const item = await tripsApi.addChecklistItem(props.tripId, { text: packingLabel(s.key) })
  suggestions.value = suggestions.value.filter((x) => x.key !== s.key)
  emit('added', item)
}

async function add(s) {
  if (busy.value) return
  busy.value = true
  try {
    await create(s)
  } catch (e) {
    toast.error(errorMessage(e, t('checklist.addFailed')))
  } finally {
    busy.value = false
  }
}

async function addAll() {
  if (busy.value) return
  busy.value = true
  const count = suggestions.value.length
  try {
    // Na elkaar, zodat de volgorde op de lijst gelijk blijft aan de suggesties.
    for (const s of [...suggestions.value]) await create(s)
    toast.success(t('tripExtras.packing.addedAll', { n: count }))
  } catch (e) {
    toast.error(errorMessage(e, t('checklist.addFailed')))
  } finally {
    busy.value = false
  }
}

let lastCount = props.itemCount
watch(() => props.itemCount, (n) => {
  // Alleen herladen als iemand anders iets wijzigde (eigen toevoegingen halen we al lokaal weg).
  if (!busy.value && n !== lastCount) load()
  lastCount = n
})

onMounted(load)
</script>
