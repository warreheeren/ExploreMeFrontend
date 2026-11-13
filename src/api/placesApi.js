import http from './http'
import { Post } from '@/models'

/** Plekpagina op basis van een stop-id. */
export async function getPlace(stopId) {
  const { data } = await http.get(`/places/${stopId}`)
  return { ...data, posts: Post.fromApiList(data.posts) }
}

/**
 * Wikipedia/Wikivoyage-samenvatting van de plek (taal via Accept-Language, fallback Engels).
 * Geeft null als er niets passends is (204).
 */
export async function getPlaceSummary(stopId) {
  const { data, status } = await http.get(`/places/${stopId}/summary`)
  return status === 204 || !data ? null : data
}
