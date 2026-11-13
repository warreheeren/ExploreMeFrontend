import { localeTag, t } from '@/i18n'

/** "850 m", "12 km", "1.240 km". */
export function formatDistance(meters) {
  const m = Number(meters) || 0
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  const km = m / 1000
  return t('common.units.km', { n: km.toLocaleString(localeTag(), { maximumFractionDigits: km < 10 ? 1 : 0 }) })
}

/** "8 min", "1 u 25 min", "6 u". */
export function formatDuration(seconds) {
  const totalMinutes = Math.max(1, Math.round((Number(seconds) || 0) / 60))
  if (totalMinutes < 60) return t('common.units.minutes', { n: totalMinutes })
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0 ? t('common.units.hours', { n: h }) : t('common.units.hoursMinutes', { h, m })
}

/** "2,4 MB", "820 kB". */
export function formatFileSize(bytes) {
  const b = Number(bytes) || 0
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} kB`
  return `${(b / 1024 / 1024).toLocaleString(localeTag(), { maximumFractionDigits: 1 })} MB`
}

/** Laat een Blob downloaden onder de gegeven bestandsnaam. */
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
