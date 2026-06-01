export const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'credit', label: 'Cartão de crédito' },
  { id: 'debit', label: 'Cartão de débito' },
]

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.label]))

export function isCashPayment(method) {
  return method === 'cash'
}

export function parseMoneyInput(value) {
  const raw = String(value ?? '')
    .trim()
    .replace(/[^\d,.-]/g, '')
  if (!raw) return null
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const numeric = Number(normalized)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.round(numeric * 100) / 100
}

export function formatMoneyBr(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'R$ 0,00'
  return `R$ ${numeric.toFixed(2).replace('.', ',')}`
}

export function formatPaymentMethodLabel(method) {
  const id = String(method ?? '').trim()
  return PAYMENT_LABELS[id] || (id ? id : '—')
}

export function formatPaymentSummary(method, changeFor) {
  const label = formatPaymentMethodLabel(method)
  if (!isCashPayment(method)) return label
  const amount = Number(changeFor)
  if (!Number.isFinite(amount) || amount <= 0) return `${label} (troco não informado)`
  return `${label} — troco para ${formatMoneyBr(amount)}`
}

export function getPaymentFieldErrors(info, { orderTotal } = {}) {
  const errors = {}
  const paymentMethod = String(info?.paymentMethod ?? '').trim()

  if (!paymentMethod) {
    errors.paymentMethod = 'Obrigatório'
    return errors
  }

  if (!PAYMENT_LABELS[paymentMethod]) {
    errors.paymentMethod = 'Inválido'
    return errors
  }

  if (isCashPayment(paymentMethod)) {
    const changeFor = parseMoneyInput(info?.paymentChangeFor)
    if (changeFor == null || changeFor <= 0) {
      errors.paymentChangeFor = 'Informe o valor'
    } else if (
      orderTotal != null &&
      Number.isFinite(Number(orderTotal)) &&
      changeFor + 0.009 < Number(orderTotal)
    ) {
      errors.paymentChangeFor = 'Menor que o total do pedido'
    }
  }

  return errors
}

export function normalizePaymentForOrder(info, { orderTotal } = {}) {
  const paymentMethod = String(info?.paymentMethod ?? '').trim()
  const errors = getPaymentFieldErrors(info, { orderTotal })
  if (Object.keys(errors).length) return { ok: false, errors }

  let paymentChangeFor = null
  if (isCashPayment(paymentMethod)) {
    paymentChangeFor = parseMoneyInput(info?.paymentChangeFor)
  }

  return {
    ok: true,
    data: {
      paymentMethod,
      paymentChangeFor,
    },
  }
}
