<template>
  <div>
    <PageHeader :eyebrow="$t('buddies.eyebrow')" :title="$t('buddies.title')" :subtitle="$t('buddies.subtitle')">
      <template #actions>
        <button type="button" class="btn btn-primary btn-sm" @click="openCreate"><Icon name="plus" :size="14" /> {{ $t('buddies.newPost') }}</button>
      </template>
    </PageHeader>

    <nav class="tabs mb-4" role="tablist" :aria-label="$t('buddies.title')">
      <button v-for="tb in tabs" :key="tb.id" type="button" role="tab" class="tab" :class="tab === tb.id ? 'tab-active' : ''" :aria-selected="tab === tb.id" @click="setTab(tb.id)">
        <Icon :name="tb.icon" :size="16" /> {{ tb.label }}
      </button>
    </nav>

    <!-- Filters -->
    <section v-if="tab === 'all'" class="card card-pad mb-4 space-y-3" :aria-label="$t('buddies.filters.label')">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
        <div class="relative">
          <label for="buddy-filter-country" class="sr-only">{{ $t('buddies.filters.country') }}</label>
          <Icon name="globe" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input id="buddy-filter-country" v-model="filters.country" type="search" class="input pl-10" list="buddy-filter-countries" :placeholder="$t('buddies.filters.countryPlaceholder')" @input="onCountryInput" />
          <datalist id="buddy-filter-countries">
            <option v-for="c in countries" :key="c" :value="c" />
          </datalist>
        </div>
        <div>
          <label for="buddy-filter-month" class="sr-only">{{ $t('buddies.filters.month') }}</label>
          <select id="buddy-filter-month" v-model="filters.month" class="select" @change="reload">
            <option value="">{{ $t('buddies.filters.anyMonth') }}</option>
            <option v-for="m in months" :key="m" :value="m">{{ monthLabel(m) }}</option>
          </select>
        </div>
        <button type="button" class="btn btn-secondary" :disabled="!hasFilters" @click="clearFilters">{{ $t('buddies.filters.clear') }}</button>
      </div>
      <button type="button" class="chip-toggle" :class="filters.matches ? 'chip-toggle-active' : ''" :aria-pressed="filters.matches" @click="toggleMatches">
        <Icon name="sparkle" :size="13" /> {{ $t('buddies.filters.matches') }}
      </button>
    </section>

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
      <div v-for="i in 4" :key="i" class="skeleton h-56 rounded-2xl" />
    </div>
    <EmptyState v-else-if="!posts.length" icon="users" :title="emptyCopy.title" :text="emptyCopy.text">
      <button type="button" class="btn btn-primary btn-sm" @click="openCreate"><Icon name="plus" :size="14" /> {{ $t('buddies.newPost') }}</button>
    </EmptyState>
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BuddyCard v-for="p in posts" :key="p.id" :post="p" @open="openDetail" />
    </div>
    <div v-if="posts.length" ref="sentinel" class="py-4 text-center text-sm font-semibold text-muted">
      <span v-if="loadingMore" class="inline-flex items-center gap-2"><Spinner /> {{ $t('common.loading') }}</span>
      <span v-else-if="done && posts.length > 6">{{ $t('common.endOfList') }}</span>
    </div>

    <BuddyFormDialog v-model="formOpen" :post="editing" @saved="onSaved" />
    <BuddyDetailDialog v-model="detailOpen" :post-id="detailId" @changed="onChanged" @deleted="onDeleted" @edit="openEdit" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import BuddyCard from '@/components/buddies/BuddyCard.vue'
import BuddyFormDialog from '@/components/buddies/BuddyFormDialog.vue'
import BuddyDetailDialog from '@/components/buddies/BuddyDetailDialog.vue'
import * as buddiesApi from '@/api/buddiesApi'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { useDebounceFn } from '@/composables/useDebounce'
import { localeTag } from '@/i18n'
import { countryNames } from '@/utils/countries'
import { dateInputToIso } from '@/utils/date'
import { monthRange, upcomingMonths } from '@/utils/socialExtras'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const countries = countryNames()
const months = upcomingMonths(12)
const filters = reactive({ country: '', month: '', matches: route.query.matches === '1' })
const formOpen = ref(false)
const editing = ref(null)
const detailOpen = ref(false)
const detailId = ref(null)

const tabs = computed(() => [
  { id: 'all', label: t('buddies.tabs.all'), icon: 'globe' },
  { id: 'mine', label: t('buddies.tabs.mine'), icon: 'user' },
])
const tab = computed(() => (route.query.tab === 'mine' ? 'mine' : 'all'))
const hasFilters = computed(() => !!(filters.country || filters.month || filters.matches))

const list = useInfiniteList((take, before) => {
  if (tab.value === 'mine') return buddiesApi.getBuddyPosts({ mine: true }, take, before)
  const range = monthRange(filters.month)
  return buddiesApi.getBuddyPosts({
    country: filters.country.trim(),
    from: range ? dateInputToIso(range.from) : null,
    to: range ? dateInputToIso(range.to) : null,
    matches: filters.matches,
  }, take, before)
}, { pageSize: 12 })
const { items: posts, loading, loadingMore, done, sentinel, reload } = list

const emptyCopy = computed(() => {
  if (tab.value === 'mine') return { title: t('buddies.empty.mineTitle'), text: t('buddies.empty.mineText') }
  if (filters.matches) return { title: t('buddies.empty.matchesTitle'), text: t('buddies.empty.matchesText') }
  return { title: t('buddies.empty.title'), text: t('buddies.empty.text') }
})

function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString(localeTag(), { month: 'long', year: 'numeric' })
}

const onCountryInput = useDebounceFn(() => reload(), 350)

function toggleMatches() {
  filters.matches = !filters.matches
  reload()
}

function clearFilters() {
  Object.assign(filters, { country: '', month: '', matches: false })
  reload()
}

function setTab(id) {
  router.replace({ query: id === 'mine' ? { tab: 'mine' } : {} })
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(post) {
  detailOpen.value = false
  editing.value = post
  formOpen.value = true
}

function openDetail(post) {
  detailId.value = post.id
  detailOpen.value = true
}

function onSaved(saved) {
  const index = posts.value.findIndex((p) => p.id === saved.id)
  if (index >= 0) posts.value.splice(index, 1, saved)
  else posts.value.unshift(saved)
}

function onChanged(updated) {
  const index = posts.value.findIndex((p) => p.id === updated.id)
  if (index >= 0) posts.value.splice(index, 1, updated)
}

function onDeleted(id) {
  posts.value = posts.value.filter((p) => p.id !== id)
}

watch(tab, () => reload())
// Een link als /buddies?post=… (melding, moderatie) opent meteen de oproep.
watch(() => route.query.post, (id) => {
  if (typeof id === 'string' && id) openDetail({ id })
}, { immediate: true })

onMounted(reload)
</script>
