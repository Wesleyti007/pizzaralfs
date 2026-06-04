import { adminFetch } from './apiAuth.js'
import { isDeliveryOrder } from './delivery.js'
import { formatPaymentSummary } from './payment.js'
import {
  formatOrderDateTime,
  formatOrderMoney,
  orderStatusLabel,
} from './orders.js'
import {
  THERMAL_PAPER_MM,
  THERMAL_PRINT_WIDTH_MM,
  thermalPrintStyles,
  waitForPrintDocument,
} from './orderPrint.js'

export const PAYMENT_METHOD_LABELS = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit: 'Cartão crédito',
  debit: 'Cartão débito',
  nao_informado: 'Não informado',
}

export function paymentMethodLabel(method) {
  const key = String(method || '').trim()
  return PAYMENT_METHOD_LABELS[key] || key || '—'
}

/** Não exibir observações internas de migração/consolidação. */
export function sanitizeCashCloseNotes(notes) {
  const raw = String(notes ?? '').trim()
  if (!raw) return ''
  if (/consolidado|corre[cç][aã]o fechamento|meia-noite/i.test(raw)) return ''
  return raw
}

async function parseJsonResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Recurso indisponível na API. Reinicie o backend: cd backend && npm run dev',
    )
  }
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.message || body.detail || fallbackMessage)
  }
  return body
}

export async function fetchCashClosePreview(apiBaseUrl, { to } = {}) {
  const params = new URLSearchParams()
  if (to) params.set('to', to)
  const qs = params.toString()
  const response = await adminFetch(
    apiBaseUrl,
    `/orders/cash-close/preview${qs ? `?${qs}` : ''}`,
  )
  return parseJsonResponse(response, 'Falha ao carregar fechamento de caixa')
}

export async function closeCashRegister(apiBaseUrl, { notes = '', periodTo } = {}) {
  const response = await adminFetch(apiBaseUrl, '/orders/cash-close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notes,
      ...(periodTo ? { periodTo } : {}),
    }),
  })
  return parseJsonResponse(response, 'Falha ao fechar caixa')
}

