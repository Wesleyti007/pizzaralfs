import * as XLSX from 'xlsx'
import { paymentMethodLabel } from './cashClosing.js'
import { isDeliveryOrder } from './delivery.js'
import { formatOrderDateTime, orderStatusLabel } from './orders.js'
import { formatPaymentSummary } from './payment.js'

function orderSheetRows(orders) {
  const header = [
    'Pedido',
    'Data',
    'Tipo',
    'Mesa',
    'Garçom',
    'Cliente',
    'Pagamento',
    'Subtotal (R$)',
    'Taxa entrega (R$)',
    'Total (R$)',
    'Status',
    'Observação',
  ]
  const rows = orders.map((order) => {
    const delivery = isDeliveryOrder(order.tableNumber, order.orderType)
    return [
      order.id,
      formatOrderDateTime(order.createdAt),
      delivery ? 'Delivery' : 'Mesa',
      delivery ? '' : order.tableNumber ?? '',
      order.waiterName?.trim() || '',
      order.customerName?.trim() || '',
      delivery && order.paymentMethod
        ? formatPaymentSummary(order.paymentMethod, order.paymentChangeFor)
        : '',
      delivery ? Number(order.itemsSubtotal) || 0 : '',
      delivery ? Number(order.deliveryFee) || 0 : '',
      Number(order.totalAmount) || 0,
      orderStatusLabel(order.status),
      order.observation?.trim() || '',
    ]
  })
  return [header, ...rows]
}

function summarySheetRows(summary, fromDate, toDate) {
  const rows = [
    ['Pizza Ralfs — Relatório de pedidos'],
    ['Período', `${fromDate} a ${toDate}`],
    [],
    ['Métrica', 'Quantidade', 'Total (R$)'],
    ['Total vendido', summary.soldCount, summary.soldTotal],
    ['Mesas', summary.tableCount, summary.tableTotal],
    ['Delivery', summary.deliveryCount, summary.deliveryTotal],
    ['Taxas de entrega', '', summary.deliveryFeesTotal],
    ['Cancelados', summary.cancelledCount, summary.cancelledTotal],
  ]

  const paymentEntries = Object.entries(summary.paymentMethods || {})
  if (paymentEntries.length) {
    rows.push([], ['Pagamentos (delivery)', 'Qtd', 'Total (R$)'])
    for (const [method, stats] of paymentEntries) {
      rows.push([paymentMethodLabel(method), stats.count, stats.total])
    }
  }

  if (summary.byWaiter?.length) {
    rows.push([], ['Garçom (mesas)', 'Pedidos', 'Total (R$)'])
    for (const row of summary.byWaiter) {
      rows.push([row.name, row.orderCount, row.salesTotal])
    }
  }

  return rows
}

/**
 * Gera e baixa um .xlsx com resumo e abas de pedidos do relatório atual.
 */
export function downloadOrdersReportExcel(report, fromDate, toDate) {
  if (!report?.summary) return

  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetRows(report.summary, fromDate, toDate))
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo')

  const sheets = [
    { name: 'Todos', orders: report.orders },
    { name: 'Vendas', orders: report.soldOrders },
    { name: 'Cancelados', orders: report.cancelledOrders },
  ]

  for (const { name, orders } of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(orderSheetRows(orders))
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  }

  const fileName = `relatorio-pizzaralfs_${fromDate}_${toDate}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
