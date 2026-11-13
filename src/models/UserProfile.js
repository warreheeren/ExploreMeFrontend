import { resolveMediaUrl } from '@/utils/media'

export class UserProfile {
  constructor(data = {}) {
    this.id = data.id || ''
    this.userName = data.userName || ''
    this.displayName = data.displayName || ''
    this.bio = data.bio || ''
    this.profilePhotoUrl = resolveMediaUrl(data.profilePhotoUrl) || ''
    this.coverPhotoUrl = resolveMediaUrl(data.coverPhotoUrl) || ''
    this.postsCount = data.postsCount || 0
    this.tripsCount = data.tripsCount || 0
    this.followerCount = data.followerCount || 0
    this.followingCount = data.followingCount || 0
    this.isFollowedByMe = data.isFollowedByMe || false
    this.createdAt = data.createdAt || ''
    this.isPrivate = data.isPrivate || false
    this.followRequestedByMe = data.followRequestedByMe || false
    // Ontbreekt het veld (oudere API), dan is de content zichtbaar.
    this.canViewContent = data.canViewContent ?? true
    this.followsMe = data.followsMe || false
  }

  static fromApi(data) {
    return new UserProfile(data)
  }
}
