// Telt geopende overlays zodat geneste modals de scroll niet te vroeg vrijgeven.
let count = 0
let previous = ''

export function lockScroll() {
  if (typeof document === 'undefined') return
  if (count === 0) {
    previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  count++
}

export function unlockScroll() {
  if (typeof document === 'undefined' || count === 0) return
  count--
  if (count === 0) document.body.style.overflow = previous
}
