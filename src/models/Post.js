export class Post {
  constructor(data = {}) {
    this.id = data.id || ''
    this.userName = data.userName || ''
    this.profilePhotoUrl = data.profilePhotoUrl || ''
    this.displayName = data.displayName || ''
    this.caption = data.caption || ''
    this.imageUrl = data.imageUrl || null
    this.imageUrls = Array.isArray(data.imageUrls) && data.imageUrls.length
      ? data.imageUrls
      : (data.imageUrl ? [data.imageUrl] : [])
    this.createdAtUtc = data.createdAtUtc || ''
    this.likeCount = data.likeCount || 0
    this.likedByMe = data.likedByMe || false
    this.commentCount = data.commentCount || 0
  }

  static fromApi(data) {
    return new Post(data)
  }

  static fromApiList(list) {
    return (list || []).map(d => Post.fromApi(d))
  }
}
