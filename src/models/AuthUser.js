export class AuthUser {
  constructor(data = {}) {
    this.token = data.token || ''
    this.userName = data.userName || ''
    this.displayName = data.displayName || ''
    this.onboardingCompleted = data.onboardingCompleted !== false
    this.role = data.role || 'User'
    /** Gastaccount: meegedaan via een uitnodigingslink, nog geen eigen inloggegevens. */
    this.isGuest = !!data.isGuest
  }

  static fromApi(data) {
    return new AuthUser(data)
  }
}
