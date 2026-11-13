import { defineStore } from 'pinia'
import * as messagesApi from '@/api/messagesApi'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'

/** Badge-tellers voor ongelezen berichten en openstaande reisuitnodigingen. */
export const useCountsStore = defineStore('counts', {
  state: () => ({
    messages: 0,
    invites: 0,
    _timer: null,
  }),

  actions: {
    async refresh() {
      const [messages, invites] = await Promise.allSettled([
        messagesApi.getUnreadCount(),
        collaboratorsApi.getInviteCount(),
      ])
      if (messages.status === 'fulfilled') this.messages = Number(messages.value) || 0
      if (invites.status === 'fulfilled') this.invites = Number(invites.value) || 0
    },

    /** Toepassen van een realtime "counts"-event: { messages?, invites? }. */
    apply(payload) {
      if (typeof payload?.messages === 'number') this.messages = payload.messages
      if (typeof payload?.invites === 'number') this.invites = payload.invites
    },

    startPolling(intervalMs = 60000) {
      this.stopPolling()
      this.refresh()
      this._timer = setInterval(() => this.refresh(), intervalMs)
    },

    stopPolling() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    },

    reset() {
      this.stopPolling()
      this.messages = 0
      this.invites = 0
    },
  },
})
