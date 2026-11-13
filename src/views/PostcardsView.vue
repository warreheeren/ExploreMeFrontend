<template>
  <div>
    <PageHeader :eyebrow="$t('postcards.eyebrow')" :title="$t('postcards.title')" :subtitle="$t('postcards.subtitle')">
      <template #actions>
        <button type="button" class="btn btn-primary btn-sm" @click="openComposer()"><Icon name="plus" :size="14" /> {{ $t('postcards.new') }}</button>
      </template>
    </PageHeader>

    <nav class="tabs mb-5" role="tablist" :aria-label="$t('postcards.title')">
      <button v-for="tb in tabs" :key="tb.id" type="button" role="tab" class="tab" :class="tab === tb.id ? 'tab-active' : ''" :aria-selected="tab === tb.id" @click="setTab(tb.id)">
        <Icon :name="tb.icon" :size="16" /> {{ tb.label }}
      </button>
    </nav>

    <div v-if="loading" class="grid grid-cols-1 gap-6 md:grid-cols-2" aria-busy="true">
      <div v-for="i in 4" :key="i" class="skeleton aspect-[3/2] rounded-2xl" />
    </div>
    <EmptyState v-else-if="!cards.length" icon="mail" :title="tab === 'sent' ? $t('postcards.empty.sentTitle') : $t('postcards.empty.inboxTitle')" :text="tab === 'sent' ? $t('postcards.empty.sentText') : $t('postcards.empty.inboxText')">
      <button type="button" class="btn btn-primary btn-sm" @click="openComposer()"><Icon name="plus" :size="14" /> {{ $t('postcards.new') }}</button>
    </EmptyState>

    <ul v-else class="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">
      <li v-for="c in cards" :key="c.id" class="space-y-3">
        <PostcardCard :card="cardView(c)" @flip="(back) => onFlip(c, back)" />
        <div class="flex items-center gap-3 px-1">
          <Avatar :src="c.isIncoming ? c.senderProfilePhotoUrl : c.recipientProfilePhotoUrl" :name="c.isIncoming ? c.senderDisplayName : recipientName(c)" size="sm" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-ink">
              <template v-if="c.isIncoming">{{ $t('postcards.from', { name: c.senderDisplayName }) }}</template>
              <template v-else>{{ $t('postcards.to', { name: recipientName(c) }) }}</template>
            </p>
            <p class="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-muted">
              <span>{{ timeAgo(c.createdAtUtc) }}</span>
              <span v-if="c.isIncoming && !c.openedAtUtc" class="chip chip-accent h-5 px-2 text-[10px]">{{ $t('postcards.unread') }}</span>
              <span v-else-if="!c.isIncoming" class="inline-flex items-center gap-1">
                <Icon :name="c.openedAtUtc ? 'check' : 'clock'" :size="12" />
                {{ c.openedAtUtc ? $t('postcards.opened') : $t('postcards.notOpened') }}
              </span>
            </p>
          </div>
          <button v-if="c.isIncoming" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('postcards.report')" @click="openReport(c)"><Icon name="flag" :size="15" /></button>
          <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="c.isIncoming ? $t('postcards.remove') : $t('postcards.revoke')" @click="remove(c)"><Icon name="trash" :size="15" /></button>
        </div>
      </li>
    </ul>
    <div v-if="cards.length" ref="sentinel" class="py-4 text-center text-sm font-semibold text-muted">
      <span v-if="loadingMore" class="inline-flex items-center gap-2"><Spinner /> {{ $t('common.loading') }}</span>
    </div>

    <PostcardComposer v-model="composerOpen" :initial="composerInitial" @sent="onSent" />
    <ReportDialog v-if="reportId" v-model="reportOpen" target-type="postcard" :target-id="reportId" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Spinner from '@/components/ui/Spinner.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import PostcardCard from '@/components/postcards/PostcardCard.vue'
import PostcardComposer from '@/components/postcards/PostcardComposer.vue'
import * as postcardsApi from '@/api/postcardsApi'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { confirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { timeAgo } from '@/utils/date'
import { recipientName } from '@/utils/postcards'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const tabs = computed(() => [
  { id: 'inbox', label: t('postcards.tabs.inbox'), icon: 'inbox' },
  { id: 'sent', label: t('postcards.tabs.sent'), icon: 'send' },
])
const tab = computed(() => (route.query.tab === 'sent' ? 'sent' : 'inbox'))

const list = useInfiniteList(
  (take, before) => (tab.value === 'sent' ? postcardsApi.getSent(take, before) : postcardsApi.getInbox(take, before)),
  { pageSize: 12 },
)
const { items: cards, loading, loadingMore, sentinel, reload } = list

const composerOpen = ref(false)
const composerInitial = ref(null)
const reportOpen = ref(false)
const reportId = ref(null)

function cardView(c) {
  return {
    imageUrl: c.imageUrl,
    placeName: c.placeName,
    message: c.message,
    stampStyle: c.stampStyle,
    senderDisplayName: c.senderDisplayName,
    recipientName: recipientName(c),
    createdAtUtc: c.createdAtUtc,
  }
}

function setTab(id) {
  router.replace({ query: id === 'sent' ? { tab: 'sent' } : {} })
}

function openComposer(initial = null) {
  composerInitial.value = initial
  composerOpen.value = true
}

function onSent(card) {
  if (tab.value === 'sent') cards.value = [card, ...cards.value]
  else setTab('sent')
}

async function onFlip(c, back) {
  if (!back || !c.isIncoming || c.openedAtUtc) return
  c.openedAtUtc = new Date().toISOString()
  try {
    await postcardsApi.markOpened(c.id)
  } catch {
    // niet kritiek: de kaart blijft dan als "nieuw" staan bij de volgende keer laden
  }
}

function openReport(c) {
  reportId.value = c.id
  reportOpen.value = true
}

async function remove(c) {
  const ok = await confirm(c.isIncoming
    ? { title: t('postcards.removeTitle'), message: t('postcards.removeText'), confirmLabel: t('postcards.remove'), variant: 'danger' }
    : { title: t('postcards.revokeTitle'), message: t('postcards.revokeText'), confirmLabel: t('postcards.revoke'), variant: 'danger' })
  if (!ok) return
  try {
    await postcardsApi.deletePostcard(c.id)
    cards.value = cards.value.filter((x) => x.id !== c.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

/** Vanuit het album: /postcards?compose=1&tripId=…&stopId=…&photo=… */
function composeFromQuery() {
  if (route.query.compose !== '1') return
  openComposer({
    tripId: route.query.tripId || null,
    stopId: route.query.stopId || null,
    imageUrl: route.query.photo || null,
  })
  router.replace({ query: route.query.tab ? { tab: route.query.tab } : {} })
}

watch(tab, () => reload())

const off = onRealtime('notification', (n) => {
  if (n?.type === 'postcard_received' && tab.value === 'inbox') reload()
})
onBeforeUnmount(off)

onMounted(() => {
  reload()
  composeFromQuery()
})
</script>
