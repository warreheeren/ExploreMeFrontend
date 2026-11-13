// Camera in de native app (@capacitor/camera). In de browser blijft de gewone file-input in gebruik; ook in de app
// werkt die nog (galerij), de camera-knoppen zijn een snellere extra.

import { isNative } from '@/services/native'

/** True als de camera-knoppen getoond mogen worden. */
export const cameraAvailable = isNative

/** Annuleren door de gebruiker is geen fout. */
function isCancel(err) {
  const text = `${err?.code || ''} ${err?.message || ''}`.toLowerCase()
  return text.includes('cancel') || text.includes('0006') || text.includes('0017')
}

async function toFile(result, fallbackType, baseName) {
  if (!result?.webPath) return null
  const response = await fetch(result.webPath)
  const blob = await response.blob()
  const type = blob.type || fallbackType
  const extension = type.split('/')[1]?.replace('quicktime', 'mov').replace('jpeg', 'jpg') || 'bin'
  return new File([blob], `${baseName}-${Date.now()}.${extension}`, { type, lastModified: Date.now() })
}

/** Neemt een foto en geeft een File (JPEG), of null bij annuleren. Gooit bij een echte fout. */
export async function takeNativePhoto() {
  if (!isNative) return null
  const { Camera } = await import('@capacitor/camera')
  try {
    // De server verkleint en verwijdert metadata; 2560 px is ruim genoeg en houdt de upload klein.
    const result = await Camera.takePhoto({ quality: 85, targetWidth: 2560, targetHeight: 2560, correctOrientation: true })
    return await toFile(result, 'image/jpeg', 'photo')
  } catch (err) {
    if (isCancel(err)) return null
    throw err
  }
}

/** Neemt een video op en geeft een File, of null bij annuleren. Gooit bij een echte fout. */
export async function recordNativeVideo() {
  if (!isNative) return null
  const { Camera } = await import('@capacitor/camera')
  try {
    const result = await Camera.recordVideo({ saveToGallery: false, isPersistent: false })
    return await toFile(result, 'video/mp4', 'video')
  } catch (err) {
    if (isCancel(err)) return null
    throw err
  }
}
