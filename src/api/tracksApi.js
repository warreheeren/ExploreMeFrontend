import http from './http'

// GPX-tracks van een reis (fase 6). Track: { id, name, kind: 'Track'|'Route', source, startedAtUtc, endedAtUtc,
// distanceMeters, elevationGainMeters, durationSeconds, points: [[lat, lon, ele?], …], uploadedByUserName, createdAtUtc, canManage }

export async function getTracks(tripId) {
  const { data } = await http.get(`/trips/${tripId}/tracks`)
  return data
}

/** Eén GPX-bestand kan meerdere tracks bevatten: geeft altijd een lijst terug. */
export async function importTrack(tripId, file, { createJournal = false } = {}) {
  const form = new FormData()
  form.append('file', file)
  form.append('createJournal', createJournal ? 'true' : 'false')
  const { data } = await http.post(`/trips/${tripId}/tracks`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data
}

export async function renameTrack(tripId, trackId, name) {
  const { data } = await http.patch(`/trips/${tripId}/tracks/${trackId}`, { name })
  return data
}

export async function deleteTrack(tripId, trackId) {
  await http.delete(`/trips/${tripId}/tracks/${trackId}`)
}
