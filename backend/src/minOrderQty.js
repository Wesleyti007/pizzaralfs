import { findCategory, loadCategoriesFromDb, normalizeCategories } from './categories.js'

export function normalizeMinOrderQty(value) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(99, parsed)
}

export function getMinOrderGroupKey(line, categories) {
  const categoryId = String(line?.category || '').trim()
  if (!categoryId) return null

  const category = findCategory(categories, categoryId)
  if (!category) return null

  const subcategoryId = String(line?.subcategory || '').trim()
  if (subcategoryId) {
    const sub = category.subcategories?.find((entry) => entry.id === subcategoryId)
    if (sub && normalizeMinOrderQty(sub.minOrderQty) > 1) {
      return `${categoryId}:${subcategoryId}`
    }
  }

  if (normalizeMinOrderQty(category.minOrderQty) > 1) {
    return categoryId
  }

  return null
}

export function getMinOrderRequirementForGroup(groupKey, categories) {
  if (!groupKey) return 1

  if (groupKey.includes(':')) {
    const [categoryId, subcategoryId] = groupKey.split(':')
    const category = findCategory(categories, categoryId)
    const sub = category?.subcategories?.find((entry) => entry.id === subcategoryId)
    return normalizeMinOrderQty(sub?.minOrderQty)
  }

  return normalizeMinOrderQty(findCategory(categories, groupKey)?.minOrderQty)
}

export async function validateOrderItemsMinQty(query, items) {
  if (!Array.isArray(items) || !items.length) return { ok: true }

  const categories = await loadCategoriesFromDb(query)
  const normalized = normalizeCategories(categories)

  const qtyByGroup = new Map()
  for (const line of items) {
    const groupKey = getMinOrderGroupKey(line, normalized)
    if (!groupKey) continue
    const qty = Math.floor(Number(line.qty) || 0)
    qtyByGroup.set(groupKey, (qtyByGroup.get(groupKey) || 0) + qty)
  }

  for (const [groupKey, total] of qtyByGroup) {
    const required = getMinOrderRequirementForGroup(groupKey, normalized)
    if (required <= 1 || total >= required) continue

    const missing = required - total
    return {
      ok: false,
      message: `${groupKey}: minimo ${required} unidades no pedido (sabores diferentes). Voce tem ${total}; faltam ${missing}.`,
    }
  }

  return { ok: true }
}
