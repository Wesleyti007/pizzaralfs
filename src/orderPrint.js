/** Largura da bobina: 80mm (padrão cozinha). Para 58mm, troque para 58 e PRINT_WIDTH_MM para 48. */
export const THERMAL_PAPER_MM = 80
export const THERMAL_PRINT_WIDTH_MM = 72

import { formatPhoneDisplay, isDeliveryOrder } from './delivery.js'
import { formatPaymentSummary } from './payment.js'
import {
  formatOrderDateTime,
  formatOrderMoney,
  isOrderPrinted,
  ORDER_STATUS,
} from './orders.js'

export { ORDER_STATUS, formatOrderDateTime, formatOrderMoney, isOrderPrinted }

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildItemLinesHtml(items) {
  return items
    .map((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 1)
      const unit = Number(item.unitPrice ?? item.price ?? 0)
      const name = item.itemName ?? item.name ?? 'Item'
      const size = item.sizeLabel ? ` (${item.sizeLabel})` : ''
      return `<div class="print-block print-item">
        <span class="print-item-name">${qty}x ${escapeHtml(name)}${escapeHtml(size)}</span>
        <span class="print-item-price">${formatOrderMoney(unit * qty)}</span>
      </div>`
    })
    .join('')
}

function buildDeliveryBlockHtml(order, { canhoto = false } = {}) {
  const phone = formatPhoneDisplay(order.customerPhone)
  const title = canhoto ? 'CANHOTO — DADOS ENTREGA' : 'DELIVERY — ENTREGA'

  return `
    <div class="print-block print-delivery-box${canhoto ? ' print-delivery-box--canhoto' : ''}">
      <p class="print-line print-dest-tag">${escapeHtml(title)}</p>
      <p class="print-line print-delivery-field"><span class="print-lbl">Nome:</span> ${escapeHtml(order.customerName || '')}</p>
      <p class="print-line print-delivery-field"><span class="print-lbl">WhatsApp:</span> ${escapeHtml(phone)}</p>
      <p class="print-line print-delivery-field"><span class="print-lbl">Endereco:</span> ${escapeHtml(order.deliveryAddress || '')}</p>
      <p class="print-line print-delivery-field"><span class="print-lbl">Referencia:</span> ${escapeHtml(order.deliveryReference || '')}</p>
      ${
        order.paymentMethod
          ? `<p class="print-line print-delivery-field"><span class="print-lbl">Pagamento:</span> ${escapeHtml(formatPaymentSummary(order.paymentMethod, order.paymentChangeFor))}</p>`
          : ''
      }
      ${
        order.deliveryDistanceKm != null
          ? `<p class="print-line print-delivery-field"><span class="print-lbl">Distancia:</span> ${escapeHtml(String(order.deliveryDistanceKm))} km</p>`
          : ''
      }
    </div>
  `
}

function buildDestinationHtml(order) {
  if (isDeliveryOrder(order.tableNumber ?? order.mesa, order.orderType)) {
    return buildDeliveryBlockHtml(order, { canhoto: false })
  }

  const mesa = order.tableNumber ? `Mesa ${order.tableNumber}` : 'Mesa nao identificada'
  return `<div class="print-block print-block--mesa"><p class="print-line print-mesa">${escapeHtml(mesa)}</p></div>`
}

function buildTotalsHtml(order) {
  const total = order.totalAmount ?? order.total
  const fee = Number(order.deliveryFee ?? 0)
  const sub = Number(order.itemsSubtotal ?? 0)
  if (fee > 0) {
    const subtotalLine =
      sub > 0
        ? `<p class="print-line">Subtotal: ${formatOrderMoney(sub)}</p>`
        : ''
    return `<div class="print-block print-block--totals">${subtotalLine}
      <p class="print-line">Taxa entrega: ${formatOrderMoney(fee)}</p>
      <p class="print-total">TOTAL: ${formatOrderMoney(total)}</p></div>`
  }
  return `<div class="print-block print-block--totals"><p class="print-total">TOTAL: ${formatOrderMoney(total)}</p></div>`
}

function buildViaHtml(order, items, viaNumber) {
  const viaLabel = `${viaNumber}a VIA`

  return `
    <section class="order-print-via">
      <div class="print-block print-block--header">
        <p class="print-center print-brand">PIZZA RALF'S</p>
        <p class="print-center print-via-tag">${escapeHtml(viaLabel)}</p>
        <p class="print-line">Pedido #${order.id}</p>
        <p class="print-line">${escapeHtml(formatOrderDateTime(order.createdAt))}</p>
      </div>
      ${buildDestinationHtml(order)}
      <p class="print-divider">--------------------------------</p>
      <div class="print-block print-block--items">
        <div class="print-items">${buildItemLinesHtml(items)}</div>
      </div>
      <p class="print-divider">--------------------------------</p>
      ${buildTotalsHtml(order)}
      <div class="print-block print-block--obs">
        <p class="print-obs">Obs: ${escapeHtml(order.observation || 'Sem observacoes')}</p>
      </div>
    </section>
  `
}

