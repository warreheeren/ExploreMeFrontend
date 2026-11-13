// Kleine helpers voor grafieken in pure SVG (geen grafiekbibliotheek).

/** Tinten van het ene accent (teal) plus grijs, als CSS-kleur die meeschakelt met de donkere modus. */
export const CHART_COLORS = [
  'rgb(var(--c-accent-700))',
  'rgb(var(--c-accent-400))',
  'rgb(var(--c-accent-900))',
  'rgb(var(--c-accent-200))',
  'rgb(var(--c-gray-400))',
  'rgb(var(--c-gray-600))',
]

/**
 * Segmenten voor een donut getekend met <circle> + stroke-dasharray.
 * items: [{ key, value }] — waarden ≤ 0 vallen weg. Geeft per segment het aandeel, de dasharray en de
 * offset (vanaf 12 uur, met de klok mee) voor een cirkel met omtrek `circumference`.
 */
export function donutSegments(items, circumference = 100, gap = 0) {
  const positive = (items || []).filter((i) => Number(i.value) > 0)
  const total = positive.reduce((sum, i) => sum + Number(i.value), 0)
  if (total <= 0) return []

  let offset = 0
  return positive.map((item, index) => {
    const fraction = Number(item.value) / total
    const length = fraction * circumference
    // Een kleine opening tussen segmenten, behalve bij één segment (dan is het een volle ring).
    const visible = positive.length > 1 ? Math.max(0, length - gap) : length
    const segment = {
      ...item,
      fraction,
      percent: Math.round(fraction * 100),
      color: CHART_COLORS[index % CHART_COLORS.length],
      dashArray: `${visible} ${circumference - visible}`,
      dashOffset: -offset,
    }
    offset += length
    return segment
  })
}

/** Breedtes (0–100) voor een horizontale staafgrafiek, relatief t.o.v. de grootste waarde. */
export function barWidths(values) {
  const max = Math.max(0, ...(values || []).map((v) => Number(v) || 0))
  return (values || []).map((v) => (max > 0 ? Math.round(((Number(v) || 0) / max) * 100) : 0))
}
