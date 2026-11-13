import { defineStore } from 'pinia'
import * as notificationsApi from '@/api/notificationsApi'

const PAGE = 30

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    unreadCount: 0,
    items: [],
    loading: false,
    loadingMore: false,
    done: false,
    loaded: false,
    _pollInterval: null,
  }),

  actions: {
    async fetchUnreadCount() {
      try {
        this.unreadCount = await notificationsApi.getUnreadCount()
      } catch {
        // stil falen; de volgende poll synchroniseert opnieuw
      }
    },

    async fetchNotifications() {
      this.loading = true
      try {
        this.items = await notificationsApi.getNotifications(PAGE)
        this.done = this.items.length < PAGE
        this.loaded = true
      } catch {
        // stil falen
      } finally {
        this.loading = false
      }
    },

    /** Oudere meldingen ophalen (cursor = tijdstip van de laatste melding). */
    async loadMore() {
      if (this.loadingMore || this.done || !this.items.length) return
      this.loadingMore = true
      try {
        const older = await notificationsApi.getNotifications(PAGE, this.items[this.items.length - 1].createdAtUtc)
        const seen = new Set(this.items.map((n) => n.id))
        this.items.push(...older.filter((n) => !seen.has(n.id)))
        this.done = older.length < PAGE
      } catch {
        // stil falen
      } finally {
        this.loadingMore = false
      }
    },

    async markAllRead() {
      if (this.unreadCount === 0 && this.items.every((n) => n.isRead)) return
      this.unreadCount = 0
      this.items.forEach((n) => { n.isRead = true })
      try {
        await notificationsApi.markAllRead()
      } catch {
        // stil falen
      }
    },

    /** Realtime binnengekomen notificatie bovenaan toevoegen. */
    push(notification) {
      if (!notification?.id || this.items.some((n) => n.id === notification.id)) return
      this.items.unshift(notification)
      if (!notification.isRead) this.unreadCount += 1
    },

    setUnread(count) {
      if (typeof count === 'number') this.unreadCount = count
    },

    startPolling(intervalMs = 60000) {
      this.stopPolling()
      this.fetchUnreadCount()
      this._pollInterval = setInterval(() => this.fetchUnreadCount(), intervalMs)
    },

    stopPolling() {
      if (this._pollInterval) {
        clearInterval(this._pollInterval)
        this._pollInterval = null
      }
    },

    reset() {
      this.stopPolling()
      this.unreadCount = 0
      this.items = []
      this.done = false
      this.loaded = false
    },
  },
})
