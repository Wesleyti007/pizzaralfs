import { DEFAULT_CATEGORIES, loadCategoriesFromDb } from './categories.js'

const TOP_LIMIT = 10

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

function normalizeCategoryId(raw) {
  const id = String(raw || '')
    .trim()
    .toLowerCase()
  if (!id) return 'outros'
  if (id === 'burgers' || id === 'hamburguer') return 'hamburgueres'
  return id
}

function labelForCategory(categoryId, categories) {
  const found = (categories || []).find((entry) => entry.id === categoryId)
  if (found?.label) return found.label
  if (categoryId === 'calzone') return 'Calzone'
  if (categoryId === 'outros') return 'Outros'
  return categoryId.charAt(0).toUpperCase() + categoryId.slice(1)
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

function rankItems(items) {
  const sortedDesc = [...items].sort(
    (a, b) => b.qty - a.qty || b.revenue - a.revenue || a.name.localeCompare(b.name),
  )
  const topItems = sortedDesc.slice(0, TOP_LIMIT)
  const bottomItems =
    sortedDesc.length <= 1
      ? []
      : [...sortedDesc]
          .sort((a, b) => a.qty - b.qty || a.revenue - b.revenue || a.name.localeCompare(b.name))
          .slice(0, TOP_LIMIT)
  return { topItems, bottomItems }
}

/** Todas as categorias do catálogo + qualquer outra que apareça nos itens. */
function buildByCategory(items, categories) {
  const catalog = categories?.length ? categories : DEFAULT_CATEGORIES
  const knownOrder = new Map(catalog.map((entry, index) => [entry.id, index]))
  const groups = new Map()

  for (const entry of catalog) {
    const category = normalizeCategoryId(entry.id)
    groups.set(category, {
      category,
      label: entry.label || labelForCategory(category, categories),
      qty: 0,
      revenue: 0,
      items: [],
      fromCatalog: true,
    })
  }

  for (const item of items) {
    const category = normalizeCategoryId(item.category)
    const prev = groups.get(category) || {
      category,
      label: labelForCategory(category, categories),
      qty: 0,
      revenue: 0,
      items: [],
      fromCatalog: false,
    }
    prev.qty += item.qty
    prev.revenue += item.revenue
    prev.items.push(item)
    groups.set(category, prev)
  }

  return [...groups.values()]
    .map((group) => {
      const rankedItems = [...group.items].sort(
        (a, b) => b.qty - a.qty || b.revenue - a.revenue || a.name.localeCompare(b.name),
      )

      return {
        category: group.category,
        label: group.label,
        qty: group.qty,
        revenue: Math.round(group.revenue * 100) / 100,
        itemCount: group.items.length,
        items: rankedItems,
        topItems: rankedItems,
        bottomItems: rankedItems.length <= 1 ? [] : [...rankedItems].reverse(),
        fromCatalog: Boolean(group.fromCatalog),
      }
    })
    .sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty
      if (b.revenue !== a.revenue) return b.revenue - a.revenue
      const orderA = knownOrder.has(a.category) ? knownOrder.get(a.category) : 999
      const orderB = knownOrder.has(b.category) ? knownOrder.get(b.category) : 999
      if (orderA !== orderB) return orderA - orderB
      return a.label.localeCompare(b.label)
    })
}

async function loadCatalogMenuItems(queryFn) {
  const result = await queryFn(
    `SELECT id, name, category, is_active AS "isActive"
     FROM menu_items
     ORDER BY name ASC`,
  )
  return result.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name || '').trim() || 'Item',
    category: normalizeCategoryId(row.category),
    isActive: row.isActive !== false,
  }))
}

/** Junta cardápio completo (inclui 0 vendas e inativos) com totais vendidos no período. */
function mergeMenuWithSales(menuItems, soldRows) {
  const soldById = new Map()
  const soldWithoutId = []

  for (const row of soldRows) {
    const id = Number(row.id)
    const entry = {
      id: Number.isFinite(id) && id > 0 ? id : null,
      name: String(row.name || '').trim() || 'Item',
      category: normalizeCategoryId(row.category),
      qty: Number(row.qty) || 0,
      revenue: Number(row.revenue) || 0,
    }
    if (entry.id) {
      const prev = soldById.get(entry.id)
      if (prev) {
        prev.qty += entry.qty
        prev.revenue += entry.revenue
      } else {
        soldById.set(entry.id, entry)
      }
    } else {
      soldWithoutId.push(entry)
    }
  }

  const items = []
  for (const menu of menuItems) {
    const sold = soldById.get(menu.id)
    const baseName = menu.name
    items.push({
      id: menu.id,
      name: menu.isActive ? baseName : `${baseName} (inativo)`,
      category: menu.category,
      qty: sold?.qty || 0,
      revenue: Math.round((sold?.revenue || 0) * 100) / 100,
      isActive: menu.isActive,
    })
    soldById.delete(menu.id)
  }

  for (const sold of soldById.values()) {
    items.push({
      ...sold,
      revenue: Math.round(sold.revenue * 100) / 100,
      isActive: false,
    })
  }
  for (const sold of soldWithoutId) {
    items.push({
      ...sold,
      revenue: Math.round(sold.revenue * 100) / 100,
      isActive: false,
    })
  }

  return items
}

export async function buildSalesInsights(queryFn, orders) {
  const [categories, menuItems] = await Promise.all([
    loadCategoriesFromDb(queryFn),
    loadCatalogMenuItems(queryFn),
  ])

  // Relatório lista todas as categorias do catálogo (ativas e inativas),
  // para o cenário completo; itens do cardápio entram mesmo com 0 venda.
  const soldOrders = (orders || []).filter((order) => order.status !== 'cancelled')
  const { byDay, byChannel } = soldOrders.length
    ? buildByDayAndChannel(soldOrders)
    : {
        byDay: [],
        byChannel: { table: { count: 0, total: 0 }, delivery: { count: 0, total: 0 } },
      }

  const orderIds = soldOrders
    .map((order) => Number(order.id))
    .filter((id) => Number.isFinite(id))

  let soldRows = []
  if (orderIds.length) {
    const result = await queryFn(
      `SELECT
         oi.item_id AS id,
         COALESCE(
           NULLIF(TRIM(MAX(mi.name)), ''),
           NULLIF(TRIM(MAX(oi.item_name)), ''),
           'Item'
         ) AS name,
         COALESCE(
           NULLIF(TRIM(MAX(mi.category)), ''),
           NULLIF(TRIM(MAX(oi.category)), ''),
           ''
         ) AS category,
         SUM(oi.quantity)::int AS qty,
         ROUND(SUM(oi.quantity * oi.unit_price)::numeric, 2)::float AS revenue
       FROM order_items oi
       LEFT JOIN menu_items mi ON mi.id = oi.item_id
       WHERE oi.order_id = ANY($1::bigint[])
       GROUP BY oi.item_id
       ORDER BY SUM(oi.quantity) DESC, SUM(oi.quantity * oi.unit_price) DESC`,
      [orderIds],
    )
    soldRows = result.rows
  }

  const items = mergeMenuWithSales(menuItems, soldRows)
  const { topItems, bottomItems } = rankItems(items)
  const byCategory = buildByCategory(items, categories)

  return { topItems, bottomItems, byCategory, byDay, byChannel }
}
