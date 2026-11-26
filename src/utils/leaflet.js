import L from 'leaflet'
import { escapeHtml } from './html'
import { stopTypeMeta } from './stopTypes'

// Standaard de OSM-tegelserver. Een eigen/commerciële tegeldienst kan via VITE_TILE_URL (+ VITE_TILE_ATTRIBUTION).
export const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/**
 * Mogen tegels vooraf (offline) geladen worden? De OSM-tegelrichtlijn verbiedt prefetchen en offline gebruik
 * van tile.openstreetmap.org uitdrukkelijk; alleen bij een eigen tegeldienst die het toestaat zetten we
 * VITE_TILE_PREFETCH=true. Bekeken tegels worden wel gewoon gecachet (de richtlijn vraagt ≥ 7 dagen).
 */
export const TILE_PREFETCH_ALLOWED = import.meta.env.VITE_TILE_PREFETCH === 'true' && !/tile\.openstreetmap\.org/.test(TILE_URL)

export function addBaseTiles(map) {
  return L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(map)
}

/** Druppelvormige pin in de kleur van het stop-type, optioneel met een nummer. */
export function pinIcon(type, { label = '', selected = false } = {}) {
  const color = stopTypeMeta(type).color
  const w = selected ? 34 : 28
  const h = selected ? 44 : 36
  const inner = label !== '' && label != null
    ? `<text x="14" y="17" text-anchor="middle" font-size="10" font-weight="800" fill="${color}" font-family="Montserrat Variable, system-ui, sans-serif">${escapeHtml(String(label))}</text>`
    : `<circle cx="14" cy="13.5" r="3" fill="${color}"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 28 36"><path d="M14 1C6.8 1 1 6.8 1 14c0 9.6 13 21 13 21s13-11.4 13-21C27 6.8 21.2 1 14 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="7.5" fill="#fff"/>${inner}</svg>`
  return L.divIcon({
    html: svg,
    className: 'stop-pin',
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  })
}

/** Popup-inhoud voor een stop; alle gebruikersinvoer wordt ge-escaped. */
export function stopPopupHtml(stop) {
  const meta = stopTypeMeta(stop.type)
  const parts = [
    `<div style="min-width:180px;max-width:240px">`,
    `<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${meta.color}">${escapeHtml(meta.singular)}</div>`,
    `<div style="font-weight:800;font-size:14px;color:rgb(var(--c-ink));margin-top:2px">${escapeHtml(stop.name)}</div>`,
  ]
  if (stop.address) parts.push(`<div style="color:rgb(var(--c-muted));font-size:12px;margin-top:2px">${escapeHtml(stop.address)}</div>`)
  if (stop.description) parts.push(`<div style="color:rgb(var(--c-body));font-size:12px;margin-top:6px">${escapeHtml(stop.description)}</div>`)
  parts.push('</div>')
  return parts.join('')
}

/** Herberekent de kaartgrootte zodra de container zichtbaar wordt of van maat verandert. */
export function observeMapSize(map, container) {
  if (typeof ResizeObserver === 'undefined' || !container) {
    setTimeout(() => map?.invalidateSize(), 150)
    return () => {}
  }
  const ro = new ResizeObserver(() => map?.invalidateSize())
  ro.observe(container)
  return () => ro.disconnect()
}
