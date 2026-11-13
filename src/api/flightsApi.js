import http from './http'

// Vluchtstatus van een stop met een vluchtnummer (aankomst per vliegtuig).

/**
 * { flightNumber, flightDate, live, checkedAtUtc, trackerUrl, info: null | { status, airline, fromIata, toIata,
 *   scheduledDepartureUtc, estimatedDepartureUtc, scheduledArrivalUtc, estimatedArrivalUtc, departureTerminal,
 *   departureGate, arrivalTerminal, arrivalGate, departureTimeZone, arrivalTimeZone } }
 * status: scheduled | delayed | boarding | departed | landed | cancelled | diverted | unknown
 */
export async function getStopFlight(tripId, stopId) {
  const { data } = await http.get(`/trips/${tripId}/stops/${stopId}/flight`)
  return data
}
