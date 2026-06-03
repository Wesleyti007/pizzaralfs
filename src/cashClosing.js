import { adminFetch } from './apiAuth.js'
import { formatOrderDateTime, formatOrderMoney } from './orders.js'
import { waitForPrintDocument } from './orderPrint.js'

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
  const paymentRows = Object.entries(summary?.paymentMethods || {})
    .map(
      ([method, stats]) =>
        `<tr><td>${escapeHtml(paymentMethodLabel(method))}</td><td>${stats.count}</td><td>${escapeHtml(formatOrderMoney(stats.total))}</td></tr>`,
    )
    .join('')

  const waiterRows = (summary?.byWaiter || [])
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.name)}</td><td>${row.orderCount}</td><td>${escapeHtml(formatOrderMoney(row.salesTotal))}</td></tr>`,
    )
    .join('')

  const orderRows = soldOrders
    .slice(0, 80)
    .map(
      (order) =>
        `<tr><td>#${order.id}</td><td>${escapeHtml(formatOrderDateTime(order.createdAt))}</td><td>${escapeHtml(formatOrderMoney(order.totalAmount))}</td></tr>`,
    )
    .join('')

  const notesLine = String(notes || '').trim()
    ? `<p><strong>Obs:</strong> ${escapeHtml(notes)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Fechamento de caixa #${closing?.id ?? ''}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 16px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { margin: 0 0 12px; color: #444; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #f3f3f3; }
    .total { font-size: 14px; font-weight: bold; margin: 8px 0; }
    .section { margin-top: 14px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Pizza Ralf&apos;s — Fechamento de caixa</h1>
  <p class="meta">
    Fechamento #${closing?.id ?? '—'}<br />
    De ${escapeHtml(formatOrderDateTime(periodFrom))} até ${escapeHtml(formatOrderDateTime(periodTo))}
  </p>
  ${notesLine}
  <p class="total">Total vendido: ${escapeHtml(formatOrderMoney(summary?.soldTotal))} (${summary?.soldCount ?? 0} pedidos)</p>
  <p>Mesas: ${summary?.tableCount ?? 0} pedidos — ${escapeHtml(formatOrderMoney(summary?.tableTotal))}<br />
     Delivery: ${summary?.deliveryCount ?? 0} pedidos — ${escapeHtml(formatOrderMoney(summary?.deliveryTotal))}<br />
     Taxas de entrega: ${escapeHtml(formatOrderMoney(summary?.deliveryFeesTotal))}<br />
     Cancelados: ${summary?.cancelledCount ?? 0} — ${escapeHtml(formatOrderMoney(summary?.cancelledTotal))}</p>
  ${paymentRows ? `<div class="section"><strong>Pagamentos (delivery)</strong><table><thead><tr><th>Forma</th><th>Qtd</th><th>Total</th></tr></thead><tbody>${paymentRows}</tbody></table></div>` : ''}
  ${waiterRows ? `<div class="section"><strong>Vendas por garçom</strong><table><thead><tr><th>Garçom</th><th>Pedidos</th><th>Total</th></tr></thead><tbody>${waiterRows}</tbody></table></div>` : ''}
  ${orderRows ? `<div class="section"><strong>Pedidos do período</strong><table><thead><tr><th>Pedido</th><th>Data</th><th>Valor</th></tr></thead><tbody>${orderRows}</tbody></table></div>` : ''}
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
      'width:80mm',
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
