import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/staysApi', () => ({ getStays: vi.fn(), setPricePerNight: vi.fn() }))
vi.mock('@/api/integrationsApi', () => ({ getIntegrationStatus: vi.fn(async () => ({ hotelPrices: true, bookingAffiliateId: 'aff1' })) }))
const toast = { success: vi.fn(), error: vi.fn() }
vi.mock('@/stores/toast', () => ({ useToastStore: () => toast }))

const staysApi = await import('@/api/staysApi')
const { resetIntegrationsForTests } = await import('@/composables/useIntegrations')
const { default: StaysCard } = await import('./StaysCard.vue')

const hotel = { id: 's1', type: 'Accommodation', name: 'Hotel Triglav', address: '4260 Bled, Slovenië', checkInDate: '2099-11-09T00:00:00Z', checkOutDate: '2099-11-12T00:00:00Z', pricePerNight: 100 }
const trip = (overrides = {}) => ({ id: 't1', canEdit: true, baseCurrency: 'EUR', collaborators: [], stops: [hotel], ...overrides })

const stay = (quote) => ({
  stopId: 's1', name: 'Hotel Triglav', address: '4260 Bled, Slovenië', checkInDate: hotel.checkInDate, checkOutDate: hotel.checkOutDate,
  nights: 3, currentPricePerNight: 100, quote,
})
const quote = { provider: 'Travelpayouts', pricePerNight: 120, total: 360, currency: 'EUR', deepLinkUrl: null, fetchedAtUtc: new Date().toISOString() }

const mountCard = (props) => mount(StaysCard, { props, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })

describe('StaysCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIntegrationsForTests()
  })

  it('toont deeplinks en de prijs met "Gebruik in budget"', async () => {
    staysApi.getStays.mockResolvedValue({ currency: 'EUR', adults: 2, stays: [stay(quote)] })
    staysApi.setPricePerNight.mockResolvedValue({ id: 't1' })
    const wrapper = mountCard({ trip: trip() })
    await flushPromises()

    const links = wrapper.findAll('a[target="_blank"]')
    expect(links[0].attributes('href')).toContain('booking.com')
    expect(links[0].attributes('href')).toContain('aid=aff1')
    expect(links[0].attributes('rel')).toBe('noopener noreferrer sponsored')
    expect(links[1].attributes('href')).toContain('google.com/travel/hotels')
    expect(wrapper.text()).toContain('3 nachten')
    expect(wrapper.text()).toContain('/ nacht')

    const use = wrapper.findAll('button').find((b) => b.text().includes('Gebruik in budget'))
    await use.trigger('click')
    await flushPromises()
    expect(staysApi.setPricePerNight).toHaveBeenCalledWith('t1', 's1', 120)
    expect(wrapper.emitted('updated')).toHaveLength(1)
    expect(wrapper.findAll('button').some((b) => b.text().includes('Gebruik in budget'))).toBe(false)
  })

  it('biedt "Gebruik in budget" niet aan voor kijkers of een andere munt', async () => {
    staysApi.getStays.mockResolvedValue({ currency: 'EUR', adults: 2, stays: [stay({ ...quote, currency: 'GBP' })] })
    const wrapper = mountCard({ trip: trip() })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Gebruik in budget')

    staysApi.getStays.mockResolvedValue({ currency: 'EUR', adults: 2, stays: [stay(quote)] })
    const viewer = mountCard({ trip: trip({ canEdit: false }) })
    await flushPromises()
    expect(viewer.text()).toContain('/ nacht')
    expect(viewer.text()).not.toContain('Gebruik in budget')
  })

  it('valt terug op deeplinks uit de reis als de API faalt en toont verblijven zonder data', async () => {
    staysApi.getStays.mockRejectedValue(new Error('down'))
    const wrapper = mountCard({ trip: trip({ stops: [hotel, { id: 's2', type: 'Accommodation', name: 'Camping' }] }) })
    await flushPromises()

    expect(wrapper.find('a[href*="booking.com"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Vul check-in/out in om te zoeken')
  })

  it('is verborgen zonder toekomstige verblijven', async () => {
    staysApi.getStays.mockResolvedValue({ currency: 'EUR', adults: 1, stays: [] })
    const past = { ...hotel, checkInDate: '2001-01-01T00:00:00Z', checkOutDate: '2001-01-03T00:00:00Z' }
    const wrapper = mountCard({ trip: trip({ stops: [past] }) })
    await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
  })
})
