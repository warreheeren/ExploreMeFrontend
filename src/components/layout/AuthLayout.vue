<template>
  <div class="min-h-screen bg-ground lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <aside class="relative hidden flex-col justify-between overflow-hidden bg-[#115E59] p-10 text-white lg:flex">
      <RouterLink to="/" aria-label="ExploreMe"><Logo inverted /></RouterLink>

      <div class="relative z-10 max-w-md">
        <p class="eyebrow mb-3 text-[#99F6E4]">{{ $t('auth.layout.eyebrow') }}</p>
        <h2 class="font-display text-[42px] font-semibold leading-[1.08] tracking-tight text-balance">{{ $t('auth.layout.headline') }}</h2>
        <p class="mt-4 text-[15px] leading-relaxed text-white/80">{{ $t('auth.layout.intro') }}</p>
      </div>

      <!-- Vlakke landschapsillustratie -->
      <svg viewBox="0 0 600 220" class="pointer-events-none absolute inset-x-0 bottom-0 w-full" aria-hidden="true">
        <circle cx="470" cy="70" r="34" fill="#F3D27A" />
        <path d="M0 150 L90 96 L170 132 L260 70 L360 136 L450 98 L540 124 L600 100 L600 220 L0 220Z" fill="#134E4A" />
        <path d="M0 178 L80 146 L170 170 L270 138 L360 172 L470 152 L560 178 L600 160 L600 220 L0 220Z" fill="#0F766E" />
        <path d="M0 200 h600 v20 h-600z" fill="#0D9488" />
        <path d="M60 206q18-7 36 0t36 0M300 212q18-7 36 0t36 0M480 207q18-7 36 0t36 0" stroke="#5EEAD4" stroke-width="3" fill="none" stroke-linecap="round" />
      </svg>

      <p class="relative z-10 text-xs font-semibold text-white/70">© {{ year }} ExploreMe</p>
    </aside>

    <main class="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div class="w-full max-w-sm">
        <RouterLink to="/" class="mb-8 inline-block lg:hidden" aria-label="ExploreMe"><Logo /></RouterLink>
        <slot />
        <nav class="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold text-muted" :aria-label="$t('nav.footer')">
          <RouterLink to="/privacy" class="hover:text-ink">{{ $t('legal.footer.privacy') }}</RouterLink>
          <RouterLink to="/terms" class="hover:text-ink">{{ $t('legal.footer.terms') }}</RouterLink>
          <RouterLink to="/cookies" class="hover:text-ink">{{ $t('legal.footer.cookies') }}</RouterLink>
          <!-- Het venster zelf hangt aan de ConsentBanner in App.vue (die ook op auth-pagina's staat). -->
          <button type="button" class="font-semibold hover:text-ink" @click="consent.openSettings()">{{ $t('legal.footer.cookieSettings') }}</button>
        </nav>
      </div>
    </main>
  </div>
</template>

<script setup>
import Logo from '../ui/Logo.vue'
import { useConsentStore } from '@/stores/consent'

const consent = useConsentStore()

const year = new Date().getFullYear()
</script>
