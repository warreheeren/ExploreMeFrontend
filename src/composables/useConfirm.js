import { reactive } from 'vue'

// Programmatische bevestiging: `if (await confirm({ title, message, variant: 'danger' })) ...`
// Wordt gerenderd door <ConfirmHost /> in App.vue. Vervangt window.confirm().

// Lege teksten: ConfirmDialog vult dan de vertaalde standaardteksten in.
const DEFAULTS = {
  title: '',
  message: '',
  warning: '',
  confirmLabel: '',
  cancelLabel: '',
  variant: 'default',
}

export const confirmState = reactive({ open: false, ...DEFAULTS })
let pendingResolve = null

export function confirm(options = {}) {
  if (pendingResolve) pendingResolve(false)
  Object.assign(confirmState, DEFAULTS, options, { open: true })
  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

export function resolveConfirm(value) {
  const resolve = pendingResolve
  pendingResolve = null
  confirmState.open = false
  resolve?.(value)
}

export function useConfirm() {
  return confirm
}
