import { defineStore } from 'pinia'
import * as authApi from '@/api/authApi'
import * as userApi from '@/api/userApi'
import * as externalAuthApi from '@/api/externalAuthApi'
import { clearStoredSession } from '@/api/http'

function persist(key, value) {
  if (value === null || value === undefined || value === '') localStorage.removeItem(key)
  else localStorage.setItem(key, String(value))
}

function readOnboarding() {
  const raw = localStorage.getItem('onboardingCompleted')
  // Bestaande sessies zonder deze sleutel nooit naar de onboarding dwingen.
  return raw === null ? true : raw === 'true'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userName: localStorage.getItem('userName') || null,
    displayName: localStorage.getItem('displayName') || null,
    profilePhotoUrl: localStorage.getItem('profilePhotoUrl') || null,
    coverPhotoUrl: localStorage.getItem('coverPhotoUrl') || null,
    email: localStorage.getItem('email') || null,
    role: localStorage.getItem('role') || 'User',
    emailVerified: localStorage.getItem('emailVerified') !== 'false',
    isPrivate: false,
    language: 'nl',
    pendingFollowRequests: 0,
    bio: '',
    onboardingCompleted: readOnboarding(),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.role === 'Admin',
    /** E-mailadres ingevuld maar nog niet bevestigd. */
    needsEmailVerification: (state) => !!state.email && !state.emailVerified,
  },

  actions: {
    /** payload: { userName, displayName, password, email? } */
    async register(payload) {
      const res = await authApi.register(payload)
      this._setAuth(res)
      return res
    },

    async login(userName, password) {
      const res = await authApi.login({ userName, password })
      this._setAuth(res)
      await this.loadMe()
      return res
    },

    /** Google/Apple: payload { idToken, nonce?, displayName? }. Logt in, koppelt of maakt een nieuw account. */
    async externalLogin(provider, payload) {
      const res = await externalAuthApi.externalLogin(provider, payload)
      this._setAuth(res)
      await this.loadMe()
      return res
    },

    /** Haalt het eigen profiel op (incl. e-mail en onboarding-status). */
    async loadMe() {
      if (!this.token) return null
      try {
        const me = await userApi.getMe()
        this._applyMe(me)
        return me
      } catch {
        return null
      }
    },

    /**
     * Vervangt het token van deze sessie (de API trok de andere sessies in na een wachtwoord- of e-mailwijziging)
     * en verbindt de realtime-verbinding opnieuw.
     */
    async replaceToken(token) {
      if (!token) return
      this.token = token
      persist('token', token)
      const { restartRealtime } = await import('@/services/realtime')
      restartRealtime().catch(() => {})
    },

    async changePassword(currentPassword, newPassword) {
      const res = await authApi.changePassword(currentPassword, newPassword)
      await this.replaceToken(res.token)
    },

    /**
     * payload: { displayName?, bio?, profileImgUrl?, coverImgUrl?, email?, currentPassword? | provider/idToken/nonce }.
     * Een ander e-mailadres vraagt herbevestiging (wachtwoord of gekoppelde Google/Apple-login).
     */
    async updateProfile(payload) {
      const { profile, token } = await userApi.updateProfile(payload)
      if (token) await this.replaceToken(token)
      this.displayName = profile.displayName
      this.profilePhotoUrl = profile.profilePhotoUrl || null
      this.coverPhotoUrl = profile.coverPhotoUrl || null
      this.bio = profile.bio || ''
      if (payload.email !== undefined) {
        const next = payload.email?.trim() ? payload.email.trim().toLowerCase() : null
        if (next !== this.email) this.emailVerified = !next
        this.email = next
      }
      if (payload.isPrivate !== undefined) this.isPrivate = !!payload.isPrivate
      if (payload.language) this.language = payload.language
      this._persistProfile()
      return profile
    },

    async completeOnboarding() {
      try {
        await userApi.completeOnboarding()
      } finally {
        this.onboardingCompleted = true
        persist('onboardingCompleted', 'true')
      }
    },

    logout() {
      this.token = null
      this.userName = null
      this.displayName = null
      this.profilePhotoUrl = null
      this.coverPhotoUrl = null
      this.email = null
      this.role = 'User'
      this.emailVerified = true
      this.isPrivate = false
      this.pendingFollowRequests = 0
      this.bio = ''
      this.onboardingCompleted = true
      clearStoredSession()
    },

    _applyMe(me) {
      if (!me) return
      this.userName = me.userName
      this.displayName = me.displayName
      this.profilePhotoUrl = me.profilePhotoUrl || null
      this.coverPhotoUrl = me.coverPhotoUrl || null
      this.email = me.email || null
      this.emailVerified = !!me.emailVerified
      this.role = me.role || 'User'
      this.isPrivate = !!me.isPrivate
      this.language = me.language || 'nl'
      this.pendingFollowRequests = me.pendingFollowRequests || 0
      this.bio = me.bio || ''
      this.onboardingCompleted = !!me.onboardingCompleted
      this._persistProfile()
    },

    _setAuth(res) {
      this.token = res.token
      this.userName = res.userName
      this.displayName = res.displayName
      this.onboardingCompleted = res.onboardingCompleted !== false
      this.role = res.role || 'User'
      persist('token', res.token)
      persist('userName', res.userName)
      this._persistProfile()
    },

    _persistProfile() {
      persist('displayName', this.displayName)
      persist('profilePhotoUrl', this.profilePhotoUrl)
      persist('coverPhotoUrl', this.coverPhotoUrl)
      persist('email', this.email)
      persist('role', this.role)
      persist('emailVerified', this.emailVerified ? 'true' : 'false')
      persist('onboardingCompleted', this.onboardingCompleted ? 'true' : 'false')
    },
  },
})
