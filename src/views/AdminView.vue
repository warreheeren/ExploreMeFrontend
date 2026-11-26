<template>
  <div class="mx-auto max-w-5xl">
    <PageHeader :title="$t('admin.title')" :subtitle="$t('admin.subtitle')" :eyebrow="$t('admin.eyebrow')" />

    <EmptyState v-if="forbidden" icon="lock" :title="$t('admin.forbiddenTitle')" :text="$t('admin.forbiddenText')">
      <RouterLink to="/" class="btn btn-secondary btn-sm">{{ features.feed ? $t('admin.toTimeline') : $t('myTrips.toMyTrips') }}</RouterLink>
    </EmptyState>

    <template v-else>
      <!-- Statistieken -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div v-for="s in statTiles" :key="s.key" class="stat-tile">
          <div class="flex items-center gap-2 text-muted"><Icon :name="s.icon" :size="15" /><span class="eyebrow">{{ s.label }}</span></div>
          <p class="stat-value mt-1.5" :class="s.alert ? 'text-red-600' : ''">{{ stats ? s.value : '–' }}</p>
          <p class="stat-label">{{ s.hint }}</p>
        </div>
      </div>

      <nav class="tabs mt-6" role="tablist" :aria-label="$t('admin.title')">
        <button v-for="t in tabs" :key="t.id" type="button" role="tab" class="tab" :class="tab === t.id ? 'tab-active' : ''" :aria-selected="tab === t.id" @click="setTab(t.id)">
          <Icon :name="t.icon" :size="16" /> {{ t.label }}
          <span v-if="t.count" class="badge">{{ t.count }}</span>
        </button>
      </nav>

      <!-- Meldingen -->
      <section v-if="tab === 'meldingen'" class="mt-5 space-y-4">
        <div class="flex flex-wrap gap-2" role="group" :aria-label="$t('admin.reports.filter')">
          <button v-for="f in statusFilters" :key="f" type="button" class="chip-toggle" :class="status === f ? 'chip-toggle-active' : ''" @click="setStatus(f)">
            {{ $t(`admin.reports.status.${f}`) }}
          </button>
        </div>

        <div v-if="loadingReports" class="space-y-3"><div v-for="i in 3" :key="i" class="skeleton h-40 rounded-2xl" /></div>
        <EmptyState v-else-if="!reports.length" icon="check" :title="status === 'open' ? $t('admin.reports.emptyOpenTitle') : $t('admin.reports.emptyTitle')" :text="status === 'open' ? $t('admin.reports.emptyOpenText') : ''" />

        <article v-for="r in reports" :key="r.id" class="card overflow-hidden">
          <div class="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
            <ModerationPreview :target="r.target" class="min-w-0 flex-1" />

            <div class="shrink-0 space-y-2 border-t border-line pt-3 text-sm sm:w-64 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <p class="flex flex-wrap items-center gap-2">
                <span class="chip chip-muted h-6">{{ r.reason }}</span>
                <span v-if="r.openReportsForTarget > 1" class="chip h-6 bg-red-50 text-red-700">{{ $t('admin.reports.count', { n: r.openReportsForTarget }) }}</span>
              </p>
              <p v-if="r.details" class="whitespace-pre-line text-body">“{{ r.details }}”</p>
              <p class="text-xs font-semibold text-muted">
                {{ $t('admin.reports.by') }} <RouterLink :to="`/u/${r.reporterUserName}`" class="link">@{{ r.reporterUserName }}</RouterLink> · {{ timeAgo(r.createdAtUtc) }}
              </p>
              <p v-if="r.status !== 'open'" class="rounded-xl bg-gray-50 p-2.5 text-xs text-body">
                <strong>{{ $t(`admin.reports.status.${r.status}`) }}</strong>
                <template v-if="r.resolutionAction && r.resolutionAction !== 'dismiss'"> · {{ actionLabel(r.resolutionAction) }}</template>
                <template v-if="r.resolvedByUserName"> · @{{ r.resolvedByUserName }}</template>
                <span v-if="r.resolutionNote" class="mt-1 block text-muted">{{ r.resolutionNote }}</span>
              </p>
            </div>
          </div>

          <footer v-if="r.status === 'open'" class="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-gray-50/70 px-4 py-3">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="busyId === r.id" @click="dismiss(r)">{{ $t('admin.actions.dismiss') }}</button>
            <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === r.id" @click="openResolve(r)"><Icon name="flag" :size="14" /> {{ $t('admin.actions.takeAction') }}</button>
          </footer>
        </article>
      </section>

      <!-- Verborgen content -->
      <section v-else-if="tab === 'verborgen'" class="mt-5 space-y-3">
        <div v-if="loadingHidden" class="space-y-3"><div v-for="i in 2" :key="i" class="skeleton h-28 rounded-2xl" /></div>
        <EmptyState v-else-if="!hidden.length" icon="eye" :title="$t('admin.hidden.emptyTitle')" :text="$t('admin.hidden.emptyText')" />
        <article v-for="item in hidden" :key="item.type + item.id" class="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <ModerationPreview :target="item" class="min-w-0 flex-1" compact />
          <div class="flex shrink-0 gap-2">
            <button type="button" class="btn btn-secondary btn-sm" @click="unhide(item)"><Icon name="eye" :size="14" /> {{ $t('admin.actions.unhide') }}</button>
            <button type="button" class="btn btn-danger-ghost btn-sm" @click="deleteContent(item)"><Icon name="trash" :size="14" /> {{ $t('admin.actions.delete') }}</button>
          </div>
        </article>
      </section>

      <!-- Gebruikers -->
      <section v-else-if="tab === 'gebruikers'" class="mt-5 space-y-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div class="relative flex-1">
            <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input v-model="userQuery" type="search" class="search-pill" :placeholder="$t('admin.users.search')" :aria-label="$t('admin.users.search')" />
          </div>
          <label class="inline-flex items-center gap-2 text-sm font-semibold text-body">
            <input v-model="bannedOnly" type="checkbox" class="checkbox" /> {{ $t('admin.users.bannedOnly') }}
          </label>
        </div>

        <div v-if="loadingUsers" class="space-y-2"><div v-for="i in 4" :key="i" class="skeleton h-16 rounded-2xl" /></div>
        <EmptyState v-else-if="!users.length" icon="users" :title="$t('admin.users.empty')" />
        <ul v-else class="card divide-y divide-line">
          <li v-for="u in users" :key="u.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <RouterLink :to="`/u/${u.userName}`" class="flex min-w-0 flex-1 items-center gap-3">
              <Avatar :src="u.profilePhotoUrl" :name="u.displayName" size="md" />
              <span class="min-w-0">
                <span class="flex flex-wrap items-center gap-1.5">
                  <span class="truncate text-sm font-bold text-ink">{{ u.displayName }}</span>
                  <span v-if="u.role === 'Admin'" class="chip chip-accent h-5 px-2 text-[10px]">{{ $t('admin.users.moderator') }}</span>
                  <span v-if="u.bannedAtUtc" class="chip h-5 bg-red-50 px-2 text-[10px] text-red-700">{{ $t('admin.users.banned') }}</span>
                </span>
                <span class="block truncate text-xs text-muted">
                  @{{ u.userName }}<template v-if="u.email"> · {{ u.email }}</template>
                </span>
                <span class="block text-xs text-muted">
                  {{ $t('admin.users.counts', { posts: u.postsCount, trips: u.tripsCount }) }}
                  <template v-if="u.reportsAgainst"> · <span class="text-red-600">{{ $t('admin.users.reported', { n: u.reportsAgainst }) }}</span></template>
                  · {{ $t('admin.users.since', { date: formatDate(u.createdAt, { month: 'short', year: 'numeric' }) }) }}
                </span>
                <span v-if="u.banReason" class="mt-0.5 block text-xs text-red-600">{{ u.banReason }}</span>
              </span>
            </RouterLink>
            <div v-if="u.userName !== auth.userName" class="flex shrink-0 flex-wrap gap-2">
              <button v-if="u.role !== 'Admin'" type="button" class="btn btn-sm" :class="u.bannedAtUtc ? 'btn-secondary' : 'btn-danger-ghost'" @click="toggleBan(u)">
                {{ u.bannedAtUtc ? $t('admin.actions.unban') : $t('admin.actions.ban') }}
              </button>
              <button v-if="!u.bannedAtUtc" type="button" class="btn btn-ghost btn-sm" @click="toggleRole(u)">
                {{ u.role === 'Admin' ? $t('admin.actions.demote') : $t('admin.actions.promote') }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Logboek -->
      <section v-else-if="tab === 'logboek'" class="mt-5">
        <div v-if="loadingLog" class="space-y-2"><div v-for="i in 5" :key="i" class="skeleton h-12 rounded-xl" /></div>
        <EmptyState v-else-if="!log.length" icon="list" :title="$t('admin.log.empty')" />
        <ol v-else class="card divide-y divide-line">
          <li v-for="l in log" :key="l.id" class="flex items-start gap-3 px-4 py-3 text-sm">
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-body"><Icon :name="logIcon(l.action)" :size="15" /></span>
            <span class="min-w-0 flex-1">
              <span class="text-body">
                <strong class="text-ink">@{{ l.moderatorUserName }}</strong> {{ $t(`admin.log.actions.${l.action}`, l.action) }}
                <span class="text-muted">{{ $t(`admin.types.${l.targetType}`) }}</span>
                <strong v-if="l.targetLabel" class="text-ink">“{{ l.targetLabel }}”</strong>
              </span>
              <span v-if="l.note" class="block text-xs text-muted">{{ l.note }}</span>
            </span>
            <time class="shrink-0 text-xs font-semibold text-muted" :datetime="l.createdAtUtc">{{ timeAgo(l.createdAtUtc) }}</time>
          </li>
        </ol>
      </section>

      <!-- Onderhoud -->
      <section v-else-if="tab === 'onderhoud'" class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="card card-pad space-y-3">
          <h2 class="card-title">{{ $t('admin.maintenance.backupTitle') }}</h2>
          <p class="text-sm text-muted">{{ $t('admin.maintenance.backupText') }}</p>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="maintenanceBusy" @click="runBackup"><Icon name="download" :size="14" /> {{ $t('admin.maintenance.backupRun') }}</button>
          <p v-if="backupResult" class="text-xs font-semibold text-accent-700">{{ $t('admin.maintenance.backupDone', { file: backupResult.file }) }}</p>
        </div>
        <div class="card card-pad space-y-3">
          <h2 class="card-title">{{ $t('admin.maintenance.stripTitle') }}</h2>
          <p class="text-sm text-muted">{{ $t('admin.maintenance.stripText') }}</p>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="maintenanceBusy" @click="runStrip"><Icon name="shield" :size="14" /> {{ $t('admin.maintenance.stripRun') }}</button>
          <p v-if="stripResult" class="text-xs font-semibold text-accent-700">{{ $t('admin.maintenance.stripDone', stripResult) }}</p>
        </div>
      </section>
    </template>

    <!-- Actie ondernemen -->
    <Modal v-model="resolveOpen" :title="$t('admin.resolve.title')" :subtitle="resolving?.target?.label || ''" size="md">
      <div v-if="resolving" class="space-y-4">
        <fieldset class="space-y-2">
          <legend class="label">{{ $t('admin.resolve.what') }}</legend>
          <label v-for="a in resolveActions" :key="a.value" class="flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition" :class="resolveForm.action === a.value ? 'border-ink bg-gray-50' : 'border-line hover:border-line-strong'">
            <input v-model="resolveForm.action" type="radio" :value="a.value" class="mt-0.5 h-4 w-4 border-line-strong text-accent-700 focus:ring-accent-500" />
            <span><span class="block text-sm font-bold text-ink">{{ a.label }}</span><span class="text-xs text-muted">{{ a.hint }}</span></span>
          </label>
        </fieldset>
        <label v-if="resolving.target?.exists && !resolving.target?.ownerBanned" class="flex items-start gap-3 rounded-2xl border border-line p-3">
          <input v-model="resolveForm.banUser" type="checkbox" class="checkbox mt-0.5" />
          <span><span class="block text-sm font-bold text-ink">{{ $t('admin.resolve.ban', { user: resolving.target.ownerUserName }) }}</span><span class="text-xs text-muted">{{ $t('admin.resolve.banHint') }}</span></span>
        </label>
        <div>
          <label for="resolve-note" class="label">{{ $t('admin.resolve.note') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
          <textarea id="resolve-note" v-model="resolveForm.note" rows="2" maxlength="500" class="textarea" :placeholder="$t('admin.resolve.notePlaceholder')" />
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="resolveOpen = false">{{ $t('common.cancel') }}</button>
        <button type="button" class="btn" :class="resolveForm.action === 'delete' || resolveForm.banUser ? 'btn-danger' : 'btn-dark'" :disabled="busyId === resolving?.id" @click="submitResolve">
          {{ $t('admin.resolve.submit') }}
        </button>
      </template>
    </Modal>

    <!-- Reden bij blokkeren -->
    <Modal v-model="banOpen" :title="$t('admin.ban.title', { user: banTarget?.userName || '' })" size="sm">
      <label for="ban-reason" class="label">{{ $t('admin.ban.reason') }}</label>
      <textarea id="ban-reason" v-model="banReason" rows="3" maxlength="500" class="textarea" :placeholder="$t('admin.ban.placeholder')" autofocus />
      <p class="hint">{{ $t('admin.ban.hint') }}</p>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="banOpen = false">{{ $t('common.cancel') }}</button>
        <button type="button" class="btn btn-danger" @click="confirmBan">{{ $t('admin.actions.ban') }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { features } from '@/config/features'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Modal from '@/components/ui/Modal.vue'
import ModerationPreview from '@/components/admin/ModerationPreview.vue'
import * as adminApi from '@/api/adminApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { useDebounce } from '@/composables/useDebounce'
import { errorMessage } from '@/utils/errors'
import { formatDate, timeAgo } from '@/utils/date'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const forbidden = ref(false)
const stats = ref(null)

const tabs = computed(() => [
  { id: 'meldingen', label: t('admin.tabs.reports'), icon: 'flag', count: stats.value?.openReports || 0 },
  { id: 'verborgen', label: t('admin.tabs.hidden'), icon: 'eye-off' },
  { id: 'gebruikers', label: t('admin.tabs.users'), icon: 'users' },
  { id: 'logboek', label: t('admin.tabs.log'), icon: 'list' },
  { id: 'onderhoud', label: t('admin.tabs.maintenance'), icon: 'settings' },
])

// ---------- onderhoud ----------
const maintenanceBusy = ref(false)
const backupResult = ref(null)
const stripResult = ref(null)

async function runMaintenance(action, target) {
  maintenanceBusy.value = true
  try {
    target.value = await action()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    maintenanceBusy.value = false
  }
}

const runBackup = () => runMaintenance(adminApi.createBackup, backupResult)

async function runStrip() {
  const ok = await confirm({ title: t('admin.maintenance.stripTitle'), message: t('admin.maintenance.stripConfirm'), confirmLabel: t('admin.maintenance.stripRun') })
  if (ok) await runMaintenance(adminApi.stripMetadata, stripResult)
}
const tab = computed(() => (tabs.value.some((x) => x.id === route.query.tab) ? route.query.tab : 'meldingen'))
function setTab(id) {
  router.replace({ query: id === 'meldingen' ? {} : { tab: id } })
}

const statTiles = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'open', icon: 'flag', label: t('admin.stats.open'), value: s.openReports, hint: t('admin.stats.openHint'), alert: s.openReports > 0 },
    { key: 'reports', icon: 'inbox', label: t('admin.stats.reports'), value: s.reportsLast7Days, hint: t('admin.stats.last7') },
    { key: 'users', icon: 'users', label: t('admin.stats.newUsers'), value: s.newUsersLast7Days, hint: t('admin.stats.ofTotal', { n: s.totalUsers ?? 0 }) },
    { key: 'content', icon: 'image', label: t('admin.stats.content'), value: (s.postsLast7Days ?? 0) + (s.tripsLast7Days ?? 0), hint: t('admin.stats.contentHint', { posts: s.postsLast7Days ?? 0, trips: s.tripsLast7Days ?? 0 }) },
    { key: 'banned', icon: 'lock', label: t('admin.stats.banned'), value: s.bannedUsers, hint: t('admin.stats.hidden', { n: s.hiddenItems ?? 0 }) },
  ]
})

