<template>
  <div class="min-h-screen bg-ground">
    <header class="safe-top sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 sm:px-6">
        <RouterLink to="/" aria-label="ExploreMe"><Logo /></RouterLink>
        <nav class="flex items-center gap-2" :aria-label="$t('landing.accountNav')">
          <RouterLink to="/login" class="btn btn-ghost btn-sm">{{ $t('landing.login') }}</RouterLink>
          <RouterLink to="/register" class="btn btn-dark btn-sm">{{ $t('landing.register') }}</RouterLink>
        </nav>
      </div>
    </header>

    <main>
      <!-- Hero -->
      <section class="mx-auto grid max-w-content grid-cols-1 items-center gap-8 px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-20">
        <div>
          <p class="eyebrow-accent">{{ $t('landing.eyebrow') }}</p>
          <h1 class="title-display mt-3 text-[40px] leading-[1.04] text-balance sm:text-[56px]">{{ $t('landing.headline') }}</h1>
          <p class="mt-5 max-w-xl text-[17px] leading-relaxed text-body">{{ $t('landing.intro') }}</p>
          <div class="mt-7 flex flex-wrap items-center gap-3">
            <RouterLink to="/register" class="btn btn-primary btn-lg">{{ $t('landing.cta') }}</RouterLink>
            <a v-if="trips.length" href="#reizen" class="btn btn-secondary btn-lg">{{ $t('landing.browse') }}</a>
          </div>
          <p class="mt-4 text-sm text-muted">{{ $t('landing.free') }}</p>
        </div>

        <!-- Beeld: de populairste openbare reis, of de illustratie als er nog geen reizen (of geen verbinding) zijn. -->
        <RouterLink v-if="featured" :to="`/t/${featured.id}`" class="group relative block overflow-hidden rounded-3xl border border-line bg-gray-100">
          <div class="aspect-[4/3] sm:aspect-[16/11]">
            <CoverImage :src="featured.coverImageUrl" :alt="featured.title" :seed="featured.id" eager img-class="transition duration-700 group-hover:scale-[1.03]" />
          </div>
          <div class="absolute inset-x-3 bottom-3 rounded-2xl bg-surface/95 p-4 backdrop-blur sm:inset-x-4 sm:bottom-4">
            <p class="eyebrow-accent">{{ [flagFor(featured.country), featured.country].filter(Boolean).join(' ') }}</p>
            <p class="title-display mt-0.5 line-clamp-1 text-xl">{{ featured.title }}</p>
            <p class="mt-0.5 text-xs font-semibold text-muted">{{ formatDateRange(featured.startDate, featured.endDate) }} · {{ $t('landing.by', { name: featured.displayName }) }}</p>
          </div>
        </RouterLink>
        <div v-else class="relative overflow-hidden rounded-3xl bg-accent-800" :class="loading ? 'animate-pulse' : ''" aria-hidden="true">
          <svg viewBox="0 0 600 420" class="block w-full">
            <circle cx="455" cy="120" r="46" fill="#F3D27A" />
            <path d="M0 290 L90 216 L170 262 L260 180 L360 268 L450 218 L540 252 L600 222 L600 420 L0 420Z" fill="#134E4A" />
            <path d="M0 338 L80 296 L170 328 L270 286 L360 330 L470 304 L560 338 L600 316 L600 420 L0 420Z" fill="#0F766E" />
            <path d="M0 384 h600 v36 h-600z" fill="#0D9488" />
            <path d="M60 396q18-7 36 0t36 0M300 404q18-7 36 0t36 0M480 397q18-7 36 0t36 0" stroke="#5EEAD4" stroke-width="3" fill="none" stroke-linecap="round" />
          </svg>
        </div>
      </section>

      <!-- Wat je ermee doet -->
      <section class="border-y border-line bg-surface" :aria-label="$t('landing.pillarsAria')">
        <ol class="mx-auto grid max-w-content grid-cols-1 divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          <li v-for="(p, i) in pillars" :key="p.key" class="py-8 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0">
            <p class="font-display text-sm font-semibold text-accent-700">0{{ i + 1 }}</p>
            <h2 class="title-display mt-2 text-2xl">{{ $t(`landing.pillars.${p.key}.title`) }}</h2>
            <p class="mt-2 text-[15px] leading-relaxed text-body">{{ $t(`landing.pillars.${p.key}.text`) }}</p>
            <ul class="mt-4 flex flex-wrap gap-1.5">
              <li v-for="n in 3" :key="n" class="chip chip-muted">{{ $t(`landing.pillars.${p.key}.tag${n}`) }}</li>
            </ul>
          </li>
        </ol>
      </section>

      <!-- Openbare reizen: lezen kan zonder account -->
      <section v-if="trips.length" id="reizen" class="mx-auto max-w-content scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16">
        <div class="mb-6 max-w-2xl">
          <h2 class="title-display text-[28px] leading-tight sm:text-[34px]">{{ $t('landing.tripsTitle') }}</h2>
          <p class="mt-2 text-[15px] leading-relaxed text-body">{{ $t('landing.tripsText') }}</p>
        </div>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
        </div>
      </section>

      <!-- Afsluiter -->
      <section class="mx-auto max-w-content px-4 pb-14 sm:px-6" :class="trips.length ? '' : 'pt-12'">
        <div class="flex flex-col items-start gap-5 rounded-3xl bg-ink p-7 text-surface sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div class="max-w-xl">
            <h2 class="font-display text-[28px] font-semibold leading-tight tracking-tight">{{ $t('landing.closingTitle') }}</h2>
            <p class="mt-2 text-[15px] leading-relaxed opacity-80">{{ $t('landing.closingText') }}</p>
          </div>
          <RouterLink to="/register" class="btn btn-primary btn-lg shrink-0">{{ $t('landing.cta') }}</RouterLink>
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
import CoverImage from '@/components/ui/CoverImage.vue'
import TripCard from '@/components/TripCard.vue'
import * as tripsApi from '@/api/tripsApi'
import { useConsentStore } from '@/stores/consent'
import { formatDateRange } from '@/utils/date'
import { flagFor } from '@/utils/countries'

const consent = useConsentStore()
const year = new Date().getFullYear()

const pillars = [{ key: 'plan' }, { key: 'together' }, { key: 'remember' }]

// Openbare reizen zijn zonder account op te vragen; lukt dat niet, dan blijft de pagina gewoon staan.
const all = ref([])
const loading = ref(true)
const ranked = computed(() => [...all.value].sort((a, b) => score(b) - score(a)))
/** De populairste reis mét omslagfoto is het beeld bovenaan. */
const featured = computed(() => ranked.value.find((t) => t.coverImageUrl) || null)
const trips = computed(() => ranked.value.slice(0, 6))

function score(trip) {
  return (trip.likeCount || 0) + (trip.bookmarkCount || 0) + (trip.copyCount || 0)
}

onMounted(async () => {
  try {
    all.value = await tripsApi.getAllTrips(24)
  } catch {
    all.value = []
  } finally {
    loading.value = false
  }
})
</script>
