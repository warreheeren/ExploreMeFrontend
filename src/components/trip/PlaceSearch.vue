<template>
  <div v-click-outside="close" class="relative">
    <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
    <input
      ref="inputRef"
      v-model="query"
      type="search"
      class="search-pill"
      role="combobox"
      :aria-expanded="open"
      aria-autocomplete="list"
      :aria-controls="listId"
      :aria-activedescendant="active >= 0 ? `${listId}-${active}` : undefined"
      :placeholder="$t('editor.search.placeholder')"
      :aria-label="$t('editor.search.placeholder')"
      @focus="open = results.length > 0"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="pick(results[active] || results[0])"
      @keydown.esc="close"
    />
    <span v-if="loading" class="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-transparent" aria-hidden="true" />

    <ul v-if="open" :id="listId" class="menu left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto" role="listbox">
      <li v-if="!results.length" class="px-4 py-3 text-sm text-muted">{{ searched ? $t('editor.search.none') : $t('editor.search.hint') }}</li>
      <li v-for="(r, i) in results" :id="`${listId}-${i}`" :key="r.placeId" role="option" :aria-selected="i === active">
        <button type="button" class="menu-item items-start" :class="i === active ? 'bg-gray-50' : ''" @mouseenter="active = i" @click="pick(r)">
          <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" :class="stopTypeMeta(r.suggestedType).soft"><Icon :name="stopTypeMeta(r.suggestedType).icon" :size="14" /></span>
          <span class="min-w-0">
            <span class="block truncate font-bold text-ink">{{ r.name }}</span>
            <span class="block truncate text-xs font-medium text-muted">{{ r.address || r.displayName }}</span>
          </span>
        </button>
      </li>
      <li class="border-t border-line px-4 py-1.5 text-[10px] text-muted">{{ $t('editor.search.attribution') }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import * as geoApi from '@/api/geoApi'
import { stopTypeMeta } from '@/utils/stopTypes'

const props = defineProps({
  /** Middelpunt van de kaart: geeft voorkeur aan resultaten in de buurt. */
  near: { type: Object, default: null },
})
const emit = defineEmits(['select'])

const listId = `place-results-${Math.random().toString(36).slice(2, 8)}`
const inputRef = ref(null)
const query = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)
const open = ref(false)
const active = ref(-1)
let timer = null
let controller = null

function close() {
  open.value = false
  active.value = -1
}

function move(delta) {
  if (!results.value.length) return
  open.value = true
  active.value = (active.value + delta + results.value.length) % results.value.length
}

function pick(result) {
  if (!result) return
  emit('select', result)
  query.value = ''
  results.value = []
  searched.value = false
  close()
}

async function search(q) {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  try {
    results.value = await geoApi.searchPlaces(q, props.near, { signal: controller.signal })
    searched.value = true
    active.value = results.value.length ? 0 : -1
    open.value = true
  } catch (e) {
    if (e?.code !== 'ERR_CANCELED') {
      results.value = []
      searched.value = true
      open.value = true
    }
  } finally {
    loading.value = false
  }
}

// Nominatim staat één verzoek per seconde toe; 500 ms debounce + server-side cache houdt dat ruim binnen de perken.
watch(query, (q) => {
  clearTimeout(timer)
  const trimmed = q.trim()
  if (trimmed.length < 3) {
    results.value = []
    searched.value = false
    open.value = trimmed.length > 0
    return
  }
  timer = setTimeout(() => search(trimmed), 500)
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>
