import { defineStore } from 'pinia'
import * as notificationsApi from '@/api/notificationsApi'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    unreadCount: 0,
    items: [],
    loading: false,
    _pollInterval: null
  }),
  actions: {
    async fetchUnreadCount() {
      try {
        this.unreadCount = await notificationsApi.getUnreadCount()
      } catch {
        // silently fail
      }
    },
    async fetchNotifications() {
      this.loading = true
      try {
        this.items = await notificationsApi.getNotifications()
      } finally {
        this.loading = false
      }
    },
    async markAllRead() {
      this.unreadCount = 0
      this.items.forEach(n => n.isRead = true)
      try {
        await notificationsApi.markAllRead()
      } catch {
        // silently fail; next poll will resync
      }
    },
    startPolling() {
      this.fetchUnreadCount()
      this._pollInterval = setInterval(() => this.fetchUnreadCount(), 30000)
    },
    stopPolling() {
      if (this._pollInterval) {
        clearInterval(this._pollInterval)
        this._pollInterval = null
      }
    }
  }
})
