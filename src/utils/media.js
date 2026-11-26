// Maakt een (mogelijk relatieve) media-URL absoluut t.o.v. de API-host, zodat `/uploads/...`
// ook werkt wanneer frontend en API op verschillende domeinen draaien (en in de native app, zie services/native.js).
import { resolveApiRoot } from '@/services/native'

const apiBase = resolveApiRoot()

export function resolveMediaUrl(url) {
  if (!url) return url
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/')) return apiBase + url
  return apiBase + '/' + url
}

/**
 * Kleine versie (± 640 px) van een foto voor lijsten en rasters:
 * - eigen uploads: /uploads/x.jpg → /uploads/thumb/x.jpg (de API maakt de thumbnail op aanvraag);
 * - Unsplash: breedte via de URL-parameters;
 * - overige URL's blijven ongewijzigd.
 */
export function thumbUrl(url, width = 640) {
  if (!url) return url
  // De handtekening in de querystring (?exp=…&sig=…) blijft staan: origineel en thumbnail delen dezelfde.
  const upload = url.match(/^(.*\/uploads\/)(?!thumb\/)([^/?#]+)(\?[^#]*)?$/)
  if (upload) return `${upload[1]}thumb/${upload[2]}${upload[3] || ''}`
  if (/^https:\/\/images\.unsplash\.com\//.test(url)) {
    try {
      const u = new URL(url)
      u.searchParams.set('w', String(width))
      u.searchParams.set('q', '70')
      u.searchParams.set('auto', 'format')
      return u.toString()
    } catch {
      return url
    }
  }
  return url
}
