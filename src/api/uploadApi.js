import http from './http'

export async function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data.url
}

/**
 * Video (mp4/mov/webm, max. 100 MB / 60 s). De server transcodeert synchroon, dus na 100 % upload duurt het nog even.
 * `onProgress(fraction)` volgt alleen de upload. Geeft { url, posterUrl, thumbUrl, durationSeconds } terug (relatieve URL's).
 */
export async function uploadVideo(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post('/upload/video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Transcoderen kan tot ~2 minuten duren; geen korte standaard-timeout.
    timeout: 0,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.min(1, e.loaded / e.total))
    },
  })
  return data
}

/** Spraakmemo (webm/ogg/m4a, max. 5 MB). Geeft { url, durationSec } terug. */
export async function uploadAudio(blob, fileName, durationSec, onProgress) {
  const form = new FormData()
  form.append('file', blob, fileName)
  if (Number.isFinite(durationSec)) form.append('durationSec', String(durationSec))
  const { data } = await http.post('/upload/audio', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.min(1, e.loaded / e.total))
    },
  })
  return data
}
