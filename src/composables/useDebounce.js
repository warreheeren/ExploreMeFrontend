import { onBeforeUnmount, ref, watch } from 'vue'

/** Debounced versie van een functie; wordt bij unmount automatisch geannuleerd. */
export function useDebounceFn(fn, delay = 300) {
  let timer = null
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  debounced.cancel = () => clearTimeout(timer)
  onBeforeUnmount(() => clearTimeout(timer))
  return debounced
}

/** Ref die de waarde van `source` pas overneemt als die `delay` ms niet meer veranderde. */
export function useDebounce(source, delay = 300) {
  const value = ref(source.value)
  let timer = null
  watch(source, (next) => {
    clearTimeout(timer)
    timer = setTimeout(() => { value.value = next }, delay)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  return value
}
