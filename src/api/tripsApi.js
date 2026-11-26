import http from './http'
import { Post, Comment } from '@/models'

// ---------- lijsten ----------

/** Publieke reizen, nieuwste eerst; before = createdAtUtc van de laatste reis (volgende pagina). */
export async function getAllTrips(take = 50, before = null) {
  const { data } = await http.get('/trips', { params: { take, before: before || undefined } })
  return data
}

export async function getUserTrips(username, take = 50) {
  const { data } = await http.get(`/trips/user/${encodeURIComponent(username)}`, { params: { take } })
  return data
}

export async function getBookmarkedTrips(take = 50) {
  const { data } = await http.get('/trips/bookmarks', { params: { take } })
  return data
}

/** Startscherm "Mijn reizen": [{ trip, isOwner, participantCount, participants, hasOpenDatePoll, actionCount, actions, myBalance, baseCurrency }] */
export async function getTripsHome() {
  const { data } = await http.get('/trips/home')
  return data
}

/** Tabblad Overzicht van een reis: { item, activity, chatUnread, lastMessage, spentTotal, openPaymentRequests } (alleen deelnemers). */
export async function getTripOverview(tripId) {
  const { data } = await http.get(`/trips/${tripId}/overview`)
  return data
}

export async function getUpcomingTrips(take = 5) {
  const { data } = await http.get('/trips/upcoming', { params: { take } })
  return data
}

/** Reizen waaraan je deelneemt die rond vandaag lopen (±1 dag speling; filter zelf op de lokale datum). */
export async function getActiveTrips() {
  const { data } = await http.get('/trips/active')
  return data
}

// ---------- detail & schrijven ----------

export async function getTripById(tripId) {
  const { data } = await http.get(`/trips/${tripId}`)
  return data
}

export async function createTrip(tripData) {
  const { data } = await http.post('/trips', tripData)
  return data
}

export async function updateTrip(tripId, tripData) {
  const { data } = await http.put(`/trips/${tripId}`, tripData)
  return data
}

/** Voegt stops achteraan toe zonder de bestaande te vervangen → TripDto. */
export async function addStops(tripId, stops) {
  const { data } = await http.post(`/trips/${tripId}/stops`, stops)
  return data
}

export async function deleteTrip(tripId) {
  await http.delete(`/trips/${tripId}`)
}

export async function cloneTrip(tripId) {
  const { data } = await http.post(`/trips/${tripId}/clone`)
  return data
}

// ---------- bookmark & like ----------

export async function toggleBookmark(tripId) {
  const { data } = await http.post(`/trips/${tripId}/bookmark`)
  return data // { bookmarkedByMe, bookmarkCount }
}

export async function toggleTripLike(tripId) {
  const { data } = await http.post(`/trips/${tripId}/like`)
  return data // { likedByMe, likeCount }
}

// ---------- reacties ----------

export async function getTripComments(tripId, take = 200) {
  const { data } = await http.get(`/trips/${tripId}/comments`, { params: { take } })
  return Comment.fromApiList(data)
}

export async function addTripComment(tripId, text, parentCommentId = null) {
  const { data } = await http.post(`/trips/${tripId}/comments`, { text, parentCommentId })
  return Comment.fromApi(data)
}

export async function updateTripComment(commentId, text) {
  const { data } = await http.put(`/trips/comments/${commentId}`, { text })
  return Comment.fromApi(data)
}

export async function deleteTripComment(commentId) {
  await http.delete(`/trips/comments/${commentId}`)
}

// ---------- posts gekoppeld aan een reis ----------

export async function getTripPosts(tripId, take = 30) {
  const { data } = await http.get(`/trips/${tripId}/posts`, { params: { take } })
  return Post.fromApiList(data)
}

// ---------- deel-link ----------

export async function enableShare(tripId) {
  const { data } = await http.post(`/trips/${tripId}/share`)
  return data // { shareToken }
}

export async function disableShare(tripId) {
  await http.delete(`/trips/${tripId}/share`)
}

// ---------- budget ----------

