import http from './http'
import { Post, Comment } from '@/models'

/** Tijdlijn, nieuwste eerst; before = createdAtUtc van de laatste post (volgende pagina). */
export async function getFeed(take = 20, before = null) {
  const { data } = await http.get('/posts/feed', { params: { take, before: before || undefined } })
  return Post.fromApiList(data)
}

export async function getPost(postId) {
  const { data } = await http.get(`/posts/${postId}`)
  return Post.fromApi(data)
}

/** payload: { caption, imageUrls, tripId?, tripStopId?, videoUrl?, videoDurationSeconds? } */
export async function createPost(payload) {
  const { data } = await http.post('/posts', payload)
  return Post.fromApi(data)
}

/**
 * payload: { caption, imageUrls, tripId?, tripStopId?, videoUrl?, videoDurationSeconds? } — stuur altijd de volledige
 * gewenste staat mee (`videoUrl: null` verwijdert de video).
 */
export async function updatePost(postId, payload) {
  const { data } = await http.put(`/posts/${postId}`, payload)
  return Post.fromApi(data)
}

export async function deletePost(postId) {
  await http.delete(`/posts/${postId}`)
}

export async function toggleLike(postId) {
  await http.post(`/posts/${postId}/like`)
}

export async function getComments(postId, take = 200) {
  const { data } = await http.get(`/posts/${postId}/comments`, { params: { take } })
  return Comment.fromApiList(data)
}

export async function addComment(postId, text, parentCommentId = null) {
  const { data } = await http.post(`/posts/${postId}/comments`, { text, parentCommentId })
  return Comment.fromApi(data)
}

export async function updateComment(commentId, text) {
  const { data } = await http.put(`/posts/comments/${commentId}`, { text })
  return Comment.fromApi(data)
}

export async function deleteComment(commentId) {
  await http.delete(`/posts/comments/${commentId}`)
}
