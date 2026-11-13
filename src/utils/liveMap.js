// Leaflet-markers voor "live" posities van reisgenoten (uit stories met locatie).
import L from 'leaflet'
import { escapeHtml } from './html'
import { thumbUrl } from './media'
import { timeAgo } from './date'
import { t } from '@/i18n'

/** Initialen zoals de Avatar-component ze toont. */
export function initialsFor(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/** Ronde avatar met een pulserende ring (stijl `.live-pin` in style.css). */
export function liveLocationIcon(location) {
  const size = 40
  const inner = location.profilePhotoUrl
    ? `<img src="${escapeHtml(thumbUrl(location.profilePhotoUrl, 120))}" alt="" />`
    : `<span>${escapeHtml(initialsFor(location.displayName))}</span>`
  return L.divIcon({
    html: `<span class="live-pin-pulse"></span><span class="live-pin-avatar">${inner}</span>`,
    className: 'live-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

/** Popup met naam, plaats en hoe lang geleden; alle gebruikersinvoer ge-escaped. */
export function livePopupHtml(location) {
  const place = location.placeName ? ` · ${escapeHtml(location.placeName)}` : ''
  return `<div style="min-width:160px">`
    + `<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgb(var(--c-accent-700))">${escapeHtml(t('stories.liveLabel'))}</div>`
    + `<div style="font-weight:800;font-size:14px;color:rgb(var(--c-ink));margin-top:2px">${escapeHtml(location.displayName)}</div>`
    + `<div style="color:rgb(var(--c-muted));font-size:12px;margin-top:2px">${escapeHtml(timeAgo(location.createdAtUtc))}${place}</div>`
    + `</div>`
}
