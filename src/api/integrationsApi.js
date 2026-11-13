import http from './http'

// Externe koppelingen (hotelprijzen, events, affiliate-/partner-id's). Bevat nooit API-keys.

/** { hotelPrices, events, bookingAffiliateId, getYourGuidePartnerId, viatorPartnerId } (id's null als ze niet ingesteld zijn) */
export async function getIntegrationStatus() {
  const { data } = await http.get('/integrations/status')
  return data
}
