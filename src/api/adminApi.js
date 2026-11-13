import http from './http'

export async function getStats() {
  const { data } = await http.get('/admin/stats')
  return data
}

/** Database-back-up nu → { file, createdAtUtc } */
export async function createBackup() {
  const { data } = await http.post('/admin/backup')
  return data
}

/** EXIF/GPS uit bestaande uploads verwijderen → { scanned, rewritten, alreadyClean, skipped, failed } */
export async function stripMetadata() {
  const { data } = await http.post('/admin/maintenance/strip-metadata')
  return data
}

/** status: 'open' | 'reviewed' | 'dismissed' | 'all' */
export async function getReports(status = 'open', take = 100) {
  const { data } = await http.get('/admin/reports', { params: { status, take } })
  return data
}

/** action: 'none' | 'hide' | 'delete' */
export async function resolveReport(reportId, { action, banUser = false, note = '' }) {
  const { data } = await http.post(`/admin/reports/${reportId}/resolve`, { action, banUser, note: note || null })
  return data
}

export async function dismissReport(reportId, note = '') {
  const { data } = await http.post(`/admin/reports/${reportId}/dismiss`, { note: note || null })
  return data
}

export async function getHidden(take = 100) {
  const { data } = await http.get('/admin/hidden', { params: { take } })
  return data
}

/** type: 'post' | 'trip' | 'comment' */
export async function hideContent(type, id, note = '') {
  await http.post('/admin/content/hide', { type, id, note: note || null })
}

export async function unhideContent(type, id) {
  await http.post('/admin/content/unhide', { type, id })
}

export async function deleteContent(type, id, note = '') {
  await http.post('/admin/content/delete', { type, id, note: note || null })
}

export async function getUsers({ q = '', banned = false, take = 50 } = {}) {
  const { data } = await http.get('/admin/users', { params: { q: q || undefined, banned, take } })
  return data
}

export async function banUser(userId, reason = '') {
  await http.post(`/admin/users/${userId}/ban`, { reason: reason || null })
}

export async function unbanUser(userId) {
  await http.post(`/admin/users/${userId}/unban`)
}

/** role: 'Admin' | 'User' */
export async function setRole(userId, role) {
  await http.put(`/admin/users/${userId}/role`, { role })
}

export async function getLog(take = 100) {
  const { data } = await http.get('/admin/log', { params: { take } })
  return data
}
