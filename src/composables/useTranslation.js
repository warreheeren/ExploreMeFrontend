import { computed, onMounted, ref, toValue, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as aiApi from '@/api/aiApi'
import { useAiStatus } from '@/composables/useAiStatus'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { shouldOfferTranslation } from '@/utils/language'

// Per sessie onthouden, zodat een lijst die opnieuw rendert niet opnieuw vertaalt.
// Sleutel: kind:id:doeltaal; de brontekst gaat mee zodat een bewerking de cache ongeldig maakt.
const sessionCache = new Map()

/**
 * Vertaling van één stuk content. `kind`, `id` en `text` mogen refs of getters zijn.
 * → { offer, loading, result, showing, sameLanguage, displayText, translate, toggle }
 */
export function useTranslation(kind, id, text) {
  const { locale } = useI18n()
  const auth = useAuthStore()
  const toast = useToastStore()
  const { status: aiStatus, load: loadAiStatus, setRemaining } = useAiStatus()

  const loading = ref(false)
  const result = ref(null)
  const showing = ref(false)

  const target = computed(() => (locale.value === 'en' ? 'en' : 'nl'))
  const key = computed(() => `${toValue(kind)}:${toValue(id)}:${target.value}`)
  const sameLanguage = computed(() => result.value?.sourceLanguage === target.value)

  const offer = computed(() =>
    auth.isAuthenticated && aiStatus.value.enabled && (!!result.value || shouldOfferTranslation(toValue(text), target.value)))

  const displayText = computed(() => (showing.value && result.value && !sameLanguage.value ? result.value.text : toValue(text)))

  function restore() {
    const hit = sessionCache.get(key.value)
    result.value = hit && hit.source === toValue(text) ? hit.result : null
    showing.value = false
  }

  async function translate() {
    if (loading.value) return
    if (result.value) {
      showing.value = true
      return
    }
    loading.value = true
    try {
      const source = toValue(text)
      const res = await aiApi.translateContent(toValue(kind), toValue(id), target.value)
      result.value = { sourceLanguage: res.sourceLanguage, text: res.text }
      sessionCache.set(key.value, { source, result: result.value })
      showing.value = true
      if (!res.cached) setRemaining(Math.max(0, aiStatus.value.remainingToday - 1))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      loading.value = false
    }
  }

  function toggle() {
    if (showing.value) showing.value = false
    else translate()
  }

  onMounted(() => {
    if (auth.isAuthenticated) loadAiStatus()
  })
  // Andere UI-taal of bewerkte tekst: opnieuw beginnen (eventueel uit de sessiecache).
  watch([key, () => toValue(text)], restore, { immediate: true })

  return { offer, loading, result, showing, sameLanguage, displayText, translate, toggle }
}