/** 3ª parte no delivery: canhoto completo (mesmas informações, separado por linha de corte). */
function buildCanhotoEntregaHtml(order, items) {
  return `
    <section class="order-print-via order-print-via--canhoto">
      <div class="print-block print-block--header">
        <p class="print-center print-brand">PIZZA RALF'S</p>
        <p class="print-center print-via-tag">CANHOTO — ENTREGA</p>
        <p class="print-line">Pedido #${order.id}</p>
        <p class="print-line">${escapeHtml(formatOrderDateTime(order.createdAt))}</p>
      </div>
      ${buildDeliveryBlockHtml(order, { canhoto: true })}
      <p class="print-divider">--------------------------------</p>
      <div class="print-block print-block--items">
        <div class="print-items">${buildItemLinesHtml(items)}</div>
      </div>
      <p class="print-divider">--------------------------------</p>
      ${buildTotalsHtml(order)}
      <div class="print-block print-block--obs">
        <p class="print-obs">Obs: ${escapeHtml(order.observation || 'Sem observacoes')}</p>
      </div>
    </section>
  `
}

function buildPrintTearLine(label) {
  return `<p class="order-print-tear" role="separator">${escapeHtml(label)}</p>`
}

function thermalPrintStyles() {
  const w = THERMAL_PRINT_WIDTH_MM
  const paper = THERMAL_PAPER_MM

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${w}mm;
      max-width: ${w}mm;
      background: #fff;
      color: #000;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .order-print-sheet {
      width: ${w}mm;
      max-width: ${w}mm;
      padding: 2mm 1mm 4mm;
    }
    .order-print-via {
      width: 100%;
      padding: 0;
    }
    .order-print-via--canhoto {
      border: 1px dashed #000;
      padding: 2mm 1mm;
      margin: 0;
    }
    .order-print-tear {
      margin: 2mm 0 1mm;
      padding: 1mm 0 0;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      border-top: 1px dashed #000;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .print-block {
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    .print-block--header,
    .print-block--mesa,
    .print-block--totals,
    .print-block--obs,
    .print-delivery-box {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .print-center { text-align: center; }
    .print-brand {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .print-via-tag {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .print-line {
      margin-bottom: 3px;
      font-size: 12px;
      orphans: 2;
      widows: 2;
    }
    .print-mesa { font-size: 13px; font-weight: 700; }
    .print-dest-tag {
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 4px;
    }
    .print-delivery-box {
      margin: 5px 0 6px;
      padding: 4px 3px;
      border: 2px solid #000;
    }
    .print-delivery-box--canhoto {
      border-width: 3px;
      margin: 6px 0;
      padding: 5px 4px;
    }
    .print-delivery-field {
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
      word-wrap: break-word;
    }
    .print-lbl {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
    }
    .print-divider {
      margin: 5px 0;
      font-size: 11px;
      text-align: center;
      letter-spacing: -1px;
    }
    .print-items { margin: 4px 0; }
    .print-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 5px;
      font-size: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .print-item-name {
      flex: 1;
      min-width: 0;
      word-wrap: break-word;
    }
    .print-item-price {
      flex-shrink: 0;
      font-weight: 700;
      white-space: nowrap;
    }
    .print-total {
      font-size: 14px;
      font-weight: 700;
      text-align: right;
      margin: 4px 0;
    }
    .print-obs {
      font-size: 11px;
      margin-top: 4px;
      word-wrap: break-word;
    }
    @page {
      size: ${paper}mm auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: ${w}mm;
        max-width: ${w}mm;
      }
      .order-print-sheet {
        width: ${w}mm;
      }
      .print-block,
      .print-item,
      .print-delivery-box,
      .print-block--items {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .order-print-tear {
        break-before: avoid;
        page-break-before: avoid;
        break-after: avoid;
        page-break-after: avoid;
      }
      .order-print-via {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `
}

export function buildOrderPrintHtml(order, items) {
  const isDelivery = isDeliveryOrder(order.tableNumber ?? order.mesa, order.orderType)

  const segundaVia = `
    ${buildPrintTearLine('--- 2a VIA ---')}
    ${buildViaHtml(order, items, 2)}
  `

  const canhotoEntrega = isDelivery
    ? `
    ${buildPrintTearLine('--- CANHOTO ENTREGA ---')}
    ${buildCanhotoEntregaHtml(order, items)}
  `
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${THERMAL_PRINT_WIDTH_MM}mm" />
  <title>Pedido #${order.id}</title>
  <style>${thermalPrintStyles()}</style>
</head>
<body>
  <div class="order-print-sheet">
    ${buildViaHtml(order, items, 1)}
    ${segundaVia}
    ${canhotoEntrega}
  </div>
</body>
</html>`
}

function waitForPrintDocument(doc) {
  return new Promise((resolve) => {
    if (doc.readyState === 'complete') {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve)
      })
      return
    }

    const onReady = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve)
      })
    }

    doc.addEventListener('DOMContentLoaded', onReady, { once: true })
    window.setTimeout(onReady, 500)
  })
}

export function printOrderDocument(order, items) {
  return new Promise((resolve) => {
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
    const finish = () => {
      if (finished) return
      finished = true
      window.setTimeout(() => {
        iframe.remove()
        resolve()
      }, 150)
    }

    document.body.appendChild(iframe)

    const win = iframe.contentWindow
    const doc = win?.document
    if (!win || !doc) {
      finish()
      return
    }

    doc.open()
    doc.write(buildOrderPrintHtml(order, items))
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
      .catch(finish)
  })
}