async function loadStats() {
  try {
    stats.value = await adminApi.getStats()
  } catch (e) {
    if (e?.response?.status === 403) forbidden.value = true
  }
}

// ---------- meldingen ----------
const statusFilters = ['open', 'reviewed', 'dismissed', 'all']
const status = ref('open')
const reports = ref([])
const loadingReports = ref(false)
const busyId = ref(null)

function setStatus(s) {
  status.value = s
  loadReports()
}

async function loadReports() {
  loadingReports.value = true
  try {
    reports.value = await adminApi.getReports(status.value)
  } catch (e) {
    if (e?.response?.status === 403) forbidden.value = true
    else toast.error(errorMessage(e))
  } finally {
    loadingReports.value = false
  }
}

function actionLabel(action) {
  return action.split('+').map((a) => t(`admin.resolutions.${a}`, a)).join(' + ')
}

async function dismiss(r) {
  busyId.value = r.id
  try {
    await adminApi.dismissReport(r.id)
    toast.success(t('admin.toast.dismissed'))
    await Promise.all([loadReports(), loadStats()])
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busyId.value = null
  }
}

const resolveOpen = ref(false)
const resolving = ref(null)
const resolveForm = reactive({ action: 'hide', banUser: false, note: '' })
const resolveActions = computed(() => {
  const type = resolving.value?.targetType
  const list = []
  if (type !== 'user' && resolving.value?.target?.exists) {
    list.push({ value: 'hide', label: t('admin.resolve.hide'), hint: t('admin.resolve.hideHint') })
    list.push({ value: 'delete', label: t('admin.resolve.delete'), hint: t('admin.resolve.deleteHint') })
  }
  list.push({ value: 'none', label: t('admin.resolve.none'), hint: t('admin.resolve.noneHint') })
  return list
})

