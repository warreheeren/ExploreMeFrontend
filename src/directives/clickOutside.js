// v-click-outside="handler" — roept handler aan bij een pointerdown buiten het element.
// Zet de directive op de wrapper die zowel de toggle-knop als het paneel bevat.
export const clickOutside = {
  mounted(el, binding) {
    el.__clickOutsideHandler = binding.value
    el.__clickOutsideListener = (event) => {
      if (!el.contains(event.target) && typeof el.__clickOutsideHandler === 'function') {
        el.__clickOutsideHandler(event)
      }
    }
    document.addEventListener('pointerdown', el.__clickOutsideListener, true)
  },
  updated(el, binding) {
    el.__clickOutsideHandler = binding.value
  },
  unmounted(el) {
    document.removeEventListener('pointerdown', el.__clickOutsideListener, true)
    delete el.__clickOutsideListener
    delete el.__clickOutsideHandler
  },
}
