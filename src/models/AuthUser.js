export class AuthUser {
  constructor(data = {}) {
    this.token = data.token || ''
    this.userName = data.userName || ''
    this.displayName = data.displayName || ''
  }

  static fromApi(data) {
    return new AuthUser(data)
  }
}
