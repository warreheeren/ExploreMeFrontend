import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/calendarSyncApi', () => ({
  getCalendarSyncStatus: vi.fn(),
  connectCalendar: vi.fn(),
  syncCalendarNow: vi.fn(),
  disconnectCalendar: vi.fn(),
}))
const integrationStatus = { calendarGoogle: true, calendarMicrosoft: true }
vi.mock('@/api/integrationsApi', () => ({ getIntegrationStatus: vi.fn(async () => integrationStatus) }))
const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('@/stores/toast', () => ({ useToastStore: () => toast }))
const route = { query: {}, hash: '' }
const router = { replace: vi.fn() }
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }))

const api = await import('@/api/calendarSyncApi')
const { resetIntegrationsForTests } = await import('@/composables/useIntegrations')
const { default: CalendarSyncCard } = await import('./CalendarSyncCard.vue')

// Modal teleporteert; hier gewoon inline renderen zodra hij open is.
const ModalStub = {
  props: ['modelValue', 'title'],
  template: '<div v-if="modelValue" class="modal-stub"><p class="modal-title">{{ title }}</p><slot /><slot name="footer" /></div>',
}
const mountCard = () => mount(CalendarSyncCard, { global: { stubs: { Modal: ModalStub } } })
const button = (wrapper, text) => wrapper.findAll('button').find((b) => b.text().includes(text))

const google = (overrides = {}) => ({
  provider: 'google', connected: true, accountEmail: 'anna@example.com', connectedAtUtc: '2026-10-01T10:00:00Z',
  lastSyncedAtUtc: new Date().toISOString(), error: null, pending: false, ...overrides,
})
const outlook = { provider: 'microsoft', connected: false, accountEmail: null, connectedAtUtc: null, lastSyncedAtUtc: null, error: null, pending: false }

describe('CalendarSyncCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIntegrationsForTests()
    Object.assign(integrationStatus, { calendarGoogle: true, calendarMicrosoft: true })
    route.query = {}
    route.hash = ''
  })

  it('is verborgen zonder geconfigureerde providers', async () => {
    Object.assign(integrationStatus, { calendarGoogle: false, calendarMicrosoft: false })
    const wrapper = mountCard()
    await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
    expect(api.getCalendarSyncStatus).not.toHaveBeenCalled()
  })

  it('toont de status en koppelt via de auth-URL', async () => {
    api.getCalendarSyncStatus.mockResolvedValue([google(), outlook])
    api.connectCalendar.mockResolvedValue('https://login.example/authorize')
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const wrapper = mountCard()
    await flushPromises()

    expect(wrapper.text()).toContain('Gekoppeld met anna@example.com')
    expect(wrapper.text()).toContain('Nu synchroniseren')
    await button(wrapper, 'Koppel Outlook').trigger('click')
    await flushPromises()
    expect(api.connectCalendar).toHaveBeenCalledWith('microsoft')
    expect(assign).toHaveBeenCalledWith('https://login.example/authorize')
    vi.unstubAllGlobals()
  })

  it('vraagt om opnieuw te koppelen bij een reauth-fout', async () => {
    api.getCalendarSyncStatus.mockResolvedValue([google({ error: 'reauth' })])
    const wrapper = mountCard()
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(button(wrapper, 'Opnieuw koppelen')).toBeTruthy()
    expect(button(wrapper, 'Nu synchroniseren')).toBeUndefined()
  })

  it('synchroniseert nu en werkt de status bij', async () => {
    api.getCalendarSyncStatus.mockResolvedValue([google({ pending: true })])
    api.syncCalendarNow.mockResolvedValue(google({ pending: false }))
    const wrapper = mountCard()
    await flushPromises()
    expect(wrapper.text()).toContain('Wijzigingen worden zo gesynchroniseerd.')

    await button(wrapper, 'Nu synchroniseren').trigger('click')
    await flushPromises()
    expect(api.syncCalendarNow).toHaveBeenCalledWith('google')
    expect(toast.success).toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Wijzigingen worden zo gesynchroniseerd.')
  })

  it('ontkoppelt met de keuze om events te verwijderen', async () => {
    api.getCalendarSyncStatus.mockResolvedValue([google()])
    api.disconnectCalendar.mockResolvedValue()
    const wrapper = mountCard()
    await flushPromises()

    await button(wrapper, 'Ontkoppelen').trigger('click')
    expect(wrapper.find('.modal-title').text()).toContain('Google Agenda')
    await wrapper.find('.modal-stub input[type="checkbox"]').setValue(true)
    await wrapper.findAll('.modal-stub button').find((b) => b.text().includes('Ontkoppelen')).trigger('click')
    await flushPromises()

    expect(api.disconnectCalendar).toHaveBeenCalledWith('google', true)
    expect(wrapper.text()).toContain('Koppel Google Agenda')
  })

  it('meldt het resultaat van de OAuth-terugkeer en ruimt de query op', async () => {
    route.query = { tab: 'account', calendar: 'error' }
    route.hash = '#calendar'
    api.getCalendarSyncStatus.mockResolvedValue([google()])
    mountCard()
    await flushPromises()

    expect(toast.error).toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledWith({ query: { tab: 'account' }, hash: '#calendar' })
  })
})
