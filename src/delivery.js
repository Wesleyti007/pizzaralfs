import {
  formatPaymentSummary,
  getPaymentFieldErrors as getPaymentFieldErrorsFromModule,
  isCashPayment,
  normalizePaymentForOrder,
} from './payment.js'

export const DELIVERY_INFO_STORAGE_KEY = 'pizza-ralfs-delivery-info'

/** Regiões fora do perímetro urbano — taxa de entrega a confirmar com o restaurante. */
export const DELIVERY_CONSULT_AREAS = ['Coxos', 'Gregório', 'Jacurici', 'Barragem']

function normalizeForAreaMatch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isOutskirtDeliveryAddress(address) {
  const haystack = normalizeForAreaMatch(address)
  if (!haystack) return false
  return DELIVERY_CONSULT_AREAS.some((area) => haystack.includes(normalizeForAreaMatch(area)))
}

const EMPTY_DELIVERY = {
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  deliveryReference: '',
  paymentMethod: '',
  paymentChangeFor: '',
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
    const legacyAddress = [
      parsed.street,
      parsed.number,
      parsed.neighborhood,
      parsed.city,
      parsed.state,
      parsed.cep,
    ]
      .filter(Boolean)
      .join(', ')
    return {
      customerName: String(parsed.customerName || '').trim(),
      customerPhone: String(parsed.customerPhone || '').trim(),
      deliveryAddress: String(
        parsed.deliveryAddress || legacyAddress || parsed.deliveryStreet || '',
      ).trim(),
      deliveryReference: String(parsed.deliveryReference || '').trim(),
      paymentMethod: String(parsed.paymentMethod || '').trim(),
      paymentChangeFor:
        parsed.paymentChangeFor != null && parsed.paymentChangeFor !== ''
          ? String(parsed.paymentChangeFor)
          : '',
    }
  } catch {
    return { ...EMPTY_DELIVERY }
  }
}

export function saveDeliveryInfoToSession(info) {
  sessionStorage.setItem(DELIVERY_INFO_STORAGE_KEY, JSON.stringify(info))
}

export function buildDeliveryAddressForOrder(info) {
  return String(info?.deliveryAddress || '').trim()
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

export function getDeliveryFieldErrors(info, options = {}) {
  const customerName = String(info?.customerName || '').trim()
  const customerPhone = normalizePhoneDigits(info?.customerPhone)
  const deliveryAddress = String(info?.deliveryAddress || '').trim()
  const deliveryReference = String(info?.deliveryReference || '').trim()

  const errors = {}
  if (!customerName) errors.customerName = 'Obrigatório'
  if (customerPhone.length < 12) errors.customerPhone = 'WhatsApp obrigatório (com DDD)'
  if (!deliveryAddress) errors.deliveryAddress = 'Obrigatório'
  if (!deliveryReference) errors.deliveryReference = 'Obrigatório'

  const paymentErrors = getPaymentFieldErrorsFromModule(info, options)
  Object.assign(errors, paymentErrors)
  return errors
}

export function isDeliveryInfoComplete(info) {
  return Object.keys(getDeliveryFieldErrors(info)).length === 0
}

export function validateDeliveryInfo(info, options = {}) {
  const errors = getDeliveryFieldErrors(info, options)
  const firstKey = Object.keys(errors)[0]
  if (firstKey) {
    const messages = {
      customerName: 'Informe seu nome (obrigatório).',
      customerPhone: 'Informe um WhatsApp válido com DDD (obrigatório).',
      deliveryAddress: 'Informe o endereço de entrega (obrigatório).',
      deliveryReference: 'Informe o ponto de referência (obrigatório).',
      paymentMethod: 'Selecione a forma de pagamento.',
      paymentChangeFor: isCashPayment(info?.paymentMethod)
        ? 'Informe para quanto precisa de troco (valor da nota/cédula).'
        : 'Valor de troco inválido.',
    }
    return { ok: false, message: messages[firstKey] || 'Preencha todos os campos obrigatórios.' }
  }

  const payment = normalizePaymentForOrder(info, options)
  if (!payment.ok) {
    return { ok: false, message: 'Verifique a forma de pagamento.' }
  }

  return {
    ok: true,
    data: {
      customerName: String(info?.customerName || '').trim(),
      customerPhone: normalizePhoneDigits(info?.customerPhone),
      deliveryAddress: buildDeliveryAddressForOrder(info),
      deliveryReference: String(info?.deliveryReference || '').trim(),
      paymentMethod: payment.data.paymentMethod,
      paymentChangeFor: payment.data.paymentChangeFor,
    },
  }
}

export function formatDeliverySummary(order) {
  if (!isDeliveryOrder(order?.tableNumber ?? order?.mesa, order?.orderType)) {
    return null
  }
  const lines = [
    order.customerName || 'Cliente',
    formatPhoneDisplay(order.customerPhone),
    order.deliveryAddress,
    `Ref.: ${order.deliveryReference || '—'}`,
  ]
  if (order.paymentMethod) {
    lines.push(`Pagamento: ${formatPaymentSummary(order.paymentMethod, order.paymentChangeFor)}`)
  }
  return lines.filter(Boolean)
}
