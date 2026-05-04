import { defineStore } from 'pinia'
import * as authApi from '@/api/authApi'
import * as userApi from '@/api/userApi'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userName: localStorage.getItem('userName') || null,
    displayName: localStorage.getItem('displayName') || null,
    profilePhotoUrl: localStorage.getItem('profilePhotoUrl') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token
  },
  actions: {
    async register(userName, displayName, password) {
      const res = await authApi.register({ userName, displayName, password })
      this._setAuth(res)
      return res
    },
    async login(userName, password) {
      const res = await authApi.login({ userName, password })
      this._setAuth(res)
      await this.loadProfile()
      return res
    },
    async loadProfile() {
      if (!this.userName) return
      try {
        const profile = await userApi.getProfile(this.userName)
        this.profilePhotoUrl = profile.profilePhotoUrl || null
        this.displayName = profile.displayName || this.displayName
        if (this.profilePhotoUrl) localStorage.setItem('profilePhotoUrl', this.profilePhotoUrl)
        if (this.displayName) localStorage.setItem('displayName', this.displayName)
      } catch {
        // silently fail
      }
    },
    logout() {
      this.token = null
      this.userName = null
      this.displayName = null
      this.profilePhotoUrl = null
      localStorage.removeItem('token')
      localStorage.removeItem('userName')
      localStorage.removeItem('displayName')
      localStorage.removeItem('profilePhotoUrl')
    },
    _setAuth(res) {
      this.token = res.token
      this.userName = res.userName
      this.displayName = res.displayName
      localStorage.setItem('token', res.token)
      localStorage.setItem('userName', res.userName)
      localStorage.setItem('displayName', res.displayName)
    }
  }
})
