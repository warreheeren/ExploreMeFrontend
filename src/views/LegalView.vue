<template>
  <div class="min-h-screen bg-ground">
    <header class="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <RouterLink :to="auth.isAuthenticated ? '/' : '/login'" aria-label="ExploreMe"><Logo /></RouterLink>
        <button type="button" class="btn btn-ghost btn-sm" @click="goBack"><Icon name="chevron-left" :size="16" /> {{ $t('legal.back') }}</button>
      </div>
    </header>

    <main id="main" class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <article class="card card-pad sm:p-8">
        <p class="eyebrow-accent">ExploreMe</p>
        <h1 class="page-title mt-1">{{ $t(`legal.${doc}.title`) }}</h1>
        <p class="mt-1 text-xs font-semibold text-muted">{{ $t('legal.updated', { date: updated }) }}</p>
        <p class="mt-4 rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-muted">{{ $t('legal.template') }}</p>
        <p class="mt-5 text-[15px] leading-relaxed text-body">{{ $t(`legal.${doc}.intro`) }}</p>

        <!-- Rechten van betrokkenen: rechtstreeks naar de bestaande export-/verwijderflow in Instellingen. -->
        <section v-if="doc === 'rights'" class="mt-6 rounded-2xl border border-line p-4 sm:p-5" aria-labelledby="legal-actions">
          <h2 id="legal-actions" class="text-sm font-bold text-ink">{{ $t('legal.rights.actions.title') }}</h2>
          <div v-if="auth.isAuthenticated" class="mt-3 flex flex-wrap gap-2">
            <RouterLink :to="DATA_SETTINGS" class="btn btn-secondary btn-sm"><Icon name="download" :size="15" /> {{ $t('legal.rights.actions.export') }}</RouterLink>
            <RouterLink :to="DATA_SETTINGS" class="btn btn-danger-ghost btn-sm"><Icon name="trash" :size="15" /> {{ $t('legal.rights.actions.delete') }}</RouterLink>
            <RouterLink :to="{ path: '/settings', query: { tab: 'meldingen' } }" class="btn btn-ghost btn-sm"><Icon name="bell" :size="15" /> {{ $t('legal.rights.actions.notifications') }}</RouterLink>
            <button type="button" class="btn btn-ghost btn-sm" @click="consent.openSettings()"><Icon name="settings" :size="15" /> {{ $t('legal.rights.actions.cookies') }}</button>
          </div>
          <div v-else class="mt-2 flex flex-wrap items-center gap-3">
            <p class="text-sm text-muted">{{ $t('legal.rights.actions.loginFirst') }}</p>
            <RouterLink :to="{ name: 'login', query: { redirect: DATA_SETTINGS_PATH } }" class="btn btn-secondary btn-sm">{{ $t('routes.login') }}</RouterLink>
            <button type="button" class="btn btn-ghost btn-sm" @click="consent.openSettings()"><Icon name="settings" :size="15" /> {{ $t('legal.rights.actions.cookies') }}</button>
          </div>
        </section>

        <section v-for="(s, i) in sections" :key="i" class="mt-6">
          <h2 class="text-base font-bold text-ink">{{ i + 1 }}. {{ $rt(s.title) }}</h2>
          <p class="mt-1.5 text-[15px] leading-relaxed text-body">{{ $rt(s.body) }}</p>
          <ul v-if="s.items?.length" class="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-body marker:text-muted">
            <li v-for="(item, j) in s.items" :key="j">{{ $rt(item) }}</li>
          </ul>
        </section>

        <!-- Cookiebeleid: overzicht van lokale opslag; tabel vanaf sm, gestapelde kaartjes op een telefoon. -->
        <section v-if="doc === 'cookies'" class="mt-8" aria-labelledby="legal-storage">
          <h2 id="legal-storage" class="text-base font-bold text-ink">{{ $t('legal.cookies.table.caption') }}</h2>
          <div class="mt-3 hidden overflow-hidden rounded-2xl border border-line sm:block">
            <table class="w-full text-left text-sm">
              <caption class="sr-only">{{ $t('legal.cookies.table.caption') }}</caption>
              <thead class="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" class="px-3 py-2.5">{{ $t('legal.cookies.table.name') }}</th>
                  <th scope="col" class="px-3 py-2.5">{{ $t('legal.cookies.table.category') }}</th>
                  <th scope="col" class="px-3 py-2.5">{{ $t('legal.cookies.table.purpose') }}</th>
                  <th scope="col" class="px-3 py-2.5">{{ $t('legal.cookies.table.duration') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="(row, i) in storageRows" :key="i" class="align-top">
                  <th scope="row" class="px-3 py-2.5 font-normal">
                    <code class="break-words text-xs font-semibold text-ink">{{ row.name }}</code>
                    <span class="mt-0.5 block text-xs text-muted">{{ row.kind }}</span>
                  </th>
                  <td class="px-3 py-2.5 text-body">{{ row.category }}</td>
                  <td class="px-3 py-2.5 text-body">{{ row.purpose }}</td>
                  <td class="px-3 py-2.5 text-body">{{ row.duration }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="mt-3 space-y-2 sm:hidden">
            <li v-for="(row, i) in storageRows" :key="i" class="rounded-2xl border border-line p-3.5 text-sm">
              <code class="break-words text-xs font-semibold text-ink">{{ row.name }}</code>
              <p class="mt-0.5 text-xs text-muted">{{ row.kind }} · {{ row.category }}</p>
              <p class="mt-1.5 text-body">{{ row.purpose }}</p>
              <p class="mt-1 text-xs font-semibold text-muted">{{ $t('legal.cookies.table.duration') }}: {{ row.duration }}</p>
            </li>
          </ul>
          <button type="button" class="btn btn-secondary btn-sm mt-4" @click="consent.openSettings()"><Icon name="settings" :size="15" /> {{ $t('legal.footer.cookieSettings') }}</button>
        </section>

        <p class="mt-8 border-t border-line pt-5 text-sm text-muted">{{ $t('legal.contactLine', { contact: CONTACT }) }}</p>
      </article>

      <nav class="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold text-muted" :aria-label="$t('nav.footer')">
        <RouterLink v-for="link in FOOTER_LINKS" :key="link.doc" :to="link.to" class="hover:text-ink" :aria-current="doc === link.doc ? 'page' : undefined">{{ $t(link.label) }}</RouterLink>
        <button type="button" class="font-semibold hover:text-ink" @click="consent.openSettings()">{{ $t('legal.footer.cookieSettings') }}</button>
      </nav>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Logo from '@/components/ui/Logo.vue'
import Icon from '@/components/ui/Icon.vue'
import { useAuthStore } from '@/stores/auth'
import { useConsentStore } from '@/stores/consent'
import { localeTag } from '@/i18n'

// Contactadres voor privacyvragen; in te stellen per omgeving.
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || 'privacy@exploreme.app'
// Datum van de laatste inhoudelijke wijziging van de teksten.
const UPDATED_ON = new Date(Date.UTC(2026, 9, 14))

const DOCS = ['privacy', 'terms', 'cookies', 'rights']
const FOOTER_LINKS = [
  { doc: 'privacy', to: '/privacy', label: 'legal.footer.privacy' },
  { doc: 'cookies', to: '/cookies', label: 'legal.footer.cookies' },
  { doc: 'rights', to: '/privacy-rights', label: 'legal.footer.rights' },
  { doc: 'terms', to: '/terms', label: 'legal.footer.terms' },
]
/** Instellingen → Account, sectie "Je gegevens" (export + account verwijderen). */
const DATA_SETTINGS = { path: '/settings', query: { tab: 'account' }, hash: '#data' }
const DATA_SETTINGS_PATH = '/settings?tab=account#data'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const consent = useConsentStore()
const { tm, rt } = useI18n()

const doc = computed(() => (DOCS.includes(route.meta.legalDoc) ? route.meta.legalDoc : 'privacy'))
const sections = computed(() => tm(`legal.${doc.value}.sections`) || [])
const updated = computed(() => UPDATED_ON.toLocaleDateString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' }))

/** Rijen van de opslagtabel met vertaalde soort en categorie. */
const storageRows = computed(() => {
  if (doc.value !== 'cookies') return []
  const kinds = tm('legal.cookies.kinds') || {}
  const categories = tm('legal.cookies.categories') || {}
  return (tm('legal.cookies.rows') || []).map((row) => ({
    name: rt(row.name),
    kind: kinds[rt(row.kind)] ? rt(kinds[rt(row.kind)]) : rt(row.kind),
    category: categories[rt(row.category)] ? rt(categories[rt(row.category)]) : rt(row.category),
    purpose: rt(row.purpose),
    duration: rt(row.duration),
  }))
})

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push(auth.isAuthenticated ? '/' : '/login')
}
</script>
