<template>
  <div class="min-h-screen bg-ground">
    <header class="safe-top sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 sm:px-6">
        <RouterLink to="/" aria-label="ExploreMe"><Logo /></RouterLink>
        <nav class="flex items-center gap-2" :aria-label="$t('landing.accountNav')">
          <RouterLink to="/login" class="btn btn-ghost btn-sm">{{ $t('landing.login') }}</RouterLink>
          <RouterLink to="/register" class="btn btn-dark btn-sm">{{ $t('landing.cta') }}</RouterLink>
        </nav>
      </div>
    </header>

    <main>
      <!-- Hero: de belofte, met een voorbeeld van wat je in de app ziet -->
      <section class="mx-auto grid max-w-content grid-cols-1 items-center gap-8 px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:gap-14 lg:pb-16">
        <div>
          <p class="eyebrow-accent">{{ $t('landing.eyebrow') }}</p>
          <h1 class="title-display mt-3 text-[40px] leading-[1.04] text-balance sm:text-[56px]">{{ $t('landing.headline') }}</h1>
          <p class="mt-5 max-w-xl text-[17px] leading-relaxed text-body">{{ $t('landing.intro') }}</p>
          <div class="mt-7 flex flex-wrap items-center gap-3">
            <RouterLink to="/register" class="btn btn-primary btn-lg">{{ $t('landing.start') }}</RouterLink>
            <a href="#zo-werkt-het" class="btn btn-secondary btn-lg">{{ $t('landing.how') }}</a>
          </div>
          <p class="mt-4 text-sm text-muted">{{ $t('landing.free') }}</p>
        </div>

        <!-- Voorbeeldkaart (decoratief): zo ziet "Mijn reizen" eruit zodra je groep meedoet. -->
        <div class="overflow-hidden rounded-3xl bg-accent-800 px-5 pt-5 sm:px-8 sm:pt-8" aria-hidden="true">
          <div class="rounded-t-2xl bg-surface p-5">
            <span class="chip chip-accent">{{ $t('landing.preview.countdown') }}</span>
            <p class="title-display mt-2 text-xl">{{ $t('landing.preview.title') }}</p>
            <p class="mt-1 flex items-center gap-2 text-xs font-semibold text-muted">
              {{ $t('landing.preview.dates') }} <span>·</span>
              <span class="flex -space-x-1.5"><Avatar v-for="name in previewPeople" :key="name" :name="name" size="xs" ring /></span>
              {{ $t('landing.preview.people') }}
            </p>
            <div class="mt-3 border-t border-line pt-2.5">
              <p class="mb-1 text-xs font-extrabold text-rating-text">{{ $t('landing.preview.waiting') }}</p>
              <p v-for="(row, i) in previewRows" :key="row.key" class="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink" :class="i === 0 ? 'bg-amber-50 dark:bg-gray-50' : ''">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-body"><Icon :name="row.icon" :size="15" /></span>
                {{ $t(`landing.preview.${row.key}`) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- In plaats van vier losse hulpmiddelen -->
      <section class="border-y border-line bg-surface">
        <div class="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6 sm:px-6">
          <p class="font-bold text-ink">{{ $t('landing.instead.label') }}</p>
          <span v-for="n in 4" :key="n" class="font-semibold text-muted line-through decoration-2">{{ $t(`landing.instead.item${n}`) }}</span>
          <Icon name="arrow-right" :size="16" class="text-muted" />
          <span class="chip chip-accent">{{ $t('landing.instead.one') }}</span>
        </div>
      </section>

      <!-- Drie stappen -->
      <section id="zo-werkt-het" class="mx-auto max-w-content scroll-mt-20 px-4 pt-12 sm:px-6 sm:pt-16">
        <h2 class="title-display text-[28px] leading-tight sm:text-[34px]">{{ $t('landing.stepsTitle') }}</h2>
        <ol class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <li v-for="n in 3" :key="n" class="card card-pad">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-sm font-extrabold text-accent-800">{{ n }}</span>
            <h3 class="title-display mt-3 text-xl">{{ $t(`landing.steps.step${n}.title`) }}</h3>
            <p class="mt-1.5 text-[15px] leading-relaxed text-body">{{ $t(`landing.steps.step${n}.text`) }}</p>
          </li>
        </ol>
      </section>

      <!-- Vier pijlers -->
      <section class="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16" :aria-label="$t('landing.pillarsAria')">
        <h2 class="title-display text-[28px] leading-tight sm:text-[34px]">{{ $t('landing.pillarsTitle') }}</h2>
        <ol class="card mt-6 grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <li v-for="(key, i) in pillars" :key="key" class="p-5 sm:p-6">
            <p class="font-display text-sm font-semibold text-accent-700">0{{ i + 1 }}</p>
            <h3 class="title-display mt-1.5 text-xl">{{ $t(`landing.pillars.${key}.title`) }}</h3>
            <p class="mt-1.5 text-sm leading-relaxed text-body">{{ $t(`landing.pillars.${key}.text`) }}</p>
          </li>
        </ol>
      </section>

      <!-- Openbare reizen van anderen horen bij ontdekken (features.discover). -->
      <section v-if="features.discover && trips.length" id="reizen" class="mx-auto max-w-content scroll-mt-20 px-4 pb-12 sm:px-6 sm:pb-16">
        <div class="mb-6 max-w-2xl">
          <h2 class="title-display text-[28px] leading-tight sm:text-[34px]">{{ $t('landing.tripsTitle') }}</h2>
          <p class="mt-2 text-[15px] leading-relaxed text-body">{{ $t('landing.tripsText') }}</p>
        </div>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
        </div>
      </section>

      <!-- Afsluiter -->
      <section class="mx-auto max-w-content px-4 pb-14 sm:px-6">
        <div class="flex flex-col items-start gap-5 rounded-3xl bg-ink p-7 text-surface sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div class="max-w-xl">
            <h2 class="font-display text-[28px] font-semibold leading-tight tracking-tight">{{ $t('landing.closingTitle') }}</h2>
            <p class="mt-2 text-[15px] leading-relaxed opacity-80">{{ $t('landing.closingText') }}</p>
          </div>
          <RouterLink to="/register" class="btn btn-primary btn-lg shrink-0">{{ $t('landing.start') }}</RouterLink>
        </div>
      </section>
    </main>

    <footer class="border-t border-line bg-surface">
      <div class="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm sm:px-6">
        <span class="flex items-center gap-3"><Logo :size="22" /> <span class="text-muted">© {{ year }}</span></span>
        <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 font-semibold text-muted" :aria-label="$t('nav.footer')">
          <RouterLink to="/privacy" class="hover:text-ink">{{ $t('legal.footer.privacy') }}</RouterLink>
          <RouterLink to="/terms" class="hover:text-ink">{{ $t('legal.footer.terms') }}</RouterLink>
          <RouterLink to="/cookies" class="hover:text-ink">{{ $t('legal.footer.cookies') }}</RouterLink>
          <button type="button" class="font-semibold hover:text-ink" @click="consent.openSettings()">{{ $t('legal.footer.cookieSettings') }}</button>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Logo from '@/components/ui/Logo.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import TripCard from '@/components/TripCard.vue'
import * as tripsApi from '@/api/tripsApi'
import { useConsentStore } from '@/stores/consent'
import { features } from '@/config/features'

// Landingspagina voor bezoekers: ExploreMe is één plek voor een groepsreis (plannen, beslissen, geld, herinneren).
const consent = useConsentStore()
const year = new Date().getFullYear()

const pillars = ['plan', 'decide', 'money', 'remember']
// Voorbeeldkaart in de kop; de namen leveren alleen initialen voor de avatars.
const previewPeople = ['Emma', 'Lucas', 'Sofie', 'Noah']
const previewRows = [
  { key: 'payment', icon: 'wallet' },
  { key: 'poll', icon: 'vote' },
  { key: 'task', icon: 'checklist' },
]

// Alleen met ontdekken aan: de populairste openbare reizen. Lukt het verzoek niet, dan blijft de pagina gewoon staan.
const all = ref([])
const trips = computed(() => [...all.value].sort((a, b) => score(b) - score(a)).slice(0, 6))

function score(trip) {
  return (trip.likeCount || 0) + (trip.bookmarkCount || 0) + (trip.copyCount || 0)
}

onMounted(async () => {
  if (!features.discover) return
  try {
    all.value = await tripsApi.getAllTrips(24)
  } catch {
    all.value = []
  }
})
</script>
