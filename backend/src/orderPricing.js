import { normalizeMenuItemRow } from './menuSizes.js'

const MENU_ITEM_COLUMNS = `id, category, subcategory, name, description, price, delivery_price, sizes, options,
  min_order_qty, image_base64 AS image, is_active`

function normalizeFlavorIdList(raw) {
  const list = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : []
  const seen = new Set()
  const out = []
  for (const entry of list) {
    const id = Number(entry)
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function getSizePrice(menuItem, sizeId, forDelivery) {
  if (!sizeId || !Array.isArray(menuItem.sizes) || !menuItem.sizes.length) {
    const deliveryPrice = Number(menuItem.deliveryPrice)
    if (forDelivery && Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
      return deliveryPrice
    }
    return Number(menuItem.price) || 0
  }

  const size = menuItem.sizes.find((entry) => entry.id === sizeId)
  if (!size) return 0

  const deliveryPrice = Number(size.deliveryPrice)
  if (forDelivery && Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
    return deliveryPrice
  }
  return Number(size.price) || 0
}

function computeLineUnitPrice(menuById, line, forDelivery) {
  const primaryId = Number(line.id)
  const flavorIds = normalizeFlavorIdList(line.flavorIds?.length ? line.flavorIds : [primaryId])
  const sizeId = String(line.sizeId || '').trim()

  const prices = flavorIds
    .map((id) => menuById.get(id))
    .filter(Boolean)
    .map((item) => getSizePrice(item, sizeId, forDelivery))

  if (!prices.length) {
    return { error: `Item indisponivel: ${line.name || primaryId}` }
  }

  return { unitPrice: Math.max(...prices) }
}

export async function priceOrderLinesFromDb(queryFn, rawItems, { forDelivery = false } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Pedido precisa ter itens' }
  }

  const idSet = new Set()
  for (const line of rawItems) {
    const primaryId = Number(line.id)
    if (Number.isInteger(primaryId) && primaryId > 0) idSet.add(primaryId)
    for (const fid of normalizeFlavorIdList(line.flavorIds)) {
      idSet.add(fid)
    }
  }

  if (!idSet.size) {
    return { error: 'Itens do pedido invalidos' }
  }

  const ids = [...idSet]
  const result = await queryFn(
    `SELECT ${MENU_ITEM_COLUMNS} FROM menu_items WHERE id = ANY($1::bigint[])`,
    [ids],
  )

  const menuById = new Map()
  for (const row of result.rows) {
    const item = normalizeMenuItemRow(row)
    menuById.set(Number(item.id), item)
  }

  let subtotal = 0
  const pricedLines = []

  for (const line of rawItems) {
    const qty = Math.floor(Number(line.qty ?? 1))
    if (!Number.isFinite(qty) || qty < 1) {
      return { error: 'Quantidade invalida em um dos itens' }
    }

    const primaryId = Number(line.id)
    const menuItem = menuById.get(primaryId)
    if (!menuItem || menuItem.isActive === false) {
      return { error: `Item indisponivel: ${line.name || primaryId}` }
    }

    const priced = computeLineUnitPrice(menuById, line, forDelivery)
    if (priced.error) return { error: priced.error }

    const unitPrice = Math.round(priced.unitPrice * 100) / 100
    subtotal += unitPrice * qty

    pricedLines.push({
      id: primaryId,
      name: String(line.name || menuItem.name).trim() || menuItem.name,
      category: String(line.category || menuItem.category).trim() || menuItem.category,
      subcategory: String(line.subcategory || menuItem.subcategory || '').trim(),
      qty,
      unitPrice,
      sizeId: String(line.sizeId || '').trim(),
      sizeLabel: String(line.sizeLabel || '').trim(),
    })
  }

  return {
    itemsSubtotal: Math.round(subtotal * 100) / 100,
    lines: pricedLines,
  }
}
