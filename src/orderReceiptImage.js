import { formatPhoneDisplay, isDeliveryOrder } from './delivery.js'
import { formatPaymentSummary } from './payment.js'

const RECEIPT_WIDTH = 420
const PADDING = 28
const LINE_HEIGHT = 22
const SCALE = 2

function wrapText(ctx, text, maxWidth) {
  const words = String(text ?? '').split(/\s+/)
  const lines = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function formatReceiptDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'R$ 0,00'
  return `R$ ${numeric.toFixed(2).replace('.', ',')}`
}

function buildReceiptLines(order) {
  const lines = [
    { text: "PIZZA RALF'S", bold: true, center: true, size: 20 },
    { text: 'Comprovante do pedido', center: true, muted: true },
    { gap: 10 },
    { text: `Pedido #${order.id}`, bold: true },
    { text: formatReceiptDate(order.createdAt), muted: true },
  ]

  if (isDeliveryOrder(order.mesa ?? order.tableNumber, order.orderType)) {
    lines.push({ text: 'DELIVERY', bold: true })
    lines.push({ text: `Cliente: ${order.customerName || ''}` })
    lines.push({ text: `WhatsApp: ${formatPhoneDisplay(order.customerPhone)}` })
    lines.push({ text: `Endereço: ${order.deliveryAddress || ''}`, wrap: true })
    lines.push({ text: `Referência: ${order.deliveryReference || ''}`, wrap: true })
    if (order.paymentMethod) {
      lines.push({
        text: `Pagamento: ${formatPaymentSummary(order.paymentMethod, order.paymentChangeFor)}`,
        wrap: true,
      })
    }
  } else {
    const mesa = order.mesa ?? order.tableNumber
    lines.push({ text: mesa ? `Mesa ${mesa}` : 'Mesa não identificada' })
  }

  lines.push(
    { gap: 8 },
    { text: 'Itens', bold: true },
  )

  for (const item of order.items || []) {
    const qty = Number(item.qty ?? item.quantity ?? 1)
    const lineTotal = (Number(item.price) || 0) * qty
    const label = item.categoryLabel ? `${item.name} (${item.categoryLabel})` : item.name
    lines.push({ text: `${qty}x ${label}`, wrap: true })
    if (item.sizeLabel) {
      lines.push({ text: item.sizeLabel, muted: true, indent: 12 })
    }
    lines.push({ text: formatMoney(lineTotal), alignRight: true })
    lines.push({ gap: 4 })
  }

  lines.push({ gap: 6 })
  const fee = Number(order.deliveryFee ?? 0)
  const sub = Number(order.itemsSubtotal ?? 0)
  if (fee > 0) {
    if (sub > 0) {
      lines.push({ text: `Subtotal: ${formatMoney(sub)}` })
    }
    lines.push({ text: `Taxa de entrega: ${formatMoney(fee)}` })
  }
  lines.push({ text: `Total: ${formatMoney(order.total ?? order.totalAmount)}`, bold: true, size: 18 })
  lines.push({ gap: 8 })
  lines.push({
    text: `Observação: ${(order.observation || '').trim() || 'Sem observações'}`,
    wrap: true,
    muted: true,
  })

  return lines
}

function measureReceiptHeight(ctx, lines, contentWidth) {
  let y = PADDING
  for (const line of lines) {
    if (line.gap) {
      y += line.gap
      continue
    }
    const fontSize = line.size || (line.bold ? 15 : 13)
    if (line.wrap) {
      ctx.font = `${line.bold ? '600 ' : ''}${fontSize}px system-ui, -apple-system, sans-serif`
      const wrapped = wrapText(ctx, line.text, contentWidth - (line.indent || 0))
      y += wrapped.length * LINE_HEIGHT
    } else {
      y += LINE_HEIGHT + (fontSize > 15 ? 4 : 0)
    }
  }
  return y + PADDING
}

/**
 * Gera e baixa um PNG do comprovante do pedido (uso imediato após finalizar).
 */
export function downloadOrderReceiptImage(order) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Não foi possível gerar a imagem.'))
      return
    }

    const contentWidth = RECEIPT_WIDTH - PADDING * 2
    const lines = buildReceiptLines(order)
    const height = measureReceiptHeight(ctx, lines, contentWidth)

    canvas.width = RECEIPT_WIDTH * SCALE
    canvas.height = height * SCALE
    ctx.scale(SCALE, SCALE)

    ctx.fillStyle = '#faf6ef'
    ctx.fillRect(0, 0, RECEIPT_WIDTH, height)

    ctx.strokeStyle = '#c5a059'
    ctx.lineWidth = 3
    ctx.strokeRect(12, 12, RECEIPT_WIDTH - 24, height - 24)

    let y = PADDING + 4

    const drawLine = (line) => {
      const fontSize = line.size || (line.bold ? 15 : 13)
      const color = line.muted ? '#6b5b4f' : '#2c1810'
      ctx.fillStyle = color
      ctx.font = `${line.bold ? '600 ' : ''}${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`

      const xBase = PADDING + (line.indent || 0)

      if (line.wrap) {
        const wrapped = wrapText(ctx, line.text, contentWidth - (line.indent || 0))
        for (const part of wrapped) {
          ctx.fillText(part, xBase, y)
          y += LINE_HEIGHT
        }
        return
      }

      const textWidth = ctx.measureText(line.text).width
      let x = xBase
      if (line.center) x = (RECEIPT_WIDTH - textWidth) / 2
      if (line.alignRight) x = RECEIPT_WIDTH - PADDING - textWidth

      ctx.fillText(line.text, x, y)
      y += LINE_HEIGHT + (fontSize > 15 ? 4 : 0)
    }

    for (const line of lines) {
      if (line.gap) {
        y += line.gap
        continue
      }
      drawLine(line)
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível gerar a imagem.'))
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `comprovante-pedido-${order.id}.png`
        link.rel = 'noopener'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        resolve()
      },
      'image/png',
      1,
    )
  })
}
