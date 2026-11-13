import { defineStore } from 'pinia'

/** Leest een voorkeur uit localStorage; werkt ook in private vensters waar storage kan falen. */
function read(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // voorkeur geldt dan alleen voor deze sessie
  }
}

const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

/** Zet de klasse `dark` op <html> en past de kleur van de browserbalk aan. */
export function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'system' && !!media?.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B0F14' : '#0F766E')
  return dark
}

/** Weergavevoorkeuren per toestel: thema ('system' | 'light' | 'dark'). */
export const usePreferencesStore = defineStore('preferences', {
  state: () => ({
    theme: read('theme', 'system'),
    isDark: false,
  }),

  actions: {
    init() {
      this.isDark = applyTheme(this.theme)
      media?.addEventListener?.('change', () => {
        if (this.theme === 'system') this.isDark = applyTheme('system')
      })
    },

    setTheme(theme) {
      this.theme = ['light', 'dark'].includes(theme) ? theme : 'system'
      write('theme', this.theme)
      this.isDark = applyTheme(this.theme)
    },

    toggleDark() {
      this.setTheme(this.isDark ? 'light' : 'dark')
    },
  },
})
