import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/flightsApi', () => ({ getStopFlight: vi.fn() }))
vi.mock('@/api/integrationsApi', () => ({ getIntegrationStatus: vi.fn() }))

const flightsApi = await import('@/api/flightsApi')
const integrationsApi = await import('@/api/integrationsApi')
const { resetIntegrationsForTests } = await import('@/composables/useIntegrations')
const { default: FlightStatusCard } = await import('./FlightStatusCard.vue')

const stop = { id: 's1', name: 'Rome', flightNumber: 'KL1234', flightDate: '2026-11-05T00:00:00Z' }

const delayed = {
  flightNumber: 'KL1234',
  flightDate: '2026-11-05T00:00:00Z',
  live: true,
  checkedAtUtc: new Date().toISOString(),
  trackerUrl: 'https://www.flightradar24.com/data/flights/kl1234',
  info: {
    status: 'delayed', airline: 'KLM', fromIata: 'AMS', toIata: 'FCO',
    scheduledDepartureUtc: '2026-11-05T11:00:00Z', estimatedDepartureUtc: '2026-11-05T11:25:00Z',
    scheduledArrivalUtc: '2026-11-05T13:10:00Z', estimatedArrivalUtc: '2026-11-05T13:30:00Z',
    departureTerminal: '2', departureGate: 'D7', arrivalTerminal: '1', arrivalGate: null,
    departureTimeZone: 'Europe/Amsterdam', arrivalTimeZone: 'Europe/Rome',
  },
}

describe('FlightStatusCard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetIntegrationsForTests()
  })

  it('shows status, local times with the scheduled time struck through, gate and tracker link', async () => {
    integrationsApi.getIntegrationStatus.mockResolvedValue({ flightStatus: true })
    flightsApi.getStopFlight.mockResolvedValue(delayed)
    const wrapper = mount(FlightStatusCard, { props: { tripId: 't1', stop } })
    await flushPromises()

    expect(flightsApi.getStopFlight).toHaveBeenCalledWith('t1', 's1')
    const text = wrapper.text()
    expect(text).toContain('Vlucht KL1234')
    expect(text).toContain('AMS → FCO')
    expect(text).toContain('Vertraagd')
    expect(text).toContain('+25 min')
    expect(text).toContain('12:25') // Amsterdam-tijd
    expect(wrapper.find('s').text()).toContain('12:00')
    expect(text).toContain('Gate D7')
    expect(text).not.toContain('jouw tijd')
    expect(wrapper.find('a').attributes('href')).toBe(delayed.trackerUrl)
  })

  it('without a provider only shows the tracker link and makes no call', async () => {
    integrationsApi.getIntegrationStatus.mockResolvedValue({ flightStatus: false })
    const wrapper = mount(FlightStatusCard, { props: { tripId: 't1', stop: { ...stop, flightNumber: 'kl 1234' } } })
    await flushPromises()

    expect(flightsApi.getStopFlight).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Vlucht KL1234')
    expect(wrapper.text()).toContain('Flightradar24')
    expect(wrapper.find('a').attributes('href')).toBe('https://www.flightradar24.com/data/flights/kl1234')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('keeps the tracker link when the request fails', async () => {
    integrationsApi.getIntegrationStatus.mockResolvedValue({ flightStatus: true })
    flightsApi.getStopFlight.mockRejectedValue(new Error('offline'))
    const wrapper = mount(FlightStatusCard, { props: { tripId: 't1', stop } })
    await flushPromises()

    expect(wrapper.find('a').attributes('href')).toContain('flightradar24.com')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
