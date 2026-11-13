export class AuthUser {
  constructor(data = {}) {
    this.token = data.token || ''
    this.userName = data.userName || ''
    this.displayName = data.displayName || ''
    this.onboardingCompleted = data.onboardingCompleted !== false
  }

  static fromApi(data) {
    return new AuthUser(data)
  }
}
