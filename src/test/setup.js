// Testomgeving: Nederlands als taal (zoals de standaard voor gebruikers) en vue-i18n beschikbaar in componenten.
localStorage.setItem('locale', 'nl')

const { config } = await import('@vue/test-utils')
const { i18n } = await import('@/i18n')
config.global.plugins = [...(config.global.plugins || []), i18n]
