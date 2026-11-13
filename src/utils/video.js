// Video in posts en stories: client-side controles vóór de upload (de server controleert alles opnieuw op inhoud)
// en de afspeelduur van stories.

/** Wat de file-picker toont; de server herkent mp4/mov/webm aan de inhoud. */
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm'
const VIDEO_TYPES = VIDEO_ACCEPT.split(',')

/** Standaardlimieten van de server (`Video:MaxMb`, `Video:MaxSeconds`). */
export const VIDEO_MAX_MB = 100
export const VIDEO_MAX_SECONDS = 60

/** Hoe lang een foto-story in beeld blijft. */
export const STORY_PHOTO_MS = 5000

/** Hoe lang het lezen van de metadata mag duren voordat we het opgeven (de server controleert toch). */
const METADATA_TIMEOUT_MS = 5000

/**
 * Wat er mis is met een gekozen bestand: 'type', 'size', 'duration' of null (in orde).
 * `durationSeconds` mag null zijn (niet leesbaar in deze browser, bv. MOV in Firefox): dan beslist de server.
 * Een leeg MIME-type (sommige Android-galerijen) laten we door; de server kijkt naar de inhoud.
 */
export function videoFileProblem(file, durationSeconds = null, { maxMb = VIDEO_MAX_MB, maxSeconds = VIDEO_MAX_SECONDS } = {}) {
  if (!file) return 'type'
  if (file.type && !VIDEO_TYPES.includes(file.type)) return 'type'
  if (file.size > maxMb * 1024 * 1024) return 'size'
  // Eén seconde marge, net als de server.
  if (Number.isFinite(durationSeconds) && durationSeconds > maxSeconds + 1) return 'duration'
  return null
}

/**
 * Speelduur van een story in ms: foto's 5 s, video's hun eigen lengte (hoogstens 60 s). `mediaSeconds` is de duur
 * die het `<video>`-element meldt; die gaat voor op de opgeslagen duur.
 */
export function storyDurationMs(story, mediaSeconds = null) {
  if (!story?.videoUrl) return STORY_PHOTO_MS
  const seconds = Number.isFinite(mediaSeconds) && mediaSeconds > 0 ? mediaSeconds : Number(story.videoDurationSeconds)
  if (!Number.isFinite(seconds) || seconds <= 0) return STORY_PHOTO_MS
  return Math.min(seconds, VIDEO_MAX_SECONDS) * 1000
}

/** "0:07", "1:00" voor het duurlabel op een video. */
export function formatVideoDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Leest de duur uit de metadata van een gekozen bestand; null als de browser dat niet kan. */
export function readVideoDuration(file) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return Promise.resolve(null)
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      video.removeAttribute('src')
      URL.revokeObjectURL(url)
      // WebM uit MediaRecorder meldt soms Infinity: onbekend.
      resolve(Number.isFinite(value) && value > 0 ? value : null)
    }
    const timer = setTimeout(() => finish(null), METADATA_TIMEOUT_MS)
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => finish(video.duration)
    video.onerror = () => finish(null)
    video.src = url
  })
}
