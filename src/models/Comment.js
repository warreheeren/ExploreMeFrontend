import { resolveMediaUrl } from '@/utils/media'

/** Reactie op een post of een reis. `parentCommentId` is gezet bij een antwoord (één niveau diep). */
export class Comment {
  constructor(data = {}) {
    this.id = data.id || ''
    this.userName = data.userName || ''
    this.profilePhotoUrl = resolveMediaUrl(data.profilePhotoUrl) || ''
    this.displayName = data.displayName || ''
    this.text = data.text || ''
    this.createdAtUtc = data.createdAtUtc || ''
    this.parentCommentId = data.parentCommentId || null
  }

  static fromApi(data) {
    return new Comment(data)
  }

  static fromApiList(list) {
    return (list || []).map((d) => Comment.fromApi(d))
  }
}
