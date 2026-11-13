import http from './http'

/** Vragen over de plek van een stop, met de meest nuttige antwoorden eerst. */
export async function getQuestions(stopId) {
  const { data } = await http.get(`/places/${stopId}/questions`)
  return data
}

export async function askQuestion(stopId, text) {
  const { data } = await http.post(`/places/${stopId}/questions`, { text })
  return data
}

export async function answerQuestion(questionId, text) {
  const { data } = await http.post(`/places/questions/${questionId}/answers`, { text })
  return data
}

/** → { helpful, helpfulCount } */
export async function toggleHelpful(answerId) {
  const { data } = await http.post(`/places/answers/${answerId}/helpful`)
  return data
}

export async function deleteQuestion(questionId) {
  await http.delete(`/places/questions/${questionId}`)
}

export async function deleteAnswer(answerId) {
  await http.delete(`/places/answers/${answerId}`)
}

/** Plekpagina bij een melding: de stop uit de reis met de recentste vraag. → { stopId } */
export async function getQaTarget(tripId) {
  const { data } = await http.get('/places/qa-target', { params: { tripId } })
  return data
}
