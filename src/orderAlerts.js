import { isDeliveryOrder } from './delivery.js'
import { formatOrderMoney, isOrderCancelled, isOrderPrinted } from './orders.js'

const STORAGE_KEY = 'pizzaralfs.orderAlerts.v1'

export const DEFAULT_ORDER_ALERT_SETTINGS = {
  notifyEnabled: true,
  soundEnabled: true,
  autoPrintEnabled: false,
  pollSeconds: 5,
}

export function loadOrderAlertSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ORDER_ALERT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_ORDER_ALERT_SETTINGS,
      ...parsed,
      pollSeconds: Math.min(30, Math.max(3, Number(parsed.pollSeconds) || 5)),
    }
  } catch {
    return { ...DEFAULT_ORDER_ALERT_SETTINGS }
  }
}

export function saveOrderAlertSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function isOrderAwaitingPrint(order) {
  return !isOrderCancelled(order.status) && !isOrderPrinted(order.status)
}

export function formatNewOrderAlertBody(order) {
  const dest = isDeliveryOrder(order.tableNumber, order.orderType)
    ? 'Delivery'
    : order.tableNumber
      ? `Mesa ${order.tableNumber}`
      : 'Pedido'
  return `${dest} · ${formatOrderMoney(order.totalAmount)}`
}

export async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function notifyNewOrder(order, { flashTitle = true } = {}) {
  const title = `Novo pedido #${order.id}`
  const body = formatNewOrderAlertBody(order)

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        tag: `order-${order.id}`,
        requireInteraction: true,
      })
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch {
      // ignore
    }
  }

  if (flashTitle && document.visibilityState === 'visible') {
    flashOrdersPageTitle(title)
  }
}

export function flashOrdersPageTitle(message) {
  const original = document.title
  let ticks = 0
  const timer = window.setInterval(() => {
    document.title = ticks % 2 === 0 ? message : original
    ticks += 1
    if (ticks >= 6) {
      window.clearInterval(timer)
      document.title = original
    }
  }, 700)
}

let audioContext = null
let masterGain = null

/** Volume do alerta (0–1). Alto o suficiente para cozinha, sem estourar. */
const ALERT_PEAK_GAIN = 0.58

function getAudioNodes() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioContext) {
    audioContext = new Ctx()
    masterGain = audioContext.createGain()
    masterGain.connect(audioContext.destination)
  }
  masterGain.gain.value = ALERT_PEAK_GAIN
  return { ctx: audioContext, out: masterGain }
}

/** Chame após um clique do usuário para liberar o som no navegador. */
export async function primeOrderAlertAudio() {
  const nodes = getAudioNodes()
  if (!nodes) return false
  if (nodes.ctx.state === 'suspended') {
    await nodes.ctx.resume()
  }
  return nodes.ctx.state === 'running'
}

export async function playNewOrderSound() {
  try {
    const nodes = getAudioNodes()
    if (!nodes) return

    const { ctx, out } = nodes
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (ctx.state !== 'running') return
    const now = ctx.currentTime

    const playTone = (frequency, start, duration, type = 'triangle') => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = frequency
      const attack = 0.012
      const peak = 1
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + attack)
      gain.gain.setValueAtTime(peak, start + duration * 0.55)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      osc.connect(gain)
      gain.connect(out)
      osc.start(start)
      osc.stop(start + duration + 0.08)
    }

    // Duas sequências — audível, volume moderado
    const sequence = [
      [784, 0, 0.2],
      [988, 0.22, 0.2],
      [1175, 0.44, 0.24],
      [784, 0.74, 0.18],
      [988, 0.96, 0.18],
      [1175, 1.18, 0.26],
    ]

    for (const [freq, offset, dur] of sequence) {
      playTone(freq, now + offset, dur)
    }
  } catch {
    // ignore
  }
}
