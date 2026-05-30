import * as XLSX from 'xlsx'
import { formatOrderDateTime, orderStatusLabel } from './orders.js'

function orderSheetRows(orders) {
  const header = ['Pedido', 'Data', 'Mesa', 'Status', 'Valor (R$)', 'Observação']
  const rows = orders.map((order) => [
    order.id,
    formatOrderDateTime(order.createdAt),
    order.tableNumber ?? '',
    orderStatusLabel(order.status),
    Number(order.totalAmount) || 0,
    order.observation?.trim() || '',
  ])
  return [header, ...rows]
}

/**
 * Gera e baixa um .xlsx com resumo e abas de pedidos do relatório atual.
 */
export function downloadOrdersReportExcel(report, fromDate, toDate) {
  if (!report?.summary) return

  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Pizza Ralfs — Relatório de pedidos'],
    ['Período', `${fromDate} a ${toDate}`],
    [],
    ['Métrica', 'Quantidade', 'Total (R$)'],
    ['Pedidos vendidos', report.summary.soldCount, report.summary.soldTotal],
    ['Pedidos cancelados', report.summary.cancelledCount, report.summary.cancelledTotal],
  ])
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
