<template>
  <div v-click-outside="close" class="relative" :class="panel ? 'flex h-full flex-col' : ''">
    <div class="relative" :class="panel ? 'shrink-0' : ''">
      <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        class="search-pill"
        :placeholder="$t('shell.search.placeholder')"
        :aria-label="$t('shell.search.label')"
        role="combobox"
        :aria-expanded="showResults"
        aria-controls="global-search-results"
        autocomplete="off"
        @focus="open = true"
        @input="onInput"
        @keydown="onKeydown"
      />
    </div>

    <div
      v-if="showResults"
      id="global-search-results"
      :class="panel ? 'mt-3 min-h-0 flex-1 overflow-y-auto' : 'menu left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto'"
      role="listbox"
    >
      <!-- Recent -->
      <template v-if="!query.trim()">
        <div class="flex items-center justify-between px-4 pb-1 pt-2">
          <p class="eyebrow">{{ $t('shell.search.recent') }}</p>
          <button type="button" class="text-xs font-bold text-muted hover:text-ink" @mousedown.prevent="clearRecent">{{ $t('shell.search.clear') }}</button>
        </div>
        <button
          v-for="(item, i) in recent"
          :key="item.key"
          type="button"
          class="menu-item"
          :class="i === active ? 'bg-gray-50' : ''"
          role="option"
          @mousedown.prevent="go(item)"
        >
          <Avatar v-if="item.kind === 'user'" :src="item.image" :name="item.label" size="sm" />
          <span v-else class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-muted"><Icon :name="item.kind === 'trip' ? 'map' : 'globe'" :size="16" /></span>
          <span class="min-w-0 flex-1 truncate font-bold text-ink">{{ item.label }}</span>
          <span class="text-xs font-semibold text-muted">{{ kindLabel(item.kind) }}</span>
        </button>
      </template>

      <template v-else>
        <div v-if="loading && !resultItems.length" class="flex justify-center py-6"><Spinner /></div>
        <p v-else-if="!resultItems.length && query.trim().length >= 2" class="px-4 py-5 text-sm text-muted">{{ $t('shell.search.noResults', { query }) }}</p>
        <p v-else-if="query.trim().length < 2" class="px-4 py-5 text-sm text-muted">{{ $t('shell.search.minChars') }}</p>

        <template v-for="section in sections" :key="section.kind">
          <p v-if="section.items.length" class="eyebrow px-4 pb-1 pt-3">{{ section.title }}</p>
          <button
            v-for="item in section.items"
            :key="item.key"
            type="button"
            class="menu-item"
            :class="flat.indexOf(item) === active ? 'bg-gray-50' : ''"
            role="option"
            :aria-selected="flat.indexOf(item) === active"
            @mousedown.prevent="go(item)"
          >
            <Avatar v-if="item.kind === 'user'" :src="item.image" :name="item.label" size="sm" />
            <span v-else-if="item.kind === 'trip'" class="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <img v-if="item.image" :src="thumbUrl(item.image)" alt="" class="h-full w-full object-cover" />
            </span>
            <span v-else class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-base text-muted">
              <template v-if="item.flag">{{ item.flag }}</template>
              <Icon v-else name="globe" :size="16" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-bold text-ink">{{ item.label }}</span>
              <span class="block truncate text-xs font-medium text-muted">{{ item.sub }}</span>
            </span>
          </button>
        </template>

        <!-- Naar de volledige zoekpagina (posts, plekken, dagboek …); ook met Enter zonder selectie. -->
        <button
          v-if="allResultsItem"
          type="button"
          class="menu-item border-t border-line"
          :class="flat.indexOf(allResultsItem) === active ? 'bg-gray-50' : ''"
          role="option"
          :aria-selected="flat.indexOf(allResultsItem) === active"
          @mousedown.prevent="go(allResultsItem)"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-muted"><Icon name="search" :size="16" /></span>
          <span class="min-w-0 flex-1 truncate font-bold text-ink">{{ $t('search.allResults', { query: query.trim() }) }}</span>
          <Icon name="chevron-right" :size="16" class="text-muted" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Avatar from '../ui/Avatar.vue'
import Icon from '../ui/Icon.vue'
import Spinner from '../ui/Spinner.vue'
import * as searchApi from '@/api/searchApi'
import { useDebounceFn } from '@/composables/useDebounce'
import { flagFor } from '@/utils/countries'
import { formatDateRange } from '@/utils/date'
import { thumbUrl } from '@/utils/media'

