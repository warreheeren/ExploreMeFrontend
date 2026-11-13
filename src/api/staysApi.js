import http from './http'

// Verblijven checken (fase 3): toekomstige accommodaties met prijsindicatie en "Gebruik in budget".

/**
 * { currency, adults, stays: [{ stopId, name, address, latitude, longitude, checkInDate, checkOutDate, nights,
 *   currentPricePerNight, quote: { provider, pricePerNight, total, currency, deepLinkUrl, fetchedAtUtc } | null }] }
 * `adults` (1–8) is optioneel; standaard het aantal deelnemers van de reis.
 */
export async function getStays(tripId, { adults } = {}) {
  const { data } = await http.get(`/trips/${tripId}/stays`, { params: adults ? { adults } : {} })
  return data
}

/** Zet de prijs per nacht van een accommodatie-stop → bijgewerkte reis (TripDto). */
export async function setPricePerNight(tripId, stopId, pricePerNight) {
  const { data } = await http.put(`/trips/${tripId}/stops/${stopId}/price-per-night`, { pricePerNight })
  return data
}
