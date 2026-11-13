// Uitgaand delen (deelmenu van het systeem): @capacitor/share in de native app, anders de Web Share API.
// De Android-WebView heeft geen navigator.share, dus zonder deze laag zou "Delen via…" in de app ontbreken.

import { isNative } from '@/services/native'

/** True als er een systeem-deelmenu is (native app of browser met Web Share API). */
export function canShare() {
  return isNative || (typeof navigator !== 'undefined' && typeof navigator.share === 'function')
}

function isCancel(err) {
  if (err?.name === 'AbortError') return true
  return /cancel/i.test(`${err?.message || ''} ${err?.code || ''}`)
}

/**
 * Opent het deelmenu met titel, tekst en/of URL. Geeft 'shared', 'cancelled' of 'unavailable' (geen deelmenu of een
 * fout: de aanroeper valt dan terug op bv. link kopiëren).
 */
export async function shareContent({ title = '', text = '', url = '' } = {}) {
  try {
    if (isNative) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: title || undefined, text: text || undefined, url: url || undefined, dialogTitle: title || undefined })
      return 'shared'
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url })
      return 'shared'
    }
  } catch (err) {
    if (isCancel(err)) return 'cancelled'
  }
  return 'unavailable'
}
