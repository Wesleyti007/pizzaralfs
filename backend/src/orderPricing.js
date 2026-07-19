import {
  isCalzoneCategory,
  isPizzaCategory,
  normalizeCalzoneEnabledSizes,
  normalizeMenuItemRow,
  normalizePizzaEnabledSizes,
  pizzaSizeLabel,
  calzoneSizeLabel,
} from './menuSizes.js'
import {
  effectiveExtrasForItem,
  formatExtrasSummary,
  resolveSelectedExtras,
  sumExtrasPrices,
} from './menuExtras.js'

const MENU_ITEM_COLUMNS = `id, category, subcategory, name, description, price, delivery_price, sizes, options, extras,
  min_order_qty, is_active`

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
  const optionId = String(sizeId || '').trim()
  if (optionId && Array.isArray(menuItem.options) && menuItem.options.length) {
    const option = menuItem.options.find((entry) => entry.id === optionId)
    if (option) {
      const optionPrice = Number(option.price)
      if (Number.isFinite(optionPrice) && optionPrice > 0) {
        return optionPrice
      }
      const deliveryPrice = Number(menuItem.deliveryPrice)
      if (forDelivery && Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
        return deliveryPrice
      }
      return Number(menuItem.price) || 0
    }
  }

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

function enabledSizeIdsForItem(menuItem, catalogSettings) {
  if (!catalogSettings || !menuItem) return null
  if (isPizzaCategory(menuItem.category)) {
    return new Set(normalizePizzaEnabledSizes(catalogSettings.pizzaEnabledSizes))
  }
  if (isCalzoneCategory(menuItem.category)) {
    return new Set(normalizeCalzoneEnabledSizes(catalogSettings.calzoneEnabledSizes))
  }
  return null
}

function sizeLabelForCategory(category, sizeId) {
  if (isCalzoneCategory(category)) return calzoneSizeLabel(sizeId)
  if (isPizzaCategory(category)) return pizzaSizeLabel(sizeId)
  return sizeId
}

function computeLineUnitPrice(menuById, line, forDelivery, catalogSettings) {
  const primaryId = Number(line.id)
  const flavorIds = normalizeFlavorIdList(line.flavorIds?.length ? line.flavorIds : [primaryId])
  const sizeId = String(line.sizeId || '').trim()

  const prices = flavorIds
    .map((id) => menuById.get(id))
    .filter(Boolean)
    .map((item) => {
      const enabledSizes = enabledSizeIdsForItem(item, catalogSettings)
      if (enabledSizes && sizeId && !enabledSizes.has(sizeId)) {
        const label = sizeLabelForCategory(item.category, sizeId)
        return { error: `Tamanho indisponivel: ${label}` }
      }
      return getSizePrice(item, sizeId, forDelivery)
    })

  for (const price of prices) {
    if (price && typeof price === 'object' && price.error) {
      return price
    }
  }

  if (!prices.length) {
    return { error: `Item indisponivel: ${line.name || primaryId}` }
  }

  const baseUnit = Math.max(...prices.filter((value) => typeof value === 'number'))
  const menuItem = menuById.get(primaryId)
  const availableExtras = effectiveExtrasForItem(menuItem, catalogSettings?.burgerSauces)
  const selectedExtras = resolveSelectedExtras(availableExtras, line.extraIds || line.extras)
  const extrasTotal = sumExtrasPrices(selectedExtras)

  return {
    unitPrice: Math.round((baseUnit + extrasTotal) * 100) / 100,
    selectedExtras,
  }
}

export async function priceOrderLinesFromDb(
  queryFn,
  rawItems,
  { forDelivery = false, catalogSettings = null } = {},
) {
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

    const priced = computeLineUnitPrice(menuById, line, forDelivery, catalogSettings)
    if (priced.error) return { error: priced.error }

    const unitPrice = Math.round(priced.unitPrice * 100) / 100
    subtotal += unitPrice * qty

    const extrasSummary = formatExtrasSummary(priced.selectedExtras || [])
    const stripExtras = (text) => {
      if (!extrasSummary) return String(text || '').trim()
      return String(text || '')
        .replace(` (${extrasSummary})`, '')
        .replace(`(${extrasSummary})`, '')
        .replace(` · ${extrasSummary}`, '')
        .replace(`${extrasSummary} · `, '')
        .replace(extrasSummary, '')
        .replace(/\s·\s*$/, '')
        .replace(/^\s·\s*/, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }

    // Keep extras only in sizeLabel so thermal print does not repeat them in name.
    let name = stripExtras(line.name || menuItem.name) || menuItem.name
    let sizeLabel = stripExtras(line.sizeLabel || '')

    const optionMatch = name.match(/\s—\s(.+)$/)
    if (optionMatch) {
      const optionLabel = optionMatch[1].trim()
      if (sizeLabel === optionLabel) {
        sizeLabel = ''
      } else if (sizeLabel.startsWith(`${optionLabel} · `)) {
        sizeLabel = sizeLabel.slice(optionLabel.length + 3).trim()
      }
    }

    if (extrasSummary) {
      sizeLabel = [sizeLabel, extrasSummary].filter(Boolean).join(' · ')
    }

    pricedLines.push({
      id: primaryId,
      name,
      category: String(line.category || menuItem.category).trim() || menuItem.category,
      subcategory: String(line.subcategory || menuItem.subcategory || '').trim(),
      qty,
      unitPrice,
      sizeId: String(line.sizeId || '').trim(),
      sizeLabel,
      extraIds: (priced.selectedExtras || []).map((entry) => entry.id),
    })
  }

  return {
    itemsSubtotal: Math.round(subtotal * 100) / 100,
    lines: pricedLines,
  }
}
