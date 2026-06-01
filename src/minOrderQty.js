import { getCategoryLabel } from './catalog.js'

export function normalizeMinOrderQty(value) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(99, parsed)
}

export function getMinOrderQty(item) {
  return normalizeMinOrderQty(item?.minOrderQty)
}

/** Mínimo da categoria = maior minOrderQty entre os itens ativos (ex.: esfirras = 5). */
export function getCategoryMinOrderRequirement(menuItems, categoryId) {
  if (!Array.isArray(menuItems) || !categoryId) return 1

  const mins = menuItems
    .filter((item) => item.category === categoryId && item.isActive !== false)
    .map((item) => getMinOrderQty(item))
    .filter((min) => min > 1)

  return mins.length ? Math.max(...mins) : 1
}

export function formatMinOrderHint(menuItem, menuItems, categories) {
  const required = getCategoryMinOrderRequirement(menuItems, menuItem?.category)
  if (required <= 1) return null

  const label = categories?.length
    ? getCategoryLabel(categories, menuItem.category)
    : 'itens desta categoria'

  return `Mínimo ${required} ${label.toLowerCase()} no pedido (podem ser sabores diferentes)`
}

export function validateCartMinOrderQty(cart, menuItems = [], categories = []) {
  if (!Array.isArray(cart) || !cart.length) return { ok: true }

  const categoriesWithMin = new Set()
  for (const item of menuItems) {
    if (item.isActive === false) continue
    if (getMinOrderQty(item) > 1) categoriesWithMin.add(item.category)
  }

  const qtyByCategory = new Map()
  for (const line of cart) {
    const cat = String(line.category || '').trim()
    if (!cat) continue
    qtyByCategory.set(cat, (qtyByCategory.get(cat) || 0) + Math.floor(Number(line.qty) || 0))
  }

  for (const categoryId of categoriesWithMin) {
    const required = getCategoryMinOrderRequirement(menuItems, categoryId)
    if (required <= 1) continue

    const total = qtyByCategory.get(categoryId) || 0
    if (total < required) {
      const label = getCategoryLabel(categories, categoryId) || categoryId
      const missing = required - total
      return {
        ok: false,
        message: `${label}: mínimo ${required} unidades no pedido (sabores diferentes). Você tem ${total}; faltam ${missing}.`,
        categoryId,
      }
    }
  }

  return { ok: true }
}
