export const ORDER_STATUS = {
  PENDING: 'pending',
  PRINTED: 'printed',
  PREPARING: 'preparing',
  DONE: 'done',
  CANCELLED: 'cancelled',
}

export function isOrderCancelled(status) {
  return status === ORDER_STATUS.CANCELLED
}

export function isOrderPrinted(status) {
  return status === ORDER_STATUS.PRINTED
}

/** Pedido contabilizado como venda (não cancelado). */
export function isOrderSold(status) {
  return !isOrderCancelled(status)
}

export function orderStatusLabel(status) {
  if (isOrderCancelled(status)) return 'Cancelado'
  if (status === ORDER_STATUS.DONE) return 'Concluído'
  if (status === ORDER_STATUS.PREPARING) return 'Em preparo'
  if (isOrderPrinted(status)) return 'Impresso'
  return 'Não impresso'
}

export function orderStatusBadgeClass(status) {
  if (isOrderCancelled(status)) return 'orders-status-badge--cancelled'
  if (status === ORDER_STATUS.DONE) return 'orders-status-badge--done'
  if (isOrderPrinted(status)) return 'orders-status-badge--printed'
  return 'orders-status-badge--pending'
}

export function formatOrderDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatOrderMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'R$ 0,00'
  return `R$ ${numeric.toFixed(2).replace('.', ',')}`
}

export function todayDateInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateInputDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function fetchOrdersReport(apiBaseUrl, from, to) {
  const params = new URLSearchParams({ from, to })
  const response = await fetch(`${apiBaseUrl}/orders/report?${params}`)

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Relatório indisponível na API. Reinicie o backend: cd backend && npm run dev',
    )
  }

  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.message || body.detail || 'Falha ao carregar relatório')
  }

  return body
}

export async function patchOrderStatus(apiBaseUrl, orderId, status) {
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'Falha ao atualizar status')
  }
  return response.json()
}