export async function getBudget(tripId) {
  const { data } = await http.get(`/trips/${tripId}/budget`)
  return data
}

export async function addExpense(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/expenses`, payload)
  return data
}

export async function updateExpense(tripId, expenseId, payload) {
  const { data } = await http.put(`/trips/${tripId}/expenses/${expenseId}`, payload)
  return data
}

/** `version` (uit de uitgave): de API weigert met 409 als een reisgenoot de uitgave intussen wijzigde. */
export async function deleteExpense(tripId, expenseId, version) {
  await http.delete(`/trips/${tripId}/expenses/${expenseId}`, { params: { version: version ?? undefined } })
}

// ---------- checklist ----------

export async function getChecklist(tripId) {
  const { data } = await http.get(`/trips/${tripId}/checklist`)
  return data
}

export async function addChecklistItem(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/checklist`, payload)
  return data
}

export async function updateChecklistItem(tripId, itemId, payload) {
  const { data } = await http.put(`/trips/${tripId}/checklist/${itemId}`, payload)
  return data
}

export async function deleteChecklistItem(tripId, itemId) {
  await http.delete(`/trips/${tripId}/checklist/${itemId}`)
}

export async function setBudgetCurrency(tripId, currency) {
  const { data } = await http.put(`/trips/${tripId}/budget/currency`, { currency })
  return data
}

/** payload: { fromUserName, toUserName, amount, note? } */
export async function addSettlement(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/settlements`, payload)
  return data
}

export async function deleteSettlement(tripId, settlementId) {
  await http.delete(`/trips/${tripId}/settlements/${settlementId}`)
}

// ---------- betaalverzoeken ----------

/** [{ id, title, amountPerPerson, currency, dueDate, isCancelled, requestedByDisplayName, paidCount, totalCount, shares, isMine, paidByMe, canManage, payToIban, payToName }] */
export async function getPaymentRequests(tripId) {
  const { data } = await http.get(`/trips/${tripId}/payment-requests`)
  return data
}

/** payload: { title, amountPerPerson, dueDate?, userNames? } (zonder userNames: iedereen behalve jij) */
export async function createPaymentRequest(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/payment-requests`, payload)
  return data
}

/** Eigen betaling afvinken; met userName namens een ander (alleen de aanvrager of eigenaar). */
export async function markPaymentPaid(requestId, userName = null) {
  const { data } = await http.post(`/trips/payment-requests/${requestId}/paid`, null, { params: userName ? { userName } : {} })
  return data
}

export async function unmarkPaymentPaid(requestId, userName = null) {
  const { data } = await http.delete(`/trips/payment-requests/${requestId}/paid`, { params: userName ? { userName } : {} })
  return data
}

export async function cancelPaymentRequest(requestId) {
  await http.delete(`/trips/payment-requests/${requestId}`)
}

// ---------- route & weer ----------

export async function getRoute(tripId) {
  const { data } = await http.get(`/trips/${tripId}/route`)
  return data
}

/** Geschatte CO₂-voetafdruk per persoon (per been, per vervoerswijze, alternatieven). */
export async function getFootprint(tripId) {
  const { data } = await http.get(`/trips/${tripId}/footprint`)
  return data
}

export async function getWeather(tripId) {
  const { data } = await http.get(`/trips/${tripId}/weather`)
  return data
}

// ---------- stemmingen ----------

export async function getPolls(tripId) {
  const { data } = await http.get(`/trips/${tripId}/polls`)
  return data
}

/** payload: { question, options: string[], allowMultiple, closesAtUtc? } */
export async function createPoll(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/polls`, payload)
  return data
}

export async function votePoll(pollId, optionIds) {
  const { data } = await http.post(`/trips/polls/${pollId}/vote`, { optionIds })
  return data
}

/** Voorstel toevoegen aan een open stemming: payload { text, url? } → de bijgewerkte stemming. */
export async function addPollOption(pollId, payload) {
  const { data } = await http.post(`/trips/polls/${pollId}/options`, payload)
  return data
}

export async function closePoll(pollId) {
  const { data } = await http.post(`/trips/polls/${pollId}/close`)
  return data
}

export async function deletePoll(pollId) {
  await http.delete(`/trips/polls/${pollId}`)
}

// ---------- datumprikker ----------

/** De meest recente datumprikker van de reis, of null als er nog geen is. */
export async function getDatePoll(tripId) {
  const res = await http.get(`/trips/${tripId}/date-poll`)
  return res.status === 204 ? null : res.data || null
}

/** payload: { rangeStart, rangeEnd, lengthDays } (ISO op UTC-middernacht) */
export async function openDatePoll(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/date-poll`, payload)
  return data
}

