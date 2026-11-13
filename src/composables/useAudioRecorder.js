import { onScopeDispose, ref } from 'vue'
import { MAX_AUDIO_SECONDS, pickAudioMimeType } from '@/utils/journal'

/**
 * Spraakmemo opnemen met MediaRecorder: mime-type volgens wat de browser kan (WebM/Opus → MP4 → Ogg),
 * automatisch stoppen na 180 s en een niveaumeter (0–1) via een AnalyserNode.
 * status: 'idle' | 'requesting' | 'recording' | 'recorded'; error: null | 'unsupported' | 'denied' | 'failed'.
 */
export function useAudioRecorder({ maxSeconds = MAX_AUDIO_SECONDS } = {}) {
  const supported = typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof window.MediaRecorder !== 'undefined'

  const status = ref('idle')
  const error = ref(null)
  const elapsed = ref(0)
  const level = ref(0)
  const blob = ref(null)
  const mimeType = ref('')

  let stream = null
  let recorder = null
  let audioContext = null
  let frame = 0
  let timer = 0
  let startedAt = 0
  let chunks = []

  function release() {
    cancelAnimationFrame(frame)
    clearInterval(timer)
    stream?.getTracks().forEach((track) => track.stop())
    audioContext?.close().catch(() => {})
    stream = null
    audioContext = null
    level.value = 0
  }

  function meter(source) {
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (const v of data) sum += ((v - 128) / 128) ** 2
      // RMS van spraak ligt meestal onder 0,3: wat versterken zodat de meter zichtbaar beweegt.
      level.value = Math.min(1, Math.sqrt(sum / data.length) * 3)
      frame = requestAnimationFrame(tick)
    }
    tick()
  }

  async function start() {
    if (!supported) {
      error.value = 'unsupported'
      return false
    }
    error.value = null
    blob.value = null
    elapsed.value = 0
    status.value = 'requesting'
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      status.value = 'idle'
      error.value = e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'failed'
      return false
    }

    try {
      const preferred = pickAudioMimeType((type) => window.MediaRecorder.isTypeSupported(type))
      recorder = new window.MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
      mimeType.value = recorder.mimeType || preferred || 'audio/webm'
      chunks = []
      recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
      recorder.onstop = () => {
        blob.value = new Blob(chunks, { type: mimeType.value })
        status.value = 'recorded'
        release()
      }
      recorder.start(1000)

      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) {
        audioContext = new Ctx()
        meter(audioContext.createMediaStreamSource(stream))
      }

      startedAt = Date.now()
      status.value = 'recording'
      timer = setInterval(() => {
        elapsed.value = Math.min(maxSeconds, (Date.now() - startedAt) / 1000)
        if (elapsed.value >= maxSeconds) stop()
      }, 200)
      return true
    } catch {
      release()
      status.value = 'idle'
      error.value = 'failed'
      return false
    }
  }

  function stop() {
    if (recorder?.state === 'recording') {
      elapsed.value = Math.min(maxSeconds, (Date.now() - startedAt) / 1000)
      clearInterval(timer)
      recorder.stop()
    }
  }

  function reset() {
    if (recorder?.state === 'recording') {
      recorder.onstop = null
      recorder.stop()
    }
    release()
    recorder = null
    chunks = []
    blob.value = null
    elapsed.value = 0
    status.value = 'idle'
    error.value = null
  }

  onScopeDispose(reset)

  return { supported, status, error, elapsed, level, blob, mimeType, maxSeconds, start, stop, reset }
}
