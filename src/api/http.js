import axios from 'axios'
import { resolveMediaUrl } from '@/utils/media'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL + 'api'
})

// Resolve relative `/uploads/...` URLs in any response payload so the frontend
// always loads media from the API host (matters in production where the
// frontend lives on a different origin than the backend).
const MEDIA_KEYS = new Set([
  'profilePhotoUrl',
  'profileImgUrl',
  'otherProfilePhotoUrl',
  'senderProfilePhotoUrl',
  'actorProfilePhotoUrl',
  'imageUrl',
  'coverImageUrl',
  'photoUrl',
  'url'
])

function fixMediaUrls(node) {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) fixMediaUrls(node[i])
    return node
  }
  for (const key of Object.keys(node)) {
    const value = node[key]
    if (typeof value === 'string' && MEDIA_KEYS.has(key)) {
      node[key] = resolveMediaUrl(value)
    } else if (key === 'imageUrls' && Array.isArray(value)) {
      node[key] = value.map(v => typeof v === 'string' ? resolveMediaUrl(v) : v)
    } else if (value && typeof value === 'object') {
      fixMediaUrls(value)
    }
  }
  return node
}

// Token automatisch toevoegen aan elke request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Bij 401 automatisch uitloggen + relatieve media-URLs absoluut maken
http.interceptors.response.use(
  (response) => {
    fixMediaUrls(response.data)
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userName')
      localStorage.removeItem('displayName')
      localStorage.removeItem('profilePhotoUrl')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default http
