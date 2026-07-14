import { buildSalesInsights } from './reportInsights.js'

const ORDER_SELECT = `id, table_number AS "tableNumber", order_type AS "orderType",
  customer_name AS "customerName", items_subtotal AS "itemsSubtotal",
  delivery_fee AS "deliveryFee", payment_method AS "paymentMethod",
  waiter_name AS "waiterName", total_amount AS "totalAmount", status,
  created_at AS "createdAt"`

function isDeliveryOrder(order) {
  if (order.orderType === 'delivery') return true
  if (order.orderType === 'table') return false
  return !order.tableNumber
}

function sumField(list, field) {
  return list.reduce((acc, row) => acc + (Number(row[field]) || 0), 0)
}

export function buildOrdersSummary(orders) {
  const soldOrders = orders.filter((order) => order.status !== 'cancelled')
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled')

  let tableCount = 0
  let tableTotal = 0
  let deliveryCount = 0
  let deliveryTotal = 0
  const paymentMethods = {}
  const waiterTotals = new Map()

  for (const order of soldOrders) {
    const total = Number(order.totalAmount) || 0
    if (isDeliveryOrder(order)) {
      deliveryCount += 1
      deliveryTotal += total
      const method = String(order.paymentMethod || '').trim() || 'nao_informado'
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 }
      }
      paymentMethods[method].count += 1
      paymentMethods[method].total += total
    } else {
      tableCount += 1
      tableTotal += total
      const waiter = String(order.waiterName || '').trim() || 'Sem garçom'
      const prev = waiterTotals.get(waiter) || { orderCount: 0, salesTotal: 0 }
      waiterTotals.set(waiter, {
        orderCount: prev.orderCount + 1,
        salesTotal: prev.salesTotal + total,
      })
    }
  }

  const byWaiter = [...waiterTotals.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.salesTotal - a.salesTotal || b.orderCount - a.orderCount)

  return {
    soldCount: soldOrders.length,
    soldTotal: sumField(soldOrders, 'totalAmount'),
    cancelledCount: cancelledOrders.length,
    cancelledTotal: sumField(cancelledOrders, 'totalAmount'),
    tableCount,
    tableTotal,
    deliveryCount,
    deliveryTotal,
    deliveryFeesTotal: sumField(soldOrders, 'deliveryFee'),
    itemsSubtotalTotal: sumField(soldOrders, 'itemsSubtotal'),
    paymentMethods,
    byWaiter,
  }
}

export async function getLastCashClosing(query) {
  const result = await query(
    `SELECT id, period_from AS "periodFrom", period_to AS "periodTo",
            summary, notes, created_at AS "createdAt"
     FROM cash_closings
     ORDER BY period_to DESC, id DESC
     LIMIT 1`,
  )
  return result.rows[0] ?? null
}

/** Início do período aberto: só muda quando você clica em "Fechar caixa". */
export async function resolveCashClosePeriodFrom(query) {
  const last = await getLastCashClosing(query)
  if (last?.periodTo) return new Date(last.periodTo)

  const earliest = await query(`SELECT MIN(created_at) AS start FROM orders`)
  const minOrder = earliest.rows[0]?.start
  if (minOrder) return new Date(minOrder)

  return new Date(0)
}

export async function fetchOrdersInRange(query, periodFrom, periodTo) {
  const result = await query(
    `SELECT ${ORDER_SELECT}
     FROM orders
     WHERE created_at > $1::timestamptz
       AND created_at <= $2::timestamptz
     ORDER BY created_at ASC`,
    [periodFrom, periodTo],
  )
  return result.rows
}

/** Relatório com o mesmo recorte do fechamento de caixa (horário exato, não dia inteiro). */
export async function buildOrdersReportForPeriod(query, periodFrom, periodTo) {
  const fromDate = periodFrom instanceof Date ? periodFrom : new Date(periodFrom)
  const toDate = periodTo instanceof Date ? periodTo : new Date(periodTo)
  const result = await query(
    `SELECT ${ORDER_SELECT}
     FROM orders
     WHERE created_at > $1::timestamptz
       AND created_at <= $2::timestamptz
     ORDER BY created_at DESC`,
    [fromDate, toDate],
  )
  const orders = result.rows
  const soldOrders = orders.filter((order) => order.status !== 'cancelled')
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled')
  const insights = await buildSalesInsights(query, orders)
  return {
    periodFrom: fromDate.toISOString(),
    periodTo: toDate.toISOString(),
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    summary: buildOrdersSummary(orders),
    insights,
    orders,
    soldOrders,
    cancelledOrders,
  }
}

export async function buildCashClosePreview(query, periodTo = new Date()) {
  const periodFrom = await resolveCashClosePeriodFrom(query)
  const toDate = periodTo instanceof Date ? periodTo : new Date(periodTo)
  const orders = await fetchOrdersInRange(query, periodFrom, toDate)
  const summary = buildOrdersSummary(orders)
  const insights = await buildSalesInsights(query, orders)
  const soldOrders = orders.filter((order) => order.status !== 'cancelled')
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled')

  return {
    periodFrom,
    periodTo: toDate,
    summary,
    insights,
    orders,
    soldOrders,
    cancelledOrders,
  }
}

export async function createCashClosing(query, { periodTo = new Date(), notes = '' } = {}) {
  const preview = await buildCashClosePreview(query, periodTo)
  const fromMs = new Date(preview.periodFrom).getTime()
  const toMs = new Date(preview.periodTo).getTime()
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return { ok: false, message: 'Período inválido para fechamento' }
  }

  const result = await query(
    `INSERT INTO cash_closings (period_from, period_to, summary, notes)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING id, period_from AS "periodFrom", period_to AS "periodTo",
               summary, notes, created_at AS "createdAt"`,
    [
      preview.periodFrom,
      preview.periodTo,
      JSON.stringify(preview.summary),
      String(notes || '').trim(),
    ],
  )

  return {
    ok: true,
    closing: result.rows[0],
    ...preview,
  }
}

export async function listCashClosings(query, limit = 10, offset = 0) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10))
  const safeOffset = Math.max(0, Number(offset) || 0)
  const result = await query(
    `SELECT id, period_from AS "periodFrom", period_to AS "periodTo",
            summary, notes, created_at AS "createdAt",
            COUNT(*) OVER()::int AS "totalCount"
     FROM cash_closings
     ORDER BY period_to DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset],
  )
  const totalCount = result.rows[0]?.totalCount ?? 0
  return {
    items: result.rows.map(({ totalCount: _count, ...row }) => row),
    totalCount,
    limit: safeLimit,
    offset: safeOffset,
  }
}
