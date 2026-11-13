import { defineStore } from 'pinia'

let seq = 0

/**
 * Korte meldingen onderaan het scherm. Vervangt alert().
 * action: { label, to } voor een link in de toast.
 */
export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [],
  }),

  actions: {
    show(message, { type = 'info', timeout = 4000, action = null } = {}) {
      const id = ++seq
      this.items.push({ id, type, message, action })
      if (this.items.length > 4) this.items.shift()
      if (timeout > 0) setTimeout(() => this.dismiss(id), timeout)
      return id
    },
    success(message, options = {}) {
      return this.show(message, { ...options, type: 'success' })
    },
    error(message, options = {}) {
      return this.show(message, { timeout: 6000, ...options, type: 'error' })
    },
    info(message, options = {}) {
      return this.show(message, { ...options, type: 'info' })
    },
    dismiss(id) {
      this.items = this.items.filter((t) => t.id !== id)
    },
  },
})
