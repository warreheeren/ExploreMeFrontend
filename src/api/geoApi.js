import http from './http'
import { currentLocale } from '@/i18n'

/** Plaatsen zoeken via OpenStreetMap (proxy in de API). near: { lat, lon } geeft voorkeur aan resultaten in de buurt. */
export async function searchPlaces(q, near = null, { signal } = {}) {
  const { data } = await http.get('/geo/search', {
    params: { q, lang: currentLocale(), lat: near?.lat, lon: near?.lon },
    signal,
  })
  return data
}

/** Adres bij een punt op de kaart; null wanneer er niets gevonden wordt. */
export async function reverseGeocode(lat, lon) {
  const res = await http.get('/geo/reverse', { params: { lat, lon, lang: currentLocale() } })
  return res.status === 204 ? null : res.data
}

/** IANA-tijdzone van een plek ({ timezone }, null als onbekend). */
export async function getTimezone(lat, lon) {
  const { data } = await http.get('/geo/timezone', { params: { lat, lon } })
  return data
}

export async function getCurrencies() {
  const { data } = await http.get('/geo/currencies')
  return data
}

export async function getRate(from, to, date = null) {
  const { data } = await http.get('/geo/rate', { params: { from, to, date: date || undefined } })
  return data
}