/** votes: [{ date, availability: 'Yes'|'Maybe'|'No' }] — vervangt alle stemmen van de gebruiker. */
export async function voteDatePoll(tripId, votes) {
  const { data } = await http.put(`/trips/${tripId}/date-poll/votes`, { votes })
  return data
}

export async function decideDatePoll(tripId, start) {
  const { data } = await http.post(`/trips/${tripId}/date-poll/decide`, { start })
  return data
}

export async function closeDatePoll(tripId) {
  const { data } = await http.post(`/trips/${tripId}/date-poll/close`)
  return data
}

// ---------- tijdcapsules ----------

/** Capsules van de reis (alleen voor deelnemers); message/imageUrl zijn null zolang de kijker ze niet mag lezen. */
export async function getCapsules(tripId) {
  const { data } = await http.get(`/trips/${tripId}/capsules`)
  return data || []
}

/** payload: { message, imageUrl, trigger: 'TripEnd'|'OneYear'|'Custom', openAtUtc, audience: 'Self'|'Participants' } */
export async function createCapsule(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/capsules`, payload)
  return data
}

export async function deleteCapsule(tripId, capsuleId) {
  await http.delete(`/trips/${tripId}/capsules/${capsuleId}`)
}

// ---------- bijlagen ----------

export async function getAttachments(tripId) {
  const { data } = await http.get(`/trips/${tripId}/attachments`)
  return data
}

export async function uploadAttachment(tripId, file, { tripStopId = null, note = '' } = {}, onProgress = null) {
  const form = new FormData()
  form.append('file', file)
  if (tripStopId) form.append('tripStopId', tripStopId)
  if (note) form.append('note', note)
  const { data } = await http.post(`/trips/${tripId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  })
  return data
}

/** Haalt de bijlage op als Blob (de download vraagt het login-token). */
export async function downloadAttachment(tripId, attachmentId) {
  const { data } = await http.get(`/trips/${tripId}/attachments/${attachmentId}/download`, { responseType: 'blob' })
  return data
}

export async function deleteAttachment(tripId, attachmentId) {
  await http.delete(`/trips/${tripId}/attachments/${attachmentId}`)
}

// ---------- groepschat ----------

export async function getTripChats() {
  const { data } = await http.get('/trips/chats')
  return data
}

export async function getTripChat(tripId, take = 100, before = null) {
  const { data } = await http.get(`/trips/${tripId}/chat`, { params: { take, before: before || undefined } })
  return data
}

export async function sendTripChat(tripId, text) {
  const { data } = await http.post(`/trips/${tripId}/chat`, { text })
  return data
}

export async function markTripChatRead(tripId) {
  await http.post(`/trips/${tripId}/chat/read`)
}

export async function deleteTripChatMessage(tripId, messageId) {
  await http.delete(`/trips/${tripId}/chat/${messageId}`)
}

// ---------- dagboek ----------

export async function getJournal(tripId) {
  const { data } = await http.get(`/trips/${tripId}/journal`)
  return data
}

/** payload: { date, title?, text, imageUrls?, mood? } */
export async function addJournalEntry(tripId, payload) {
  const { data } = await http.post(`/trips/${tripId}/journal`, payload)
  return data
}

export async function updateJournalEntry(tripId, entryId, payload) {
  const { data } = await http.put(`/trips/${tripId}/journal/${entryId}`, payload)
  return data
}

export async function deleteJournalEntry(tripId, entryId) {
  await http.delete(`/trips/${tripId}/journal/${entryId}`)
}