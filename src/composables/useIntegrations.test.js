import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/integrationsApi', () => ({
  getIntegrationStatus: vi.fn(),
}))

import { getIntegrationStatus } from '@/api/integrationsApi'
import { resetIntegrationsForTests, useIntegrations } from './useIntegrations'

describe('useIntegrations', () => {
  beforeEach(() => {
    resetIntegrationsForTests()
    getIntegrationStatus.mockReset()
  })

  it('haalt de status één keer per sessie op', async () => {
    getIntegrationStatus.mockResolvedValue({ hotelPrices: true, events: false, bookingAffiliateId: '123' })
    const { status, loaded, load } = useIntegrations()

    await Promise.all([load(), load()])
    await load()

    expect(getIntegrationStatus).toHaveBeenCalledTimes(1)
    expect(loaded.value).toBe(true)
    expect(status.value).toMatchObject({
      hotelPrices: true,
      events: false,
      bookingAffiliateId: '123',
      getYourGuidePartnerId: null,
      viatorPartnerId: null,
      // Velden die de server niet stuurt, blijven uit.
      flightStatus: false,
      videoUploads: false,
      airaloPartnerId: null,
    })
  })

  it('laat alles uit als de status niet geladen kan worden', async () => {
    getIntegrationStatus.mockRejectedValue(new Error('offline'))
    const { status, loaded, load } = useIntegrations()

    await load()

    expect(loaded.value).toBe(false)
    expect(status.value.hotelPrices).toBe(false)
    expect(status.value.events).toBe(false)
  })
})
