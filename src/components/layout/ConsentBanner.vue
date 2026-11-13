<template>
  <!-- Niet-blokkerend: de pagina blijft bruikbaar; geen keuze = alleen noodzakelijke opslag. -->
  <section
    v-if="visible"
    ref="bannerRef"
    role="dialog"
    aria-modal="false"
    aria-labelledby="consent-banner-title"
    aria-describedby="consent-banner-text"
    tabindex="-1"
    class="consent-banner group fixed inset-x-0 z-[90] px-4 pb-3 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:px-6 md:bottom-0 md:pb-6"
    :class="aboveTabBar ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))]' : 'bottom-0 safe-bottom'"
  >
    <!-- De focusring hoort rond de kaart, niet rond de volle breedte van de (transparante) wrapper. -->
    <div class="mx-auto flex max-w-content flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-pop group-focus-visible:ring-2 group-focus-visible:ring-accent-500 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
      <div class="min-w-0 flex-1">
        <h2 id="consent-banner-title" class="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Icon name="shield" :size="16" class="shrink-0 text-accent-700" /> {{ $t('consent.banner.title') }}
        </h2>
        <p id="consent-banner-text" class="mt-1 text-sm leading-relaxed text-body">
          {{ $t('consent.banner.text') }}
          <RouterLink to="/cookies" class="link whitespace-nowrap">{{ $t('consent.banner.more') }}</RouterLink>
        </p>
      </div>
      <!-- Telefoon: weigeren/accepteren naast elkaar, instellingen eronder; vanaf sm alles op één rij (DOM = leesvolgorde). -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <!-- Weigeren en accepteren even zichtbaar (geen dark pattern). -->
        <div class="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" class="btn btn-dark btn-sm" @click="decide('reject')">{{ $t('consent.banner.rejectAll') }}</button>
          <button type="button" class="btn btn-dark btn-sm" @click="decide('accept')">{{ $t('consent.banner.acceptAll') }}</button>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" @click="consent.openSettings()">{{ $t('consent.banner.settings') }}</button>
      </div>
    </div>
  </section>

  <ConsentSettingsDialog />
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import ConsentSettingsDialog from './ConsentSettingsDialog.vue'
import { useConsentStore } from '@/stores/consent'

defineProps({
  /** Mobiel met de onderste tabbalk: de banner schuift erboven in plaats van eroverheen. */
  aboveTabBar: { type: Boolean, default: false },
})

const consent = useConsentStore()
const router = useRouter()
const bannerRef = ref(null)

// Pas na de eerste navigatie tonen: dan is de layout bekend (geen flits op embed/print-pagina's).
const ready = ref(false)
router.isReady().then(() => { ready.value = true }).catch(() => { ready.value = true })

const visible = computed(() => ready.value && !consent.decided)

/** Element dat de focus had voordat de banner verscheen; krijgt hem terug na de keuze. */
let previousFocus = null

watch(visible, async (show) => {
  if (show) {
    previousFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    await nextTick()
    // Focus op de banner zelf: schermlezers lezen titel + tekst, Tab gaat daarna naar de knoppen.
    bannerRef.value?.focus({ preventScroll: true })
  } else if (bannerRef.value === null) {
    const target = previousFocus?.isConnected ? previousFocus : document.getElementById('main')
    previousFocus = null
    if (target && !consent.settingsOpen) {
      if (!target.hasAttribute('tabindex') && target.id === 'main') target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
  }
}, { flush: 'post' })

function decide(kind) {
  if (kind === 'accept') consent.acceptAll()
  else consent.rejectAll()
}
</script>

<style scoped>
@media print {
  .consent-banner {
    display: none;
  }
}
</style>
