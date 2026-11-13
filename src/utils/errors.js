import { t } from '@/i18n'

/** Haalt een leesbare foutmelding uit een axios-fout (servermeldingen ongewijzigd, anders vertaalde fallback). */
export function errorMessage(err, fallback) {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim() && data.length < 300) return data
  if (data?.message) return data.message
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0]
    if (first) return String(first)
  }
  if (data?.title && err?.response?.status !== 500) return data.title
  if (err?.message === 'Network Error') return t('errors.network')
  return fallback ?? t('errors.generic')
}
