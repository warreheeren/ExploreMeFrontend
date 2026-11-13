import { ref } from 'vue'
import * as uploadApi from '@/api/uploadApi'
import { errorMessage } from '@/utils/errors'
import { t } from '@/i18n'
import { cameraAvailable, takeNativePhoto } from '@/services/nativeCamera'

const MAX_MB = 25
const MAX_BYTES = MAX_MB * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** Upload één afbeelding met validatie en een `uploading`/`error`-staat. */
export function useImageUpload() {
  const uploading = ref(false)
  const error = ref('')

  async function upload(file) {
    error.value = ''
    if (!file) return null
    if (!ALLOWED.includes(file.type)) {
      error.value = t('errors.imageType')
      return null
    }
    if (file.size > MAX_BYTES) {
      error.value = t('errors.imageSize', { mb: MAX_MB })
      return null
    }
    uploading.value = true
    try {
      return await uploadApi.uploadImage(file)
    } catch (e) {
      error.value = errorMessage(e, t('errors.upload'))
      return null
    } finally {
      uploading.value = false
    }
  }

  /**
   * Native app: foto maken met de camera. Geeft een File (die de component net als een gekozen bestand aan
   * `upload` geeft), of null bij annuleren of een fout (dan staat `error`). In de browser: altijd null.
   */
  async function capture() {
    error.value = ''
    try {
      return await takeNativePhoto()
    } catch {
      error.value = t('nativeApp.camera.failed')
      return null
    }
  }

  return { uploading, error, upload, accept: ALLOWED.join(','), canCapture: cameraAvailable, capture }
}
