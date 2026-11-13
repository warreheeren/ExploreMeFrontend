// Dagboek: stemmingen (dezelfde sleutels als de backend in TripJournalService) en spraakmemo-hulpjes.

export const JOURNAL_MOODS = [
  { key: 'great', emoji: '😍' },
  { key: 'good', emoji: '🙂' },
  { key: 'relaxed', emoji: '😌' },
  { key: 'adventurous', emoji: '🧗' },
  { key: 'tired', emoji: '😴' },
  { key: 'rainy', emoji: '🌧️' },
]

export function moodEmoji(key) {
  return JOURNAL_MOODS.find((m) => m.key === key)?.emoji || ''
}

/** Maximale lengte van een spraakmemo (de backend begrenst ook op 180 s). */
export const MAX_AUDIO_SECONDS = 180
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024

/** Voorkeursvolgorde: Opus in WebM (Chrome/Firefox), dan MP4/AAC (Safari), dan Ogg. */
export const AUDIO_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg']

/** Eerste ondersteunde mime-type, of '' (dan kiest de browser zelf). */
export function pickAudioMimeType(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return ''
  return AUDIO_MIME_CANDIDATES.find((type) => {
    try {
      return isTypeSupported(type)
    } catch {
      return false
    }
  }) || ''
}

/** Bestandsextensie bij een mime-type (voor de bestandsnaam van de upload). */
export function audioExtension(mimeType = '') {
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

/** 75 → "1:15". */
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
