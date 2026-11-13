// Realtime-verbinding met de SignalR-hub van de API.
// Gebruik: onRealtime('notification', handler) → geeft een unsubscribe-functie terug.

import * as signalR from '@microsoft/signalr'
import { ref } from 'vue'
import { API_ROOT } from '@/api/http'

const SERVER_EVENTS = ['notification', 'message', 'messageRead', 'counts', 'checklistChanged', 'tripMessage', 'tripChanged']

const listeners = new Map()
let connection = null
let getToken = null
let retryTimer = null

/** 'disconnected' | 'connecting' | 'connected' | 'reconnecting' */
export const realtimeStatus = ref('disconnected')

function emit(event, payload) {
  const set = listeners.get(event)
  if (!set) return
  for (const handler of set) {
    try {
      handler(payload)
    } catch (err) {
      console.error(`Realtime handler voor "${event}" faalde`, err)
    }
  }
}

export function onRealtime(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(handler)
  return () => listeners.get(event)?.delete(handler)
}

function scheduleRetry() {
  clearTimeout(retryTimer)
  if (!connection || !getToken?.()) return
  retryTimer = setTimeout(connect, 20000)
}

async function connect() {
  if (!connection || connection.state !== signalR.HubConnectionState.Disconnected) return
  realtimeStatus.value = 'connecting'
  try {
    await connection.start()
    realtimeStatus.value = 'connected'
    emit('connected')
  } catch {
    realtimeStatus.value = 'disconnected'
    scheduleRetry()
  }
}

export async function startRealtime(tokenFactory) {
  getToken = tokenFactory
  if (connection) return

  connection = new signalR.HubConnectionBuilder()
    // withCredentials: false — authenticatie loopt via het token, niet via cookies. Met cookies zou de
    // CORS-policy van de API (AllowAnyOrigin) de negotiate-call blokkeren wanneer frontend en API op
    // verschillende origins draaien.
    .withUrl(`${API_ROOT}/hubs/app`, { accessTokenFactory: () => getToken?.() || '', withCredentials: false })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.None)
    .build()

  SERVER_EVENTS.forEach((evt) => connection.on(evt, (payload) => emit(evt, payload)))
  connection.onreconnecting(() => { realtimeStatus.value = 'reconnecting' })
  connection.onreconnected(() => {
    realtimeStatus.value = 'connected'
    emit('connected')
  })
  connection.onclose(() => {
    realtimeStatus.value = 'disconnected'
    scheduleRetry()
  })

  await connect()
}

/** Opnieuw verbinden met een vers token (na wachtwoord- of e-mailwijziging zijn oude tokens ongeldig). */
export async function restartRealtime() {
  const factory = getToken
  if (!factory) return
  await stopRealtime()
  await startRealtime(factory)
}

export async function stopRealtime() {
  clearTimeout(retryTimer)
  getToken = null
  const current = connection
  connection = null
  realtimeStatus.value = 'disconnected'
  if (current) {
    try {
      await current.stop()
    } catch {
      // verbinding was al dicht
    }
  }
}