const props = defineProps({
  panel: { type: Boolean, default: false }, // volledige-scherm variant (mobiel)
  autofocus: { type: Boolean, default: false },
})
const emit = defineEmits(['navigate'])

const RECENT_KEY = 'exploreme:recentSearch'
const router = useRouter()
const { t } = useI18n()

const inputRef = ref(null)
const query = ref('')
const open = ref(props.panel)
const loading = ref(false)
const results = ref({ users: [], trips: [], countries: [] })
const active = ref(-1)
const recent = ref(loadRecent())

function loadRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(0, 6) : []
  } catch {
    return []
  }
}

function remember(item) {
  const { key, kind, label, image, to } = item
  recent.value = [{ key, kind, label, image, to }, ...recent.value.filter((r) => r.key !== key)].slice(0, 6)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value)) } catch { /* vol */ }
}

function clearRecent() {
  recent.value = []
  try { localStorage.removeItem(RECENT_KEY) } catch { /* ok */ }
}

const sections = computed(() => [
  {
    kind: 'user',
    title: t('shell.search.users'),
    items: results.value.users.map((u) => ({ key: `u:${u.userName}`, kind: 'user', label: u.displayName, sub: `@${u.userName}`, image: u.profilePhotoUrl, to: `/u/${u.userName}` })),
  },
  {
    kind: 'trip',
    title: t('shell.search.trips'),
    items: results.value.trips.map((trip) => ({ key: `t:${trip.id}`, kind: 'trip', label: trip.title, sub: `${trip.country} · ${formatDateRange(trip.startDate, trip.endDate)}`, image: trip.coverImageUrl, to: `/trips/${trip.id}` })),
  },
  {
    kind: 'country',
    title: t('shell.search.countries'),
    items: results.value.countries.map((c) => ({ key: `c:${c.country}`, kind: 'country', label: c.country, flag: flagFor(c.country), sub: t('shell.search.tripCount', { n: c.tripCount }, c.tripCount), to: { path: '/trips', query: { country: c.country } } })),
  },
])

const resultItems = computed(() => sections.value.flatMap((s) => s.items))
const allResultsItem = computed(() => {
  const q = query.value.trim()
  return q.length >= 2 ? { key: 'all', kind: 'all', to: { path: '/search', query: { q } } } : null
})
const flat = computed(() => (query.value.trim() ? [...resultItems.value, ...(allResultsItem.value ? [allResultsItem.value] : [])] : recent.value))
const showResults = computed(() => open.value && (query.value.trim() || recent.value.length))

const KINDS = ['user', 'trip', 'country']
const kindLabel = (k) => (KINDS.includes(k) ? t(`shell.search.kind.${k}`) : '')

const runSearch = useDebounceFn(async (q) => {
  try {
    const data = await searchApi.search(q, 5)
    if (q === query.value.trim()) results.value = data
  } catch {
    results.value = { users: [], trips: [], countries: [] }
  } finally {
    loading.value = false
  }
}, 250)

function onInput() {
  open.value = true
  active.value = -1
  const q = query.value.trim()
  if (q.length < 2) {
    results.value = { users: [], trips: [], countries: [] }
    loading.value = false
    return
  }
  loading.value = true
  runSearch(q)
}

function go(item) {
  if (item.kind !== 'all') remember(item)
  router.push(item.to)
  query.value = ''
  results.value = { users: [], trips: [], countries: [] }
  open.value = props.panel
  inputRef.value?.blur()
  emit('navigate')
}

function onKeydown(e) {
  const items = flat.value
  if (e.key === 'ArrowDown' && items.length) {
    e.preventDefault()
    active.value = (active.value + 1) % items.length
  } else if (e.key === 'ArrowUp' && items.length) {
    e.preventDefault()
    active.value = (active.value - 1 + items.length) % items.length
  } else if (e.key === 'Enter') {
    // Zonder selectie gaat Enter naar de volledige zoekpagina; bij lege invoer naar het eerste recente item.
    const item = items[active.value] || (query.value.trim() ? allResultsItem.value : items[0])
    if (item) {
      e.preventDefault()
      go(item)
    }
  } else if (e.key === 'Escape') {
    close()
    inputRef.value?.blur()
  }
}

function close() {
  if (!props.panel) open.value = false
  active.value = -1
}

onMounted(() => {
  if (props.autofocus) inputRef.value?.focus()
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>