function openResolve(r) {
  resolving.value = r
  Object.assign(resolveForm, { action: r.targetType === 'user' || !r.target?.exists ? 'none' : 'hide', banUser: r.targetType === 'user', note: '' })
  resolveOpen.value = true
}

async function submitResolve() {
  const r = resolving.value
  if (!r) return
  if (resolveForm.action === 'none' && !resolveForm.banUser) {
    toast.info(t('admin.toast.chooseAction'))
    return
  }
  busyId.value = r.id
  try {
    await adminApi.resolveReport(r.id, resolveForm)
    resolveOpen.value = false
    toast.success(t('admin.toast.resolved'))
    await Promise.all([loadReports(), loadStats()])
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busyId.value = null
  }
}

// ---------- verborgen ----------
const hidden = ref([])
const loadingHidden = ref(false)

async function loadHidden() {
  loadingHidden.value = true
  try {
    hidden.value = await adminApi.getHidden()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingHidden.value = false
  }
}

async function unhide(item) {
  try {
    await adminApi.unhideContent(item.type, item.id)
    hidden.value = hidden.value.filter((h) => h.id !== item.id)
    toast.success(t('admin.toast.unhidden'))
    loadStats()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function deleteContent(item) {
  const ok = await confirm({ title: t('admin.confirmDelete.title'), message: t('admin.confirmDelete.message'), confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await adminApi.deleteContent(item.type, item.id)
    hidden.value = hidden.value.filter((h) => h.id !== item.id)
    toast.success(t('admin.toast.deleted'))
    loadStats()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

// ---------- gebruikers ----------
const users = ref([])
const loadingUsers = ref(false)
const userQuery = ref('')
const bannedOnly = ref(false)
const debouncedQuery = useDebounce(userQuery, 300)

async function loadUsers() {
  loadingUsers.value = true
  try {
    users.value = await adminApi.getUsers({ q: debouncedQuery.value, banned: bannedOnly.value })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingUsers.value = false
  }
}

const banOpen = ref(false)
const banTarget = ref(null)
const banReason = ref('')

async function toggleBan(u) {
  if (u.bannedAtUtc) {
    try {
      await adminApi.unbanUser(u.id)
      toast.success(t('admin.toast.unbanned', { user: u.userName }))
      await Promise.all([loadUsers(), loadStats()])
    } catch (e) {
      toast.error(errorMessage(e))
    }
    return
  }
  banTarget.value = u
  banReason.value = ''
  banOpen.value = true
}

async function confirmBan() {
  const u = banTarget.value
  try {
    await adminApi.banUser(u.id, banReason.value)
    banOpen.value = false
    toast.success(t('admin.toast.banned', { user: u.userName }))
    await Promise.all([loadUsers(), loadStats()])
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function toggleRole(u) {
  const promote = u.role !== 'Admin'
  const ok = await confirm({
    title: promote ? t('admin.role.promoteTitle', { user: u.userName }) : t('admin.role.demoteTitle', { user: u.userName }),
    message: promote ? t('admin.role.promoteText') : t('admin.role.demoteText'),
    confirmLabel: promote ? t('admin.actions.promote') : t('admin.actions.demote'),
  })
  if (!ok) return
  try {
    await adminApi.setRole(u.id, promote ? 'Admin' : 'User')
    await loadUsers()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

// ---------- logboek ----------
const log = ref([])
const loadingLog = ref(false)

async function loadLog() {
  loadingLog.value = true
  try {
    log.value = await adminApi.getLog()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loadingLog.value = false
  }
}

function logIcon(action) {
  return { hide: 'eye-off', unhide: 'eye', delete: 'trash', ban: 'lock', unban: 'key', dismiss: 'x', promote: 'sparkle', demote: 'user' }[action] || 'info'
}

function loadTab(id) {
  if (forbidden.value) return
  if (id === 'meldingen') loadReports()
  else if (id === 'verborgen') loadHidden()
  else if (id === 'gebruikers') loadUsers()
  else if (id === 'logboek') loadLog()
}

watch(tab, loadTab)
watch([debouncedQuery, bannedOnly], () => { if (tab.value === 'gebruikers') loadUsers() })

onMounted(async () => {
  await loadStats()
  loadTab(tab.value)
})
</script>
