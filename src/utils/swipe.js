// Veeg-logica voor de "in de buurt"-kaarten en de lightbox, plus de lijst overgeslagen plekken.

/** Minimale horizontale afstand (px) voor een veeg. */
export const SWIPE_THRESHOLD = 90
const MAX_ROTATION_DEG = 15
const MAX_SKIPPED = 500

/** 'left' | 'right' | null: alleen een overwegend horizontale beweging voorbij de drempel telt. */
export function swipeDirection(dx, dy = 0, threshold = SWIPE_THRESHOLD) {
  if (!Number.isFinite(dx) || Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return null
  return dx > 0 ? 'right' : 'left'
}

/** CSS-transform voor een kaart die gesleept wordt (lichte kanteling in de veegrichting). */
export function dragTransform(dx = 0, dy = 0) {
  const rotation = Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, dx / 20))
  return `translate(${Math.round(dx)}px, ${Math.round(dy * 0.3)}px) rotate(${rotation.toFixed(1)}deg)`
}

/** 0–1: hoe dicht de sleepbeweging bij een veeg is (voor de "bewaar"/"sla over"-hint). */
export function swipeProgress(dx, threshold = SWIPE_THRESHOLD) {
  return Math.min(1, Math.abs(dx || 0) / threshold)
}

/** Overgeslagen stop-ids uit localStorage; leeg wanneer storage niet beschikbaar of corrupt is. */
export function loadSkipped(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** Bewaart de lijst (alleen de nieuwste {@link MAX_SKIPPED}); fouten (privévenster, vol) worden genegeerd. */
export function saveSkipped(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(-MAX_SKIPPED)))
  } catch {
    // Alleen voor deze sessie onthouden.
  }
}
