import { createI18n } from 'vue-i18n'

// Vertalingen per onderdeel: src/i18n/locales/{nl,en}/<onderdeel>.js → $t('<onderdeel>.<sleutel>').
const modules = import.meta.glob('./locales/*/*.js', { eager: true })

export const SUPPORTED_LOCALES = ['nl', 'en']

function buildMessages() {
  const messages = { nl: {}, en: {} }
  for (const [path, mod] of Object.entries(modules)) {
    const match = path.match(/\.\/locales\/(\w+)\/([\w-]+)\.js$/)
    if (!match) continue
    const [, lang, area] = match
    messages[lang] ??= {}
    messages[lang][area] = mod.default
  }
  return messages
}

function initialLocale() {
  try {
    const stored = localStorage.getItem('locale')
    if (SUPPORTED_LOCALES.includes(stored)) return stored
  } catch {
    // geen storage beschikbaar
  }
  const browser = (typeof navigator !== 'undefined' && navigator.language) || 'nl'
  return browser.toLowerCase().startsWith('en') ? 'en' : 'nl'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale(),
  fallbackLocale: 'nl',
  messages: buildMessages(),
  missingWarn: false,
  fallbackWarn: false,
})

/** Vertaalfunctie voor gebruik buiten componenten (utils, stores). */
export const t = (...args) => i18n.global.t(...args)

export function currentLocale() {
  return i18n.global.locale.value
}

/** BCP-47-tag voor Intl/toLocale*-functies. */
export function localeTag() {
  return currentLocale() === 'en' ? 'en-GB' : 'nl-NL'
}

export function setLocale(locale) {
  const next = SUPPORTED_LOCALES.includes(locale) ? locale : 'nl'
  i18n.global.locale.value = next
  document.documentElement.lang = next
  try {
    localStorage.setItem('locale', next)
  } catch {
    // alleen voor deze sessie
  }
  return next
}

document.documentElement.lang = currentLocale()
