import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'

/**
 * Cursor-gebaseerde lijst met "oneindig scrollen".
 *
 * fetchPage(take, before) → Promise<array>; `before` is de cursor (standaard createdAtUtc) van het laatste item.
 * Zet `sentinel` als ref op een element onderaan de lijst: zodra het in beeld komt, wordt de volgende pagina geladen.
 */
export function useInfiniteList(fetchPage, { pageSize = 10, cursor = (item) => item.createdAtUtc, rootMargin = '600px' } = {}) {
  const items = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const done = ref(false)
  const error = ref(null)
  const sentinel = shallowRef(null)
  let generation = 0
  let observer = null

  async function reload() {
    const gen = ++generation
    loading.value = true
    error.value = null
    done.value = false
    try {
      const page = await fetchPage(pageSize, null)
      if (gen !== generation) return
      items.value = page
      done.value = page.length < pageSize
    } catch (e) {
      if (gen === generation) error.value = e
    } finally {
      if (gen === generation) loading.value = false
    }
  }

  async function loadMore() {
    if (loading.value || loadingMore.value || done.value || error.value || items.value.length === 0) return
    const gen = generation
    loadingMore.value = true
    try {
      const last = items.value[items.value.length - 1]
      const page = await fetchPage(pageSize, cursor(last))
      if (gen !== generation) return
      const seen = new Set(items.value.map((i) => i.id))
      items.value = [...items.value, ...page.filter((i) => !seen.has(i.id))]
      done.value = page.length < pageSize
    } catch (e) {
      if (gen === generation) error.value = e
    } finally {
      loadingMore.value = false
    }
  }

  /** Na een fout bij "meer laden" opnieuw proberen. */
  function retry() {
    error.value = null
    return items.value.length ? loadMore() : reload()
  }

  function observe(el) {
    observer?.disconnect()
    observer = null
    if (!el || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore()
    }, { rootMargin })
    observer.observe(el)
  }

  watch(sentinel, observe)
  onBeforeUnmount(() => observer?.disconnect())

  return { items, loading, loadingMore, done, error, sentinel, reload, loadMore, retry }
}
