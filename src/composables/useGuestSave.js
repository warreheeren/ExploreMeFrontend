import { reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'

// "Bewaar je reis": een gast (meegedaan via een uitnodigingslink) maakt van zijn gastaccount een echt account.
// Eén gedeelde dialoog (GuestSaveDialog in App.vue); elk onderdeel van de app kan hem openen.

/** Momenten waarop de dialoog zich vanzelf aanbiedt — elk hoogstens één keer per toestel. */
export const GUEST_NUDGE_MOMENTS = ['firstExpense', 'owedMoney', 'tripEnded']

const state = reactive({ open: false, moment: null })

export function useGuestSave() {
  return state
}

/** Opent de dialoog op verzoek van de gebruiker (menu, banner). */
export function openGuestSave(moment = null) {
  state.moment = moment
  state.open = true
}

function seen(moment) {
  try {
    return localStorage.getItem(`guestNudge:${moment}`) === '1'
  } catch {
    return true   // zonder storage zou de dialoog bij elke actie terugkomen
  }
}

/**
 * Biedt de dialoog aan op een moment waarop er iets op het spel staat (eerste uitgave, geld tegoed, reis voorbij).
 * Doet niets voor gewone accounts, als dit moment al eens getoond is of als de dialoog al open staat.
 */
export function nudgeGuestSave(moment) {
  if (!useAuthStore().isGuest || state.open || seen(moment)) return false
  try {
    localStorage.setItem(`guestNudge:${moment}`, '1')
  } catch {
    // geen storage
  }
  openGuestSave(moment)
  return true
}
