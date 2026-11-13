<template>
  <div>
    <PageHeader :title="$t('search.title')" :subtitle="$t('search.subtitle')" />

    <form class="card card-pad mb-4 flex gap-2" role="search" @submit.prevent="submit">
      <div class="relative min-w-0 flex-1">
        <label for="search-q" class="sr-only">{{ $t('search.label') }}</label>
        <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="search-q"
          ref="inputRef"
          v-model="draft"
          type="search"
          class="input pl-10"
          :placeholder="$t('search.placeholder')"
          autocomplete="off"
          enterkeyhint="search"
        />
      </div>
      <button type="submit" class="btn btn-primary">{{ $t('search.submit') }}</button>
    </form>

    <nav class="tabs mb-4" role="tablist" :aria-label="$t('search.tabsLabel')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="tab"
        :class="type === tab.id ? 'tab-active' : ''"
        :aria-selected="type === tab.id"
        @click="setType(tab.id)"
      >
        <Icon :name="tab.icon" :size="16" /> {{ tab.label }}
      </button>
    </nav>

    <EmptyState v-if="!query" icon="search" :title="$t('search.startTitle')" :text="$t('search.startText')" />
    <EmptyState v-else-if="query.length < MIN_QUERY_LENGTH" icon="info" :title="$t('search.minChars')" />

    <template v-else>
      <p v-if="didYouMean && items.length" class="mb-3 text-sm text-muted">
        {{ $t('search.didYouMean') }}
        <button type="button" class="font-bold text-ink underline underline-offset-2" @click="search(didYouMean)">{{ didYouMean }}</button>?
      </p>

      <div v-if="loading" class="flex justify-center py-10"><Spinner /></div>

      <div v-else-if="error && !items.length" class="card card-pad text-center">
        <p class="text-sm text-muted">{{ $t('search.error') }}</p>
        <button type="button" class="btn btn-secondary btn-sm mt-3" @click="retry">{{ $t('search.retry') }}</button>
      </div>

      <EmptyState v-else-if="!items.length" icon="search" :title="$t('search.emptyTitle')" :text="$t('search.emptyText', { query })" />

      <ul v-else class="space-y-2" aria-live="polite">
        <li v-for="item in items" :key="`${item.kind}:${item.id}`">
          <RouterLink :to="item.link" class="card flex items-start gap-3 p-3 transition hover:border-line-strong">
            <Avatar v-if="item.kind === 'user'" :src="item.imageUrl || ''" :name="item.title" size="md" />
            <span v-else class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-muted">
              <img v-if="item.imageUrl" :src="thumbUrl(item.imageUrl)" alt="" class="h-full w-full object-cover" loading="lazy" />
              <Icon v-else :name="KIND_ICONS[item.kind] || 'search'" :size="18" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-extrabold text-ink">{{ item.title }}</span>
                <span class="chip chip-muted shrink-0">{{ $t(`search.kind.${item.kind}`) }}</span>
              </span>
              <span v-if="item.subtitle" class="block truncate text-xs font-medium text-muted">
                <template v-if="item.kind === 'user' || item.kind === 'post'">@</template>{{ item.subtitle }}
              </span>
              <!-- Veilig: highlightSnippet escapet de gebruikerstekst vóór het toevoegen van <mark>. -->
              <span
                v-if="item.snippet"
                class="mt-1 line-clamp-2 block text-sm text-body [&_mark]:rounded [&_mark]:bg-accent-50 [&_mark]:px-0.5 [&_mark]:font-bold [&_mark]:text-ink"
                v-html="highlightSnippet(item.snippet)"
              />
            </span>
          </RouterLink>
        </li>
      </ul>

      <div v-if="items.length" ref="sentinel" class="py-4 text-center text-sm font-semibold text-muted">
        <span v-if="loadingMore" class="inline-flex items-center gap-2"><Spinner /> {{ $t('common.loading') }}</span>
        <button v-else-if="error" type="button" class="btn btn-secondary btn-sm" @click="retry">{{ $t('search.retry') }}</button>
        <span v-else-if="done && items.length > 6">{{ $t('common.endOfList') }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { SEARCH_TYPES, searchFull } from '@/api/searchApi'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { highlightSnippet } from '@/utils/searchHighlight'
import { thumbUrl } from '@/utils/media'

const MIN_QUERY_LENGTH = 2
const PAGE_SIZE = 20
// useInfiniteList verwacht een cursor per item; de API geeft één nextCursor per pagina.
// END betekent "geen volgende pagina" (null zou de eerste pagina opnieuw laden).
const END = '__end__'
const TAB_ICONS = { all: 'search', posts: 'image', trips: 'map', places: 'pin', users: 'users', journal: 'book' }
const KIND_ICONS = { post: 'image', trip: 'map', place: 'pin', user: 'user', journal: 'book' }

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const query = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const type = computed(() => (SEARCH_TYPES.includes(route.query.type) ? route.query.type : 'all'))
const draft = ref(query.value)
const inputRef = ref(null)
const didYouMean = ref(null)

const tabs = computed(() => SEARCH_TYPES.map((id) => ({ id, label: t(`search.tabs.${id}`), icon: TAB_ICONS[id] })))

let nextCursor = null
const requestKey = () => `${type.value}|${query.value}`

const list = useInfiniteList(async (take, before) => {
  if (before === END) return []
  const key = requestKey()
  const data = await searchFull(query.value, type.value, before, take)
  // Een trager antwoord van een vorige zoekopdracht mag de cursor niet overschrijven.
  if (key === requestKey()) {
    nextCursor = data.nextCursor
    if (!before) didYouMean.value = data.didYouMean
  }
  return data.items
}, { pageSize: PAGE_SIZE, cursor: () => nextCursor ?? END })
const { items, loading, loadingMore, done, error, sentinel, reload, retry } = list

watch([query, type], () => {
  draft.value = query.value
  nextCursor = null
  didYouMean.value = null
  if (query.value.length >= MIN_QUERY_LENGTH) reload()
  else items.value = []
}, { immediate: true })

function search(q) {
  const value = (q ?? '').trim()
  router.push({ query: { ...route.query, q: value || undefined, type: type.value === 'all' ? undefined : type.value } })
}

function submit() {
  search(draft.value)
  inputRef.value?.blur()
}

function setType(id) {
  router.replace({ query: { ...route.query, type: id === 'all' ? undefined : id } })
}
</script>
