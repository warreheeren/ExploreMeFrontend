<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="$t('settings.title')" :subtitle="$t('settings.subtitle')" />

    <nav class="tabs mb-5" role="tablist" :aria-label="$t('settings.title')">
      <button v-for="t in tabs" :key="t.id" type="button" role="tab" class="tab" :class="tab === t.id ? 'tab-active' : ''" :aria-selected="tab === t.id" @click="setTab(t.id)">
        <Icon :name="t.icon" :size="16" /> {{ t.label }}
        <span v-if="t.count" class="badge">{{ t.count }}</span>
      </button>
    </nav>

    <!-- ===== Profiel ===== -->
    <section v-if="tab === 'profiel'" class="card overflow-hidden" aria-labelledby="settings-profile">
      <div class="relative h-32 bg-gray-100 sm:h-40">
        <CoverImage :src="form.coverImgUrl" :seed="auth.userName || ''" eager />
        <div class="absolute right-3 top-3 flex gap-2">
          <label class="btn btn-secondary btn-sm cursor-pointer bg-surface/95">
            <Icon name="camera" :size="14" /> {{ $t('settings.profile.cover') }}
            <input type="file" :accept="accept" class="sr-only" @change="(e) => onFile(e, 'cover')" />
          </label>
          <button v-if="form.coverImgUrl" type="button" class="btn btn-secondary btn-sm bg-surface/95" @click="form.coverImgUrl = ''">{{ $t('common.delete') }}</button>
        </div>
      </div>

      <form class="card-pad space-y-5 sm:p-6" @submit.prevent="saveProfile">
        <h2 id="settings-profile" class="card-title">{{ $t('settings.tabs.profile') }}</h2>
        <div class="-mt-12 flex items-end gap-4 sm:-mt-14">
          <Avatar :src="form.profileImgUrl" :name="form.displayName" size="xl" ring />
          <div class="flex flex-wrap gap-2 pb-1">
            <label class="btn btn-secondary btn-sm cursor-pointer">
              <Icon name="camera" :size="14" /> {{ $t('settings.profile.photo') }}
              <input type="file" :accept="accept" class="sr-only" @change="(e) => onFile(e, 'avatar')" />
            </label>
            <button v-if="form.profileImgUrl" type="button" class="btn btn-ghost btn-sm" @click="form.profileImgUrl = ''">{{ $t('common.delete') }}</button>
          </div>
        </div>
        <p v-if="uploading" class="text-xs font-semibold text-muted">{{ $t('settings.profile.uploading') }}</p>
        <p v-if="uploadError" class="text-xs font-semibold text-red-600">{{ uploadError }}</p>

        <div>
          <label for="set-name" class="label">{{ $t('settings.profile.displayName') }}</label>
          <input id="set-name" v-model.trim="form.displayName" class="input" maxlength="60" required />
        </div>
        <div>
          <label for="set-bio" class="label">{{ $t('settings.profile.bio') }}</label>
          <textarea id="set-bio" v-model="form.bio" rows="3" maxlength="500" class="textarea" :placeholder="$t('settings.profile.bioPlaceholder')" />
          <p class="hint text-right">{{ form.bio.length }}/500</p>
        </div>
        <div class="flex justify-end">
          <button type="submit" class="btn btn-dark" :disabled="savingProfile || uploading || !form.displayName">{{ savingProfile ? $t('common.saving') : $t('settings.profile.save') }}</button>
        </div>
      </form>
      <PaymentDetailsCard />
      <PassportCountriesCard />
    </section>

    <!-- ===== Account ===== -->
    <template v-else-if="tab === 'account'">
      <section class="card card-pad mb-5 space-y-5 sm:p-6" aria-labelledby="settings-account">
        <h2 id="settings-account" class="card-title">{{ $t('settings.tabs.account') }}</h2>
        <form class="space-y-2" @submit.prevent="saveEmail">
          <label for="set-email" class="label">{{ $t('settings.account.email') }}</label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <input id="set-email" v-model.trim="email" type="email" class="input sm:flex-1" autocomplete="email" :placeholder="$t('settings.account.emailPlaceholder')" />
            <button type="submit" class="btn btn-secondary" :disabled="savingEmail || !emailChanged || !emailPassword">{{ savingEmail ? $t('common.saving') : $t('common.save') }}</button>
          </div>
          <!-- Een ander e-mailadres vraagt herbevestiging: wachtwoord, of de gekoppelde Google/Apple-login. -->
          <div v-if="emailChanged" class="space-y-2 rounded-xl bg-gray-50 p-3">
            <label for="set-email-pw" class="label">{{ $t('settings.account.confirmEmailPassword') }}</label>
            <input id="set-email-pw" v-model="emailPassword" type="password" class="input" autocomplete="current-password" />
            <div v-if="linkedProviders.length">
              <p class="mb-2 text-xs font-bold text-body">{{ $t('settings.account.confirmEmailProvider') }}</p>
              <ExternalLoginButtons :exclude="['google', 'apple'].filter((p) => !linkedProviders.includes(p))" :busy="savingEmail" @credential="saveEmailWithProvider" @error="() => toast.error(t('externalAuth.failed'))" />
            </div>
          </div>
          <p class="hint">{{ auth.email ? $t('settings.account.emailUse') : $t('settings.account.noEmail') }}</p>
        </form>

        <form class="space-y-3 border-t border-line pt-5" @submit.prevent="changePassword">
          <h3 class="text-sm font-bold text-ink">{{ $t('settings.account.passwordTitle') }}</h3>
          <div>
            <label for="set-cur" class="label">{{ $t('settings.account.current') }}</label>
            <input id="set-cur" v-model="pw.current" type="password" class="input" autocomplete="current-password" />
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label for="set-new" class="label">{{ $t('settings.account.new') }}</label>
              <input id="set-new" v-model="pw.next" type="password" class="input" autocomplete="new-password" minlength="8" />
            </div>
            <div>
              <label for="set-new2" class="label">{{ $t('settings.account.repeat') }}</label>
              <input id="set-new2" v-model="pw.confirm" type="password" class="input" autocomplete="new-password" />
            </div>
          </div>
          <p v-if="pw.confirm && pw.confirm !== pw.next" class="text-xs font-semibold text-red-600">{{ $t('settings.account.mismatch') }}</p>
          <div class="flex justify-end">
            <button type="submit" class="btn btn-secondary" :disabled="savingPw || !pw.current || pw.next.length < 8 || pw.next !== pw.confirm">{{ savingPw ? $t('settings.account.changing') : $t('settings.account.change') }}</button>
          </div>
        </form>
      </section>

      <LinkedAccountsCard />
      <!-- Anker voor /settings#calendar (melding "agenda-sync mislukt", terugkeer na het koppelen). -->
      <div id="calendar" class="scroll-mt-20">
        <CalendarSyncCard />
        <CalendarFeedCard />
      </div>

      <!-- Anker voor /settings?tab=account#data (knoppen op de pagina "Je privacyrechten"). -->
      <section id="data" class="card card-pad mb-5 scroll-mt-20 space-y-4 sm:p-6" aria-labelledby="settings-data">
        <h2 id="settings-data" class="card-title">{{ $t('settings.data.title') }}</h2>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex-1">
            <p class="text-sm font-bold text-ink">{{ $t('settings.data.exportTitle') }}</p>
            <p class="text-sm text-muted">{{ $t('settings.data.exportText') }}</p>
          </div>
          <button type="button" class="btn btn-secondary" :disabled="exporting" @click="exportData"><Icon name="download" :size="16" /> {{ exporting ? $t('settings.data.exporting') : $t('settings.data.export') }}</button>
        </div>
        <div class="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
          <div class="flex-1">
            <p class="text-sm font-bold text-red-600">{{ $t('settings.data.deleteTitle') }}</p>
            <p class="text-sm text-muted">{{ $t('settings.data.deleteText') }}</p>
          </div>
          <button type="button" class="btn btn-danger-ghost" @click="deleteOpen = true"><Icon name="trash" :size="16" /> {{ $t('settings.data.delete') }}</button>
        </div>
      </section>

      <section class="card card-pad flex flex-wrap items-center justify-between gap-3 sm:p-6">
        <div>
          <h2 class="card-title">{{ $t('settings.logout.title') }}</h2>
          <p class="text-sm text-muted">{{ $t('settings.logout.text') }} <strong>@{{ auth.userName }}</strong></p>
        </div>
        <button type="button" class="btn btn-danger-ghost" @click="logout"><Icon name="logout" :size="16" /> {{ $t('settings.logout.title') }}</button>
      </section>
    </template>

    <!-- ===== Privacy ===== -->
    <template v-else-if="tab === 'privacy'">
      <!-- Privé-account en volgverzoeken horen bij volgen (features.follows). -->
      <section v-if="features.follows" class="card card-pad mb-5 sm:p-6">
        <div class="flex items-start gap-4">
          <span class="flex-1">
            <span class="block text-sm font-bold text-ink">{{ $t('settings.privacy.private') }}</span>
            <span class="mt-0.5 block text-sm text-muted">{{ $t('settings.privacy.privateText') }}</span>
          </span>
          <Toggle :model-value="auth.isPrivate" :disabled="savingPrivacy" :label="$t('settings.privacy.private')" @update:model-value="setPrivate" />
        </div>
      </section>

      <SafetyDefaultContact class="mb-5" />

      <section v-if="features.follows" class="card card-pad sm:p-6" aria-labelledby="settings-requests">
        <h2 id="settings-requests" class="card-title mb-1">{{ $t('settings.privacy.requests') }}</h2>
        <p class="mb-4 text-sm text-muted">{{ auth.isPrivate ? $t('settings.privacy.requestsText') : $t('settings.privacy.requestsPublic') }}</p>
        <div v-if="loadingRequests" class="space-y-2"><div v-for="i in 2" :key="i" class="skeleton h-14 rounded-xl" /></div>
        <p v-else-if="!requests.length" class="text-sm font-semibold text-muted">{{ $t('settings.privacy.noRequests') }}</p>
        <ul v-else class="-mx-2 divide-y divide-line">
          <li v-for="r in requests" :key="r.userName" class="flex items-center gap-3 px-2 py-3">
            <RouterLink :to="`/u/${r.userName}`" class="flex min-w-0 flex-1 items-center gap-3">
              <Avatar :src="r.profilePhotoUrl" :name="r.displayName" size="md" />
              <span class="min-w-0">
                <span class="block truncate text-sm font-bold text-ink">{{ r.displayName }}</span>
                <span class="block truncate text-xs text-muted">@{{ r.userName }} · {{ timeAgo(r.createdAtUtc) }}</span>
              </span>
            </RouterLink>
            <button type="button" class="btn btn-dark btn-sm" @click="respond(r, true)">{{ $t('settings.privacy.accept') }}</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="respond(r, false)">{{ $t('settings.privacy.decline') }}</button>
          </li>
        </ul>
      </section>

      <ConsentSettingsCard class="mt-5" />
    </template>

    <!-- ===== Meldingen ===== -->
    <template v-else-if="tab === 'meldingen'">
      <section class="card card-pad mb-5 sm:p-6">
        <div class="flex items-start gap-4">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-800"><Icon name="bell" :size="18" /></span>
          <div class="flex-1">
            <p class="text-sm font-bold text-ink">{{ $t('settings.notifications.pushTitle') }}</p>
            <p class="mt-0.5 text-sm text-muted">{{ pushStatusText }}</p>
            <button v-if="pushEnabled" type="button" class="btn btn-ghost btn-sm -ml-3 mt-1" @click="testPush"><Icon name="send" :size="14" /> {{ $t('settings.notifications.test') }}</button>
          </div>
          <Toggle :model-value="pushEnabled" :disabled="pushBusy || pushState === 'unsupported' || pushState === 'denied'" :label="$t('settings.notifications.pushTitle')" @update:model-value="togglePush" />
        </div>
      </section>

      <section class="card mb-5 overflow-hidden" aria-labelledby="settings-prefs">
        <div class="card-pad sm:px-6">
          <h2 id="settings-prefs" class="card-title">{{ $t('settings.notifications.prefsTitle') }}</h2>
          <p class="mt-0.5 text-sm text-muted">{{ $t('settings.notifications.prefsText') }}</p>
        </div>
        <div v-if="!prefs" class="space-y-2 px-5 pb-5"><div v-for="i in 5" :key="i" class="skeleton h-10 rounded-xl" /></div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-y border-line bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
              <th class="px-5 py-2.5 text-left sm:px-6">{{ $t('settings.notifications.category') }}</th>
              <th v-for="ch in CHANNELS" :key="ch" class="w-16 px-1 py-2.5 text-center sm:w-20">{{ $t(`settings.notifications.channels.${ch}`) }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="cat in visibleCategories.filter((c) => prefs.categories[c])" :key="cat">
              <td class="px-5 py-3 sm:px-6">
                <span class="block font-bold text-ink">{{ $t(`settings.notifications.categories.${cat}.label`) }}</span>
                <span class="block text-xs text-muted">{{ $t(`settings.notifications.categories.${cat}.hint`) }}</span>
              </td>
              <td v-for="ch in CHANNELS" :key="ch" class="px-1 py-3 text-center">
                <input
                  v-model="prefs.categories[cat][ch]"
                  type="checkbox"
                  class="checkbox h-5 w-5"
                  :aria-label="`${$t(`settings.notifications.categories.${cat}.label`)}: ${$t(`settings.notifications.channels.${ch}`)}`"
                  @change="savePrefs"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- ===== Weergave & taal ===== -->
    <template v-else-if="tab === 'weergave'">
      <section class="card card-pad mb-5 sm:p-6" aria-labelledby="settings-theme">
        <h2 id="settings-theme" class="card-title mb-3">{{ $t('settings.display.theme') }}</h2>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" :aria-label="$t('settings.display.theme')">
          <button
            v-for="opt in THEMES"
            :key="opt.value"
            type="button"
            role="radio"
            :aria-checked="prefsStore.theme === opt.value"
            class="flex items-center gap-3 rounded-2xl border p-3.5 text-left transition"
            :class="prefsStore.theme === opt.value ? 'border-ink bg-gray-50' : 'border-line hover:border-line-strong'"
            @click="prefsStore.setTheme(opt.value)"
          >
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-ink"><Icon :name="opt.icon" :size="17" /></span>
            <span class="text-sm font-bold text-ink">{{ $t(`settings.display.themes.${opt.value}`) }}</span>
          </button>
        </div>
      </section>

      <section class="card card-pad sm:p-6" aria-labelledby="settings-language">
        <h2 id="settings-language" class="card-title mb-1">{{ $t('settings.display.language') }}</h2>
        <p class="mb-3 text-sm text-muted">{{ $t('settings.display.languageText') }}</p>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" :aria-label="$t('settings.display.language')">
          <button
            v-for="lang in LANGUAGES"
            :key="lang.code"
            type="button"
            role="radio"
            :aria-checked="locale === lang.code"
            class="flex items-center gap-3 rounded-2xl border p-3.5 text-left transition"
            :class="locale === lang.code ? 'border-ink bg-gray-50' : 'border-line hover:border-line-strong'"
            @click="changeLanguage(lang.code)"
          >
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold uppercase text-ink">{{ lang.code }}</span>
            <span class="text-sm font-bold text-ink">{{ lang.name }}</span>
          </button>
        </div>
      </section>
    </template>

    <!-- Account verwijderen -->
    <Modal v-model="deleteOpen" :title="$t('settings.data.deleteTitle')" size="sm">
      <p class="text-sm text-body">{{ $t('settings.data.deleteConfirm') }}</p>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>{{ $t('settings.data.deleteItem1') }}</li>
        <li>{{ $t('settings.data.deleteItem2') }}</li>
        <li>{{ $t('settings.data.deleteItem3') }}</li>
      </ul>
      <label for="delete-pw" class="label mt-4">{{ $t('settings.data.password') }}</label>
      <input id="delete-pw" v-model="deletePassword" type="password" class="input" autocomplete="current-password" autofocus />
      <!-- Accounts via Google/Apple kennen hun wachtwoord niet: bevestigen kan ook met een gekoppelde provider. -->
      <div v-if="deleteProviders.length" class="mt-4 border-t border-line pt-4">
        <p class="mb-2.5 text-xs font-bold text-body">{{ $t('settings.data.deleteWithProvider') }}</p>
        <ExternalLoginButtons :exclude="['google', 'apple'].filter((p) => !deleteProviders.includes(p))" :busy="deleting" @credential="deleteWithProvider" @error="() => toast.error(t('externalAuth.failed'))" />
      </div>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="deleteOpen = false">{{ $t('common.cancel') }}</button>
        <button type="button" class="btn btn-danger" :disabled="!deletePassword || deleting" @click="deleteAccount">{{ deleting ? $t('settings.data.deleting') : $t('settings.data.deleteForever') }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import Modal from '@/components/ui/Modal.vue'
import Toggle from '@/components/ui/Toggle.vue'
import SafetyDefaultContact from '@/components/safety/SafetyDefaultContact.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import LinkedAccountsCard from '@/components/auth/LinkedAccountsCard.vue'
import ExternalLoginButtons from '@/components/auth/ExternalLoginButtons.vue'
import * as externalAuthApi from '@/api/externalAuthApi'
import CalendarFeedCard from '@/components/settings/CalendarFeedCard.vue'
import CalendarSyncCard from '@/components/settings/CalendarSyncCard.vue'
import PaymentDetailsCard from '@/components/settings/PaymentDetailsCard.vue'
import PassportCountriesCard from '@/components/settings/PassportCountriesCard.vue'
import ConsentSettingsCard from '@/components/settings/ConsentSettingsCard.vue'
import * as userApi from '@/api/userApi'
import * as notificationsApi from '@/api/notificationsApi'
import { setLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { useToastStore } from '@/stores/toast'
import { useImageUpload } from '@/composables/useImageUpload'
import { currentSubscription, disablePush, enablePush, pushPermission, pushSupported } from '@/services/push'
import { errorMessage } from '@/utils/errors'
import { timeAgo } from '@/utils/date'
import { saveBlob } from '@/utils/format'
import { features } from '@/config/features'

const CATEGORIES = ['likes', 'comments', 'follows', 'trips', 'trip_reminders', 'safety', 'messages']
// Categorieën die alleen over uitgeschakelde sociale functies gaan verbergen we (de voorkeur zelf blijft bewaard).
// Likes en reacties bestaan op posts (feed) én op reizen (discover); reizen, berichten e.d. zijn kern en altijd zichtbaar.
const CATEGORY_FEATURE_ON = {
  likes: features.feed || features.discover,
  comments: features.feed || features.discover,
  follows: features.follows,
}
const visibleCategories = CATEGORIES.filter((c) => CATEGORY_FEATURE_ON[c] !== false)
const CHANNELS = ['inApp', 'push']
const THEMES = [
  { value: 'system', icon: 'settings' },
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
]
const LANGUAGES = [
  { code: 'nl', name: 'Nederlands' },
  { code: 'en', name: 'English' },
]

const { t, locale } = useI18n()
const auth = useAuthStore()
const prefsStore = usePreferencesStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()
const { uploading, error: uploadError, upload, accept } = useImageUpload()

const tabs = computed(() => [
  { id: 'profiel', label: t('settings.tabs.profile'), icon: 'user' },
  { id: 'account', label: t('settings.tabs.account'), icon: 'key' },
  { id: 'privacy', label: t('settings.tabs.privacy'), icon: 'shield', count: features.follows ? auth.pendingFollowRequests || 0 : 0 },
  { id: 'meldingen', label: t('settings.tabs.notifications'), icon: 'bell' },
  { id: 'weergave', label: t('settings.tabs.display'), icon: 'palette' },
])
// De agendakaarten staan onder Account: /settings#calendar (zonder ?tab) opent daarom dat tabblad.
const tab = computed(() => {
  if (tabs.value.some((x) => x.id === route.query.tab)) return route.query.tab
  return route.hash === '#calendar' ? 'account' : 'profiel'
})
function setTab(id) {
  router.replace({ query: id === 'profiel' ? {} : { tab: id } })
}

// ---------- profiel ----------
const form = reactive({
  displayName: auth.displayName || '',
  bio: auth.bio || '',
  profileImgUrl: auth.profilePhotoUrl || '',
  coverImgUrl: auth.coverPhotoUrl || '',
})
const savingProfile = ref(false)

async function onFile(e, kind) {
  const file = e.target.files?.[0]
  e.target.value = ''
  const url = await upload(file)
  if (!url) return
  if (kind === 'cover') form.coverImgUrl = url
  else form.profileImgUrl = url
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await auth.updateProfile({ displayName: form.displayName, bio: form.bio, profileImgUrl: form.profileImgUrl || '', coverImgUrl: form.coverImgUrl || '' })
    toast.success(t('settings.profile.saved'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    savingProfile.value = false
  }
}

// ---------- account ----------
const email = ref(auth.email || '')
const pw = reactive({ current: '', next: '', confirm: '' })
const savingEmail = ref(false)
const savingPw = ref(false)

const emailPassword = ref('')
const emailChanged = computed(() => (email.value || '').toLowerCase() !== (auth.email || '').toLowerCase())
/** Gekoppelde Google/Apple-logins (bevestigen zonder wachtwoord, voor accounts die er geen kennen). */
const linkedProviders = ref([])
watch(() => tab.value, async (value) => {
  if (value !== 'account') return
  try {
    linkedProviders.value = (await externalAuthApi.getExternalLogins()).map((l) => l.provider)
  } catch {
    linkedProviders.value = []
  }
}, { immediate: true })

function saveEmail() {
  return doSaveEmail({ currentPassword: emailPassword.value })
}

function saveEmailWithProvider({ provider, idToken, nonce }) {
  return doSaveEmail({ provider, idToken, nonce: nonce || null })
}

async function doSaveEmail(confirmation) {
  savingEmail.value = true
  try {
    await auth.updateProfile({ email: email.value, ...confirmation })
    emailPassword.value = ''
    toast.success(email.value ? t('settings.account.emailSaved') : t('settings.account.emailRemoved'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    savingEmail.value = false
  }
}


async function changePassword() {
  savingPw.value = true
  try {
    // De API trekt andere sessies in en geeft deze sessie een nieuw token.
    await auth.changePassword(pw.current, pw.next)
    Object.assign(pw, { current: '', next: '', confirm: '' })
    toast.success(t('settings.account.passwordChanged'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    savingPw.value = false
  }
}

const exporting = ref(false)
async function exportData() {
  exporting.value = true
  try {
    const { blob, fileName } = await userApi.exportData()
    saveBlob(blob, fileName)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    exporting.value = false
  }
}

const deleteOpen = ref(false)
const deletePassword = ref('')
const deleting = ref(false)
/** Gekoppelde providers waarmee het verwijderen bevestigd kan worden. */
const deleteProviders = ref([])
watch(deleteOpen, async (open) => {
  if (!open) return
  try {
    deleteProviders.value = (await externalAuthApi.getExternalLogins()).map((l) => l.provider)
  } catch {
    deleteProviders.value = []
  }
})

function deleteAccount() {
  return doDelete({ password: deletePassword.value })
}

function deleteWithProvider({ provider, idToken, nonce }) {
  return doDelete({ provider, idToken, nonce: nonce || null })
}

async function doDelete(confirmation) {
  deleting.value = true
  try {
    await userApi.deleteAccount(confirmation)
    await disablePush().catch(() => {})
    deleteOpen.value = false
    auth.logout()
    toast.success(t('settings.data.deleted'))
    router.replace({ name: 'login' })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    deleting.value = false
  }
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

// ---------- privacy ----------
const savingPrivacy = ref(false)
const requests = ref([])
const loadingRequests = ref(false)

async function setPrivate(value) {
  savingPrivacy.value = true
  try {
    await auth.updateProfile({ isPrivate: value })
    toast.success(value ? t('settings.privacy.nowPrivate') : t('settings.privacy.nowPublic'))
    if (!value) {
      requests.value = []
      auth.pendingFollowRequests = 0
    }
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    savingPrivacy.value = false
  }
}

async function loadRequests() {
  loadingRequests.value = true
  try {
    requests.value = await userApi.getFollowRequests()
    auth.pendingFollowRequests = requests.value.length
  } catch {
    requests.value = []
  } finally {
    loadingRequests.value = false
  }
}

async function respond(r, accept) {
  try {
    if (accept) await userApi.acceptFollowRequest(r.userName)
    else await userApi.declineFollowRequest(r.userName)
    requests.value = requests.value.filter((x) => x.userName !== r.userName)
    auth.pendingFollowRequests = requests.value.length
    if (accept) toast.success(t('settings.privacy.accepted', { name: r.displayName }))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

// ---------- meldingen ----------
const prefs = ref(null)
const pushState = ref(pushPermission())
const pushEnabled = ref(false)
const pushBusy = ref(false)

const pushStatusText = computed(() => {
  if (pushState.value === 'unsupported') return t('settings.notifications.pushUnsupported')
  if (pushState.value === 'denied') return t('settings.notifications.pushDenied')
  return pushEnabled.value ? t('settings.notifications.pushOn') : t('settings.notifications.pushOff')
})

async function loadPrefs() {
  try {
    prefs.value = await userApi.getNotificationPreferences()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function savePrefs() {
  try {
    prefs.value = await userApi.updateNotificationPreferences(prefs.value)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function togglePush(on) {
  pushBusy.value = true
  try {
    if (on) {
      await enablePush()
      pushEnabled.value = true
      toast.success(t('settings.notifications.pushEnabled'))
    } else {
      await disablePush()
      pushEnabled.value = false
    }
  } catch (e) {
    const reason = e?.message
    if (reason === 'denied') toast.error(t('settings.notifications.pushDenied'))
    else if (reason === 'disabled') toast.error(t('settings.notifications.pushServerOff'))
    else if (reason === 'unsupported') toast.error(t('settings.notifications.pushUnsupported'))
    else toast.error(errorMessage(e))
  } finally {
    pushState.value = pushPermission()
    pushBusy.value = false
  }
}

async function testPush() {
  try {
    await notificationsApi.sendTestPush()
    toast.info(t('settings.notifications.testSent'))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

// ---------- weergave & taal ----------
async function changeLanguage(code) {
  setLocale(code)
  try {
    await auth.updateProfile({ language: code })
  } catch { /* de taal van mails blijft dan ongewijzigd */ }
}

function loadTab(id) {
  if (id === 'privacy' && features.follows) loadRequests()
  if (id === 'meldingen') {
    if (!prefs.value) loadPrefs()
    if (pushSupported()) currentSubscription().then((sub) => { pushEnabled.value = !!sub && pushPermission() === 'granted' })
  }
}

watch(tab, loadTab)

onMounted(async () => {
  loadTab(tab.value)
  // Vanaf "Je privacyrechten": meteen naar Gegevens downloaden / Account verwijderen.
  if (route.hash === '#data') requestAnimationFrame(() => document.getElementById('data')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  const me = await auth.loadMe()
  if (me) {
    form.displayName = me.displayName
    form.bio = me.bio || ''
    form.profileImgUrl = me.profilePhotoUrl || ''
    form.coverImgUrl = me.coverPhotoUrl || ''
    email.value = me.email || ''
  }
})
</script>
