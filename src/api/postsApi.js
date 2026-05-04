import http from './http'
import { Post, Comment } from '@/models'

export async function getFeed(take = 20) {
  const { data } = await http.get(`/posts/feed?take=${take}`)
  return Post.fromApiList(data)
}

export async function createPost(payload) {
  const { data } = await http.post('/posts', payload)
  return Post.fromApi(data)
}

export async function toggleLike(postId) {
  await http.post(`/posts/${postId}/like`)
}

export async function getComments(postId, take = 50) {
  const { data } = await http.get(`/posts/${postId}/comments?take=${take}`)
  return Comment.fromApiList(data)
}

export async function addComment(postId, text) {
  const { data } = await http.post(`/posts/${postId}/comments`, { text })
  return Comment.fromApi(data)
}

export async function updatePost(postId, payload) {
  const { data } = await http.put(`/posts/${postId}`, payload)
  return Post.fromApi(data)
}

export async function deletePost(postId) {
  await http.delete(`/posts/${postId}`)
}

export async function updateComment(commentId, text) {
  const { data } = await http.put(`/posts/comments/${commentId}`, { text })
  return Comment.fromApi(data)
}

export async function deleteComment(commentId) {
  await http.delete(`/posts/comments/${commentId}`)
}
