import http from './http'

export async function getChallenges() {
  const { data } = await http.get('/challenges')
  return data
}

export async function joinChallenge(key) {
  const { data } = await http.post(`/challenges/${encodeURIComponent(key)}/join`)
  return data
}

export async function leaveChallenge(key) {
  await http.delete(`/challenges/${encodeURIComponent(key)}/join`)
}

export async function getLeaderboard(key) {
  const { data } = await http.get(`/challenges/${encodeURIComponent(key)}/leaderboard`)
  return data
}

/** Voltooide challenges van een profiel. */
export async function getCompletedChallenges(userName) {
  const { data } = await http.get(`/users/${encodeURIComponent(userName)}/challenges`)
  return data
}
