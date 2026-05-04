// Resolve a (possibly relative) media URL against the API host so that
// `/uploads/...` paths produced before the backend started returning absolute
// URLs still work in production (where frontend and API live on different hosts).
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export function resolveMediaUrl(url) {
  if (!url) return url
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/')) return apiBase + url
  return apiBase + '/' + url
}
