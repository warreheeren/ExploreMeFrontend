// Datumprikker: kalenderopbouw en scores per dag. Dagen zijn 'YYYY-MM-DD'-sleutels (UTC-kalenderdatums).

const DAY_MS = 86400000

export const AVAILABILITIES = ['Yes', 'Maybe', 'No']
const POINTS = { Yes: 2, Maybe: 1, No: 0 }

export function dayKey(value) {
  return String(value).slice(0, 10)
}

function keyToUtc(key) {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function utcToKey(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDaysToKey(key, days) {
  return utcToKey(keyToUtc(key) + days * DAY_MS)
}

/** Tikvolgorde: geen stem → ✓ → ? → ✗ → geen stem. */
export function nextAvailability(current) {
  if (!current) return 'Yes'
  const i = AVAILABILITIES.indexOf(current)
  return i === AVAILABILITIES.length - 1 ? null : AVAILABILITIES[i + 1]
}

/**
 * Maandrasters (maandag eerst) die het bereik afdekken. Elke cel is null (opvulling) of
 * { key, day, inRange }.
 */
export function buildMonths(rangeStart, rangeEnd) {
  const start = keyToUtc(dayKey(rangeStart))
  const end = keyToUtc(dayKey(rangeEnd))
  if (!(end >= start)) return []

  const months = []
  const first = new Date(start)
  let y = first.getUTCFullYear()
  let m = first.getUTCMonth()
  const last = new Date(end)
  while (y < last.getUTCFullYear() || (y === last.getUTCFullYear() && m <= last.getUTCMonth())) {
    const firstOfMonth = Date.UTC(y, m, 1)
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    const lead = (new Date(firstOfMonth).getUTCDay() + 6) % 7
    const cells = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= daysInMonth; d++) {
      const ms = Date.UTC(y, m, d)
      cells.push({ key: utcToKey(ms), day: d, inRange: ms >= start && ms <= end })
    }
    months.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, year: y, month: m, cells })
    m += 1
    if (m === 12) { m = 0; y += 1 }
  }
  return months
}

/** Per dag: aantallen ✓ / ? / ✗ en een score 0..1 (som van de punten / maximum). */
export function dayStats(participants) {
  const stats = {}
  const max = Math.max(1, (participants?.length || 0) * 2)
  for (const p of participants || []) {
    for (const [key, availability] of Object.entries(p.days || {})) {
      const s = (stats[key] ??= { yes: 0, maybe: 0, no: 0, points: 0, ratio: 0 })
      if (availability === 'Yes') s.yes += 1
      else if (availability === 'Maybe') s.maybe += 1
      else s.no += 1
      s.points += POINTS[availability] ?? 0
    }
  }
  for (const s of Object.values(stats)) s.ratio = s.points / max
  return stats
}

/** Stemmen in het formaat van de API (UTC-middernacht). */
export function toVotePayload(days) {
  return Object.entries(days)
    .filter(([, a]) => AVAILABILITIES.includes(a))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, availability]) => ({ date: `${key}T00:00:00.000Z`, availability }))
}
