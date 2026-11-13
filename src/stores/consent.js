import { defineStore } from 'pinia'
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, createConsent, readConsent, writeConsent } from '@/utils/consent'

export { CONSENT_VERSION }

function initialState() {
  const stored = readConsent()
  return {
    version: stored?.version ?? null,
    decidedAt: stored?.decidedAt ?? null,
    functional: stored?.functional ?? false,
    analytics: stored?.analytics ?? false,
    /** Instellingenvenster open (banner, footer-link of Instellingen → Privacy). */
    settingsOpen: false,
  }
}

/**
 * Toestemming per categorie: `necessary` (altijd), `functional` (externe inhoud zoals het Google-script,
 * Wikipedia-foto's, eventafbeeldingen) en `analytics` (Plausible/Umami, alleen als geconfigureerd).
 * Bewaard in localStorage (`consent.v1`) met versie en datum; een nieuwe CONSENT_VERSION vraagt opnieuw.
 */
export const useConsentStore = defineStore('consent', {
  state: initialState,

  getters: {
    /** Er is een geldige keuze voor de huidige versie (anders toont de app de banner). */
    decided: (state) => state.version === CONSENT_VERSION && !!state.decidedAt,
    /** `consent.has('functional')`; zonder keuze telt alleen `necessary`. */
    has: (state) => (category) => {
      if (category === 'necessary') return true
      if (state.version !== CONSENT_VERSION) return false
      if (category === 'functional') return state.functional
      if (category === 'analytics') return state.analytics
      return false
    },
  },

  actions: {
    /** Bewaart een volledige keuze (beide optionele categorieën). */
    save({ functional = this.functional, analytics = this.analytics } = {}) {
      const record = createConsent({ functional, analytics })
      this.$patch({ ...record })
      writeConsent(record)
    },

    acceptAll() {
      this.save({ functional: true, analytics: true })
    },

    rejectAll() {
      this.save({ functional: false, analytics: false })
    },

    /**
     * Eén categorie aanzetten vanuit een inline knop ("Google laden", "Afbeelding laden").
     * Zonder eerdere keuze blijft de rest uit: dat is ook een geldige keuze, de banner verdwijnt dan.
     */
    grant(category) {
      if (category !== 'functional' && category !== 'analytics') return
      const current = this.decided ? { functional: this.functional, analytics: this.analytics } : { functional: false, analytics: false }
      this.save({ ...current, [category]: true })
    },

    openSettings() {
      this.settingsOpen = true
    },

    closeSettings() {
      this.settingsOpen = false
    },

    /** Opnieuw inlezen (bv. na een wijziging in een ander tabblad). */
    reload() {
      const { settingsOpen } = this
      this.$patch({ ...initialState(), settingsOpen })
    },

    /** Volgt keuzes uit andere tabbladen; geeft een functie terug om te stoppen. */
    syncAcrossTabs() {
      if (typeof window === 'undefined') return () => {}
      const onStorage = (e) => {
        if (e.key === CONSENT_STORAGE_KEY || e.key === null) this.reload()
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },
  },
})
