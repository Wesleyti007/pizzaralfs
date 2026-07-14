function isDeliveryOrder(order) {
  if (order.orderType === 'delivery') return true
  if (order.orderType === 'table') return false
  return !order.tableNumber
}

function dayKeyFromTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyInsights() {
  return {
    topItems: [],
    bottomItems: [],
    byDay: [],
    byChannel: {
      table: { count: 0, total: 0 },
      delivery: { count: 0, total: 0 },
    },
  }
}

function buildByDayAndChannel(soldOrders) {
  const byDayMap = new Map()
  const byChannel = {
    table: { count: 0, total: 0 },
    delivery: { count: 0, total: 0 },
  }

  for (const order of soldOrders) {
    const total = Number(order.totalAmount) || 0
    const channel = isDeliveryOrder(order) ? 'delivery' : 'table'
    byChannel[channel].count += 1
    byChannel[channel].total += total

    const key = dayKeyFromTimestamp(order.createdAt)
    if (!key) continue
    const prev = byDayMap.get(key) || { date: key, count: 0, total: 0 }
    prev.count += 1
    prev.total += total
    byDayMap.set(key, prev)
  }

  const byDay = [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  for (const row of byDay) {
    row.total = Math.round(row.total * 100) / 100
  }
  byChannel.table.total = Math.round(byChannel.table.total * 100) / 100
  byChannel.delivery.total = Math.round(byChannel.delivery.total * 100) / 100

  return { byDay, byChannel }
}

export async function buildSalesInsights(queryFn, orders) {
  const soldOrders = (orders || []).filter((order) => order.status !== 'cancelled')
  if (!soldOrders.length) return emptyInsights()

  const { byDay, byChannel } = buildByDayAndChannel(soldOrders)
  const orderIds = soldOrders.map((order) => Number(order.id)).filter((id) => Number.isFinite(id))

  if (!orderIds.length) {
    return { topItems: [], bottomItems: [], byDay, byChannel }
  }

  const result = await queryFn(
    `SELECT
       COALESCE(NULLIF(TRIM(item_name), ''), 'Item') AS name,
       COALESCE(NULLIF(TRIM(category), ''), '') AS category,
       SUM(quantity)::int AS qty,
       ROUND(SUM(quantity * unit_price)::numeric, 2)::float AS revenue
     FROM order_items
     WHERE order_id = ANY($1::bigint[])
     GROUP BY 1, 2
     ORDER BY SUM(quantity) DESC, SUM(quantity * unit_price) DESC, 1 ASC`,
    [orderIds],
  )

  const items = result.rows.map((row) => ({
    name: row.name,
    category: row.category || '',
    qty: Number(row.qty) || 0,
    revenue: Number(row.revenue) || 0,
  }))

  const topItems = items.slice(0, 10)
  const bottomItems =
    items.length <= 1
      ? []
      : [...items].sort((a, b) => a.qty - b.qty || a.revenue - b.revenue || a.name.localeCompare(b.name)).slice(0, 10)

  return { topItems, bottomItems, byDay, byChannel }
}
