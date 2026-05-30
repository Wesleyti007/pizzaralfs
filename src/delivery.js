export const DELIVERY_INFO_STORAGE_KEY = 'pizza-ralfs-delivery-info'

const EMPTY_DELIVERY = {
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  deliveryReference: '',
}

export function isDeliveryOrder(tableNumber, orderType) {
  if (orderType === 'delivery') return true
  if (orderType === 'table') return false
  return tableNumber === null || tableNumber === undefined || tableNumber === ''
}

export function loadDeliveryInfoFromSession() {
  try {
    const raw = sessionStorage.getItem(DELIVERY_INFO_STORAGE_KEY)
    if (!raw) return { ...EMPTY_DELIVERY }
    const parsed = JSON.parse(raw)
    return {
      customerName: String(parsed.customerName || '').trim(),
      customerPhone: String(parsed.customerPhone || '').trim(),
      deliveryAddress: String(parsed.deliveryAddress || '').trim(),
      deliveryReference: String(parsed.deliveryReference || '').trim(),
    }
  } catch {
    return { ...EMPTY_DELIVERY }
  }
}

export function saveDeliveryInfoToSession(info) {
  sessionStorage.setItem(DELIVERY_INFO_STORAGE_KEY, JSON.stringify(info))
}

/** Mantém só dígitos; se começar com 55 e tiver 12+ dígitos, usa como está. */
export function normalizePhoneDigits(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) {
    return digits
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`
  }
  return digits
}

export function formatPhoneDisplay(value) {
  const digits = normalizePhoneDigits(value)
  if (digits.length < 12) return String(value ?? '').trim()
  const local = digits.startsWith('55') ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return `+${digits}`
}

export function whatsAppLink(phoneDigits) {
  const digits = normalizePhoneDigits(phoneDigits)
  if (digits.length < 12) return null
  return `https://wa.me/${digits}`
}

export function getDeliveryFieldErrors(info) {
  const customerName = String(info?.customerName || '').trim()
  const customerPhone = normalizePhoneDigits(info?.customerPhone)
  const deliveryAddress = String(info?.deliveryAddress || '').trim()
  const deliveryReference = String(info?.deliveryReference || '').trim()

  const errors = {}
  if (!customerName) errors.customerName = 'Obrigatório'
  if (customerPhone.length < 12) errors.customerPhone = 'WhatsApp obrigatório (com DDD)'
  if (!deliveryAddress) errors.deliveryAddress = 'Obrigatório'
  if (!deliveryReference) errors.deliveryReference = 'Obrigatório'
  return errors
}

export function isDeliveryInfoComplete(info) {
  return Object.keys(getDeliveryFieldErrors(info)).length === 0
}

export function validateDeliveryInfo(info) {
  const errors = getDeliveryFieldErrors(info)
  const firstKey = Object.keys(errors)[0]
  if (firstKey) {
    const messages = {
      customerName: 'Informe seu nome (obrigatório).',
      customerPhone: 'Informe um WhatsApp válido com DDD (obrigatório).',
      deliveryAddress: 'Informe o endereço de entrega (obrigatório).',
      deliveryReference: 'Informe o ponto de referência (obrigatório).',
    }
    return { ok: false, message: messages[firstKey] || 'Preencha todos os campos obrigatórios.' }
  }

  const customerName = String(info?.customerName || '').trim()
  const customerPhone = normalizePhoneDigits(info?.customerPhone)
  const deliveryAddress = String(info?.deliveryAddress || '').trim()
  const deliveryReference = String(info?.deliveryReference || '').trim()

  return {
    ok: true,
    data: {
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryReference,
    },
  }
}

export function formatDeliverySummary(order) {
  if (!isDeliveryOrder(order?.tableNumber ?? order?.mesa, order?.orderType)) {
    return null
  }
  return [
    order.customerName || 'Cliente',
    formatPhoneDisplay(order.customerPhone),
    order.deliveryAddress,
    `Ref.: ${order.deliveryReference || '—'}`,
  ].filter(Boolean)
}