export async function fetchCashClosings(apiBaseUrl, limit = 15) {
  const params = new URLSearchParams({ limit: String(limit) })
  const response = await adminFetch(apiBaseUrl, `/orders/cash-closings?${params}`)
  return parseJsonResponse(response, 'Falha ao carregar histórico de fechamentos')
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildCashClosePrintHtml({
  closing,
  summary,
  periodFrom,
  periodTo,
  soldOrders = [],
  notes = '',
}) {
  const safeNotes = sanitizeCashCloseNotes(notes)
  const notesLine = safeNotes
    ? `<p class="print-line">Obs: ${escapeHtml(safeNotes)}</p>`
    : ''

  const paymentLines = Object.entries(summary?.paymentMethods || {})
    .map(
      ([method, stats]) =>
        `<p class="print-line">${escapeHtml(paymentMethodLabel(method))}: ${stats.count} · ${escapeHtml(formatOrderMoney(stats.total))}</p>`,
    )
    .join('')

  const waiterLines = (summary?.byWaiter || [])
    .map(
      (row) =>
        `<p class="print-line">${escapeHtml(row.name)}: ${row.orderCount} ped. · ${escapeHtml(formatOrderMoney(row.salesTotal))}</p>`,
    )
    .join('')

  const orderLines = soldOrders
    .slice(0, 60)
    .map(
      (order) =>
        `<p class="print-line">#${order.id} · ${escapeHtml(formatOrderDateTime(order.createdAt))} · ${escapeHtml(formatOrderMoney(order.totalAmount))}</p>`,
    )
    .join('')

  const moreOrders =
    soldOrders.length > 60
      ? `<p class="print-line">+ ${soldOrders.length - 60} pedido(s) no sistema</p>`
      : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${THERMAL_PRINT_WIDTH_MM}mm" />
  <title>Fechamento #${closing?.id ?? ''}</title>
  <style>${thermalPrintStyles()}</style>
</head>
<body>
  <div class="order-print-sheet">
    <section class="order-print-via">
      <div class="print-block print-block--header">
        <p class="print-center print-brand">PIZZA RALF'S</p>
        <p class="print-center print-via-tag">FECHAMENTO DE CAIXA</p>
        <p class="print-line">Fechamento #${closing?.id ?? '—'}</p>
        <p class="print-line">${escapeHtml(formatOrderDateTime(periodFrom))}</p>
        <p class="print-line">ate ${escapeHtml(formatOrderDateTime(periodTo))}</p>
      </div>
      <p class="print-divider">--------------------------------</p>
      <div class="print-block print-block--totals">
        <p class="print-total">TOTAL: ${escapeHtml(formatOrderMoney(summary?.soldTotal))}</p>
        <p class="print-line">${summary?.soldCount ?? 0} pedido(s) vendidos</p>
        <p class="print-line">Mesas: ${summary?.tableCount ?? 0} · ${escapeHtml(formatOrderMoney(summary?.tableTotal))}</p>
        <p class="print-line">Delivery: ${summary?.deliveryCount ?? 0} · ${escapeHtml(formatOrderMoney(summary?.deliveryTotal))}</p>
        <p class="print-line">Taxas entrega: ${escapeHtml(formatOrderMoney(summary?.deliveryFeesTotal))}</p>
        <p class="print-line">Cancelados: ${summary?.cancelledCount ?? 0} · ${escapeHtml(formatOrderMoney(summary?.cancelledTotal))}</p>
      </div>
      ${paymentLines ? `<p class="print-divider">--------------------------------</p><div class="print-block"><p class="print-dest-tag">PAGAMENTOS DELIVERY</p>${paymentLines}</div>` : ''}
      ${waiterLines ? `<p class="print-divider">--------------------------------</p><div class="print-block"><p class="print-dest-tag">GARCONS</p>${waiterLines}</div>` : ''}
      <p class="print-line print-center">Detalhe pedido a pedido: A4</p>
      ${notesLine ? `<p class="print-divider">--------------------------------</p><div class="print-block print-block--obs">${notesLine}</div>` : ''}
    </section>
  </div>
</body>
</html>`
}

export function printCashClosingReceipt({
  closing,
  summary,
  periodFrom,
  periodTo,
  soldOrders,
  notes,
}) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.setAttribute('tabindex', '-1')
    iframe.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      `width:${THERMAL_PAPER_MM}mm`,
      'height:0',
      'border:0',
      'overflow:hidden',
      'clip:rect(0,0,0,0)',
    ].join(';')

    let finished = false
    const finish = (error) => {
      if (finished) return
      finished = true
      window.setTimeout(() => {
        iframe.remove()
        if (error) reject(error)
        else resolve()
      }, 150)
    }

    document.body.appendChild(iframe)

    const win = iframe.contentWindow
    const doc = win?.document
    if (!win || !doc) {
      finish(new Error('Não foi possível preparar a impressão.'))
      return
    }

    doc.open()
    doc.write(
      buildCashClosePrintHtml({
        closing,
        summary,
        periodFrom,
        periodTo,
        soldOrders,
        notes,
      }),
    )
    doc.close()

    waitForPrintDocument(doc)
      .then(() => {
        const onAfterPrint = () => {
          win.removeEventListener('afterprint', onAfterPrint)
          finish()
        }

        win.addEventListener('afterprint', onAfterPrint)
        win.focus()
        win.print()

        window.setTimeout(() => {
          if (!finished) finish()
        }, 120000)
      })
      .catch((error) => finish(error))
  })
}

function orderDestinationLabel(order) {
  if (isDeliveryOrder(order.tableNumber, order.orderType)) return 'Delivery'
  if (order.tableNumber) return `Mesa ${order.tableNumber}`
  return '—'
}

function buildCashCloseDetailRow(order) {
  const delivery = isDeliveryOrder(order.tableNumber, order.orderType)
  const payment =
    delivery && order.paymentMethod
      ? formatPaymentSummary(order.paymentMethod, order.paymentChangeFor)
      : '—'
  const valueCell = delivery
    ? `${formatOrderMoney(order.totalAmount)}<br><small>sub. ${formatOrderMoney(order.itemsSubtotal)} + taxa ${formatOrderMoney(order.deliveryFee)}</small>`
    : formatOrderMoney(order.totalAmount)

  return `<tr>
    <td>#${order.id}</td>
    <td>${escapeHtml(formatOrderDateTime(order.createdAt))}</td>
    <td>${escapeHtml(orderDestinationLabel(order))}</td>
    <td>${escapeHtml(order.waiterName?.trim() || '—')}</td>
    <td>${escapeHtml(order.customerName?.trim() || '—')}</td>
    <td>${escapeHtml(payment)}</td>
    <td>${escapeHtml(orderStatusLabel(order.status))}</td>
    <td class="num">${valueCell}</td>
  </tr>`
}

const CASH_CLOSE_A4_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 12mm; }
  h1 { font-size: 16pt; margin: 0 0 4px; }
  .meta { margin: 0 0 12px; color: #444; font-size: 10pt; }
  .totals { margin: 0 0 16px; padding: 8px 12px; background: #f5f5f5; border-radius: 4px; }
  .totals p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; font-size: 9pt; }
  td.num { text-align: right; white-space: nowrap; }
  td small { color: #555; }
  @media print {
    @page { size: A4 portrait; margin: 10mm; }
    body { padding: 0; }
  }
`

export function buildCashCloseDetailA4Html({
  closing,
  summary,
  periodFrom,
  periodTo,
  orders = [],
  notes = '',
}) {
  const safeNotes = sanitizeCashCloseNotes(notes)
  const rows = orders.map(buildCashCloseDetailRow).join('')
  const closingLabel = closing?.id ? `Fechamento #${closing.id}` : 'Caixa aberto (prévia)'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Detalhamento ${closingLabel}</title>
  <style>${CASH_CLOSE_A4_STYLES}</style>
</head>
<body>
  <h1>Pizza Ralf's — Detalhamento de pedidos</h1>
  <p class="meta">${escapeHtml(closingLabel)} · ${escapeHtml(formatOrderDateTime(periodFrom))} até ${escapeHtml(formatOrderDateTime(periodTo))}</p>
  <div class="totals">
    <p><strong>Total vendido:</strong> ${escapeHtml(formatOrderMoney(summary?.soldTotal))} (${summary?.soldCount ?? 0} pedido(s))</p>
    <p>Mesas: ${summary?.tableCount ?? 0} · ${escapeHtml(formatOrderMoney(summary?.tableTotal))} · Delivery: ${summary?.deliveryCount ?? 0} · ${escapeHtml(formatOrderMoney(summary?.deliveryTotal))}</p>
    <p>Cancelados: ${summary?.cancelledCount ?? 0} · ${escapeHtml(formatOrderMoney(summary?.cancelledTotal))}</p>
    ${safeNotes ? `<p>Obs.: ${escapeHtml(safeNotes)}</p>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>Pedido</th>
        <th>Data</th>
        <th>Mesa</th>
        <th>Garçom</th>
        <th>Cliente</th>
        <th>Pagamento</th>
        <th>Status</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="8">Nenhum pedido no período.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`
}

function printHtmlInHiddenFrame(html, { width = '210mm' } = {}) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.setAttribute('tabindex', '-1')
    iframe.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      `width:${width}`,
      'height:0',
      'border:0',
      'overflow:hidden',
      'clip:rect(0,0,0,0)',
    ].join(';')

    let finished = false
    const finish = (error) => {
      if (finished) return
      finished = true
      window.setTimeout(() => {
        iframe.remove()
        if (error) reject(error)
        else resolve()
      }, 150)
    }

    document.body.appendChild(iframe)
    const win = iframe.contentWindow
    const doc = win?.document
    if (!win || !doc) {
      finish(new Error('Não foi possível preparar a impressão.'))
      return
    }

    doc.open()
    doc.write(html)
    doc.close()

    waitForPrintDocument(doc)
      .then(() => {
        const onAfterPrint = () => {
          win.removeEventListener('afterprint', onAfterPrint)
          finish()
        }
        win.addEventListener('afterprint', onAfterPrint)
        win.focus()
        win.print()
        window.setTimeout(() => {
          if (!finished) finish()
        }, 120000)
      })
      .catch((error) => finish(error))
  })
}

export function printCashCloseDetailA4(payload) {
  const html = buildCashCloseDetailA4Html(payload)
  return printHtmlInHiddenFrame(html, { width: '210mm' })
}
