import { ref } from 'vue'
import * as uploadApi from '@/api/uploadApi'
import { errorMessage } from '@/utils/errors'
import { t } from '@/i18n'
import { cameraAvailable, recordNativeVideo } from '@/services/nativeCamera'
import { VIDEO_ACCEPT, VIDEO_MAX_MB, VIDEO_MAX_SECONDS, readVideoDuration, videoFileProblem } from '@/utils/video'

/**
 * Upload één video met client-side controles (type, grootte, duur) en een voortgangsstaat. Na 100 % upload
 * transcodeert de server nog: dan staat `processing` aan. `upload(file)` geeft
 * `{ url, posterUrl, thumbUrl, durationSeconds }` terug, of null bij een fout (`error` bevat de melding).
 */
export function useVideoUpload() {
  const uploading = ref(false)
  const processing = ref(false)
  const progress = ref(0)
  const error = ref('')

  async function upload(file) {
    error.value = ''
    if (!file) return null

    const duration = await readVideoDuration(file)
    const problem = videoFileProblem(file, duration)
    if (problem) {
      error.value = problem === 'size'
        ? t('posts.video.tooLarge', { mb: VIDEO_MAX_MB })
        : problem === 'duration'
          ? t('posts.video.tooLong', { seconds: VIDEO_MAX_SECONDS })
          : t('posts.video.type')
      return null
    }

    uploading.value = true
    processing.value = false
    progress.value = 0
    try {
      return await uploadApi.uploadVideo(file, (fraction) => {
        progress.value = fraction
        if (fraction >= 1) processing.value = true
      })
    } catch (e) {
      error.value = errorMessage(e, t('posts.video.failed'))
      return null
    } finally {
      uploading.value = false
      processing.value = false
    }
  }

  /** Native app: video opnemen met de camera (File of null, zoals `capture` in useImageUpload). */
  async function record() {
    error.value = ''
    try {
      return await recordNativeVideo()
    } catch {
      error.value = t('nativeApp.camera.failed')
      return null
    }
  }

  return { uploading, processing, progress, error, upload, accept: VIDEO_ACCEPT, canRecord: cameraAvailable, record }
}
