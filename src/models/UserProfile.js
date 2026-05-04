import { resolveMediaUrl } from '@/utils/media'

export class UserProfile {
  constructor(data = {}) {
    this.userName = data.userName || ''
    this.displayName = data.displayName || ''
    this.bio = data.bio || ''
    this.profilePhotoUrl = resolveMediaUrl(data.profilePhotoUrl) || ''
    this.postsCount = data.postsCount || 0
    this.followerCount = data.followerCount || 0
    this.followingCount = data.followingCount || 0
    this.isFollowedByMe = data.isFollowedByMe || false
  }

  static fromApi(data) {
    return new UserProfile(data)
  }
}
