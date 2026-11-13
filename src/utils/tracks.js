import { t } from '@/i18n'
import { escapeHtml } from './html'
import { formatDistance, formatDuration } from './format'

/** Max. bestandsgrootte (zelfde als de server). */
export const MAX_GPX_BYTES = 10 * 1024 * 1024
export const GPX_ACCEPT = '.gpx,application/gpx+xml'

/** Eigen kleur voor tracks, zodat ze los van de (accentkleurige) reisroute te herkennen zijn. */
export const TRACK_COLOR = '#EA580C'

export function isGpxFile(file) {
  return /\.gpx$/i.test(file?.name || '')
}

/** Statistieken als losse stukjes: ["12,4 km", "↗ 640 m", "3 u 25 min"]; onbekende waarden vallen weg. */
export function trackStatParts(track) {
  if (!track) return []
  const parts = [formatDistance(track.distanceMeters)]
  if (track.elevationGainMeters != null) parts.push(t('tracks.stats.elevation', { n: Math.round(track.elevationGainMeters) }))
  if (track.durationSeconds) parts.push(formatDuration(track.durationSeconds))
  return parts
}

export function trackStats(track) {
  return trackStatParts(track).join(' · ')
}

/** Leaflet-popup (HTML) met naam, soort en statistieken; alle gebruikersinhoud ge-escaped. */
export function trackPopupHtml(track) {
  const kind = track.kind === 'Route' ? t('tracks.kind.route') : t('tracks.kind.track')
  return [
    `<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${TRACK_COLOR}">${escapeHtml(kind)}</div>`,
    `<div style="font-weight:800;font-size:14px;color:rgb(var(--c-ink));margin-top:2px">${escapeHtml(track.name)}</div>`,
    `<div style="color:rgb(var(--c-muted));font-size:12px;margin-top:2px">${escapeHtml(trackStats(track))}</div>`,
  ].join('')
}

/** [[lat, lon, ele?], …] → [[lat, lon], …] met alleen geldige punten. */
export function trackLatLngs(track) {
  return (track?.points || [])
    .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map((p) => [p[0], p[1]])
}
