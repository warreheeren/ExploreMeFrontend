import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({ useRouter: () => ({ isReady: () => Promise.resolve() }) }))

const { default: ConsentBanner } = await import('./ConsentBanner.vue')
const { useConsentStore } = await import('@/stores/consent')
const { CONSENT_STORAGE_KEY } = await import('@/utils/consent')

function mountBanner(props = {}) {
  return mount(ConsentBanner, {
    props,
    attachTo: document.body,
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, teleport: true } },
  })
}

describe('ConsentBanner', () => {
  beforeEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY)
    setActivePinia(createPinia())
    document.body.innerHTML = ''
  })

  it('shows an accessible, focused banner until a choice is made', async () => {
    const wrapper = mountBanner()
    await flushPromises()

    const banner = wrapper.find('section[role="dialog"]')
    expect(banner.exists()).toBe(true)
    expect(banner.attributes('aria-labelledby')).toBe('consent-banner-title')
    expect(banner.attributes('aria-describedby')).toBe('consent-banner-text')
    expect(document.activeElement).toBe(banner.element)

    const [reject] = banner.findAll('button')
    await reject.trigger('click')
    expect(wrapper.find('section[role="dialog"]').exists()).toBe(false)
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY))).toMatchObject({ functional: false, analytics: false })
    wrapper.unmount()
  })

  it('accepts everything with the second button and sits above the tab bar on mobile', async () => {
    const wrapper = mountBanner({ aboveTabBar: true })
    await flushPromises()
    expect(wrapper.find('section').classes().join(' ')).toContain('bottom-[calc(4rem+env(safe-area-inset-bottom))]')

    await wrapper.findAll('section button')[1].trigger('click')
    expect(useConsentStore().has('functional')).toBe(true)
    wrapper.unmount()
  })

  it('stays hidden when a choice already exists', async () => {
    useConsentStore().rejectAll()
    const wrapper = mountBanner()
    await flushPromises()
    expect(wrapper.find('section[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens the settings dialog and saves the toggled categories', async () => {
    const wrapper = mountBanner()
    await flushPromises()
    await wrapper.findAll('section button')[2].trigger('click')
    expect(useConsentStore().settingsOpen).toBe(true)

    const switches = wrapper.findAll('[role="switch"]')
    // Functioneel aanzetten; statistieken zijn zonder provider vergrendeld.
    expect(switches).toHaveLength(2)
    expect(switches[1].attributes('disabled')).toBeDefined()
    await switches[0].trigger('click')
    const save = wrapper.findAll('[role="dialog"][aria-modal="true"] button').at(-1)
    await save.trigger('click')

    const consent = useConsentStore()
    expect(consent.settingsOpen).toBe(false)
    expect(consent.has('functional')).toBe(true)
    expect(consent.has('analytics')).toBe(false)
    expect(wrapper.find('section[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
