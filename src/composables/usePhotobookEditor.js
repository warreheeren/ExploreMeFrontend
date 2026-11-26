import { computed, onBeforeUnmount, ref, watch } from 'vue'
import * as photobookApi from '@/api/photobookApi'
import { t } from '@/i18n'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { onRealtime } from '@/services/realtime'
import { errorMessage } from '@/utils/errors'
import { emptyOverrides, hasOverrides, normalizeOverrides } from '@/utils/photobookEdits'

/** Zo lang na de laatste wijziging wordt er opgeslagen: lang genoeg om een reeks klikken te bundelen. */
const SAVE_DELAY_MS = 800

/**
 * Het bewaarde fotoboek van een reis: laden, automatisch opslaan en terugzetten. Het boek is van de groep, dus
 * elke opslag stuurt de versie mee die deze gebruiker zag; bij een 409 wint de server en laadt de nieuwste versie.
 *
 * @param {object} options
 * @param {string} options.tripId
 * @param {import('vue').Ref<boolean>} options.canEdit deelnemer van de reis (kijkers bewaren niets)
 * @param {{ format, perPage, density, includeText }} options.settings refs van de instellingen in de werkbalk
 */
export function usePhotobookEditor({ tripId, canEdit, settings }) {
  const toast = useToastStore()

  const version = ref(0)
  const title = ref('')
  const subtitle = ref('')
  const coverPhotoId = ref(null)
  const overrides = ref(emptyOverrides())
  const updatedBy = ref('')
  const updatedAt = ref(null)

  /** Bewerkmodus: knoppen op de foto's. Zonder ziet het boek eruit zoals de PDF. */
  const editing = ref(false)
  /** 'idle' | 'saving' | 'saved' | 'error' */
  const saveState = ref('idle')
  const ready = ref(false)
  /** De groep paste iets aan: dan is "terug naar het voorstel van de app" zinvol. */
  const customized = computed(() => version.value > 0 && (hasOverrides(overrides.value) || !!title.value || !!subtitle.value || !!coverPhotoId.value))

  // Tijdens het toepassen van serverwaarden mag de watcher niet meteen weer opslaan.
  let applying = false
  let timer = null
  let saving = false
  let changedWhileSaving = false

  function apply(book) {
    applying = true
    version.value = book?.version || 0
    title.value = book?.title || ''
    subtitle.value = book?.subtitle || ''
    coverPhotoId.value = book?.coverPhotoId || null
    overrides.value = normalizeOverrides(book?.overrides)
    updatedBy.value = book?.updatedByDisplayName || ''
    updatedAt.value = book?.updatedAtUtc || null
    if (book) {
      settings.format.value = book.format
      settings.perPage.value = book.photosPerPage
      settings.density.value = book.density
      settings.includeText.value = book.includeText
    }
    // De watcher draait na deze tick; pas daarna telt een wijziging weer als die van de gebruiker.
    setTimeout(() => { applying = false }, 0)
  }

  async function load() {
    try {
      apply(await photobookApi.getPhotobook(tripId))
    } catch {
      // Zonder bewaard boek (of zonder verbinding) blijft het voorstel van de app staan.
      apply(null)
    } finally {
      ready.value = true
    }
  }

  async function save() {
    if (saving) {
      changedWhileSaving = true
      return
    }
    saving = true
    saveState.value = 'saving'
    try {
      const saved = await photobookApi.savePhotobook(tripId, {
        format: settings.format.value,
        photosPerPage: settings.perPage.value,
        density: settings.density.value,
        includeText: settings.includeText.value,
        title: title.value || null,
        subtitle: subtitle.value || null,
        coverPhotoId: coverPhotoId.value,
        overrides: overrides.value,
        version: version.value,
      })
      // Alleen de versie en "laatst gewijzigd" overnemen: de gebruiker kan intussen verder gewerkt hebben.
      version.value = saved.version
      updatedBy.value = saved.updatedByDisplayName || ''
      updatedAt.value = saved.updatedAtUtc
      saveState.value = 'saved'
    } catch (e) {
      if (e?.response?.status === 409) {
        // Iemand anders was voor: de server wint, anders overschrijven we het werk van een reisgenoot.
        changedWhileSaving = false
        toast.error(errorMessage(e))
        await load()
        saveState.value = 'idle'
      } else {
        saveState.value = 'error'
        toast.error(errorMessage(e, t('photobook.edit.saveFailed')))
      }
    } finally {
      saving = false
      if (changedWhileSaving) {
        changedWhileSaving = false
        schedule()
      }
    }
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      save()
    }, SAVE_DELAY_MS)
  }

  watch(
    [settings.format, settings.perPage, settings.density, settings.includeText, title, subtitle, coverPhotoId, overrides],
    () => {
      if (!ready.value || applying || !canEdit.value) return
      schedule()
    },
    { deep: true },
  )

  /** Terug naar het voorstel van de app: alle aanpassingen van de groep vervallen. */
  async function reset() {
    const ok = await confirm({ title: t('photobook.edit.resetTitle'), message: t('photobook.edit.resetText'), confirmLabel: t('photobook.edit.resetConfirm'), variant: 'danger' })
    if (!ok) return
    clearTimeout(timer)
    timer = null
    try {
      await photobookApi.resetPhotobook(tripId)
      apply(null)
      saveState.value = 'idle'
      toast.success(t('photobook.edit.resetDone'))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  // Een reisgenoot paste het boek aan: meenemen, tenzij je zelf een wijziging open hebt staan (dan meldt de 409 het).
  const off = onRealtime('tripChanged', (e) => {
    if (e?.tripId === tripId && e?.area === 'photobook' && !saving && !timer) load()
  })

  onBeforeUnmount(() => {
    off()
    // Een wijziging die nog op de timer wacht alsnog wegschrijven.
    if (timer) {
      clearTimeout(timer)
      timer = null
      save()
    }
  })

  return { version, title, subtitle, coverPhotoId, overrides, updatedBy, updatedAt, editing, saveState, ready, customized, load, reset }
}
