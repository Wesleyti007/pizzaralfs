export const EXTRA_TYPES = [
  { id: 'sauce', label: 'Molho extra', labelPlural: 'Molhos extras' },
  { id: 'add', label: 'Adicionar', labelPlural: 'Adicionar ingredientes' },
  { id: 'remove', label: 'Remover', labelPlural: 'Remover ingredientes' },
]

export const EXTRA_TYPE_IDS = EXTRA_TYPES.map((entry) => entry.id)
export const MAX_ADD_EXTRA_QTY = 3

/** Catálogo padrão de molhos dos burgers (fonte: Hoclaroma em produção). */
export const DEFAULT_BURGER_SAUCES = [
  { id: 'maionese-ralfs', label: "Maionese ralf's", type: 'sauce', price: 3, isActive: true },
  { id: 'molho-ralfs', label: "Molho ralf's", type: 'sauce', price: 3, isActive: true },
  { id: 'maionese-verde', label: 'Maionese verde', type: 'sauce', price: 3, isActive: true },
  { id: 'maionese-bacon', label: 'Maionese bacon', type: 'sauce', price: 3, isActive: true },
  { id: 'molho-cheddar', label: 'Molho cheddar', type: 'sauce', price: 3, isActive: true },
]

function slugifyExtraId(label, index = 0) {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `extra-${index + 1}`
}

function parsePrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return 0
  return Math.round(numeric * 100) / 100
}

export function isBurgerCategory(categoryId) {
  const id = String(categoryId || '').trim().toLowerCase()
  return id === 'hamburgueres' || id === 'burgers' || id === 'hamburguer'
}

export function normalizeExtraType(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (EXTRA_TYPE_IDS.includes(value)) return value
  if (value === 'molho' || value === 'sauce') return 'sauce'
  if (value === 'adicionar' || value === 'extra') return 'add'
  if (value === 'remover' || value === 'sem') return 'remove'
  return 'add'
}

export function extraTypeLabel(typeId, { plural = false } = {}) {
  const entry = EXTRA_TYPES.find((item) => item.id === typeId)
  if (!entry) return plural ? 'Adicionais' : 'Adicional'
  return plural ? entry.labelPlural : entry.label
}

export function normalizeMenuItemExtrasList(raw) {
  let list = raw
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list)) return []

  const extras = []
  const seen = new Set()
  for (const [index, entry] of list.entries()) {
    const label = String(entry?.label ?? '').trim()
    if (!label) continue
    const type = normalizeExtraType(entry?.type)
    let id = String(entry?.id ?? '').trim() || slugifyExtraId(label, index)
    if (seen.has(id)) id = `${id}-${index + 1}`
    seen.add(id)
    extras.push({
      id,
      label,
      type,
      price: parsePrice(entry?.price),
    })
  }
  return extras
}

/** Só type=sauce; usado no catálogo compartilhado. */
export function normalizeBurgerSauces(raw) {
  let list = raw
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list)) return []

  const sauces = []
  const seen = new Set()
  for (const [index, entry] of list.entries()) {
    const label = String(entry?.label ?? '').trim()
    if (!label) continue
    const type = normalizeExtraType(entry?.type)
    if (type !== 'sauce') continue
    let id = String(entry?.id ?? '').trim() || slugifyExtraId(label, index)
    if (seen.has(id)) id = `${id}-${index + 1}`
    seen.add(id)
    sauces.push({
      id,
      label,
      type: 'sauce',
      price: parsePrice(entry?.price),
      isActive: entry?.isActive !== false && entry?.active !== false,
    })
  }
  return sauces
}

/** Extras do item sem molhos (molhos vêm do catálogo compartilhado). */
export function itemExtrasWithoutSauces(raw) {
  return normalizeMenuItemExtrasList(raw).filter((entry) => entry.type !== 'sauce')
}

/**
 * Extras efetivos para pedido/UI:
 * burgers → molhos compartilhados ativos + add/remove do item
 * demais → extras do item
 */
export function effectiveExtrasForItem(item, burgerSauces = null) {
  const itemExtras = normalizeMenuItemExtrasList(item?.extras)
  if (!isBurgerCategory(item?.category)) {
    return itemExtras
  }
  const sauces = normalizeBurgerSauces(
    burgerSauces != null ? burgerSauces : DEFAULT_BURGER_SAUCES,
  ).filter((entry) => entry.isActive !== false)
  const nonSauce = itemExtras.filter((entry) => entry.type !== 'sauce')
  const usedIds = new Set(sauces.map((entry) => entry.id))
  const merged = [...sauces]
  for (const entry of nonSauce) {
    if (usedIds.has(entry.id)) continue
    usedIds.add(entry.id)
    merged.push(entry)
  }
  return merged
}

export function itemHasExtras(item, burgerSauces = null) {
  return effectiveExtrasForItem(item, burgerSauces).length > 0
}

export function sumExtrasPrices(extras = []) {
  return extras.reduce((total, entry) => {
    const qty = Math.max(1, Math.floor(Number(entry?.qty) || 1))
    return total + parsePrice(entry?.price) * qty
  }, 0)
}

export function formatExtrasSummary(extras = []) {
  if (!extras.length) return ''
  return extras
    .map((entry) => {
      const label = String(entry?.label || '').trim()
      if (!label) return ''
      const qty = Math.max(1, Math.floor(Number(entry?.qty) || 1))
      if (entry.type === 'remove') {
        return /^sem\s+/i.test(label) ? label : `Sem ${label}`
      }
      if (entry.type === 'sauce') {
        return qty > 1 ? `Molho: ${label} x${qty}` : `Molho: ${label}`
      }
      return qty > 1 ? `+ ${label} x${qty}` : `+ ${label}`
    })
    .filter(Boolean)
    .join(', ')
}

export function resolveSelectedExtras(menuExtras, selectedIdsOrQty) {
  const byId = new Map((menuExtras || []).map((entry) => [entry.id, entry]))
  const selected = []

  if (Array.isArray(selectedIdsOrQty)) {
    const seen = new Set()
    for (const entry of selectedIdsOrQty) {
      if (entry && typeof entry === 'object' && entry.id) {
        const id = String(entry.id).trim()
        const extra = byId.get(id)
        if (!extra) continue
        const qty = Math.max(1, Math.floor(Number(entry.qty) || 1))
        const maxQty = extra.type === 'add' ? MAX_ADD_EXTRA_QTY : 1
        selected.push({ ...extra, qty: Math.min(maxQty, qty) })
        continue
      }
      const id = String(entry || '').trim()
      if (!id || seen.has(id)) continue
      const extra = byId.get(id)
      if (!extra) continue
      seen.add(id)
      selected.push({ ...extra, qty: 1 })
    }
    return selected
  }

  const qtyMap = selectedIdsOrQty && typeof selectedIdsOrQty === 'object' ? selectedIdsOrQty : {}
  for (const [rawId, rawQty] of Object.entries(qtyMap)) {
    const id = String(rawId || '').trim()
    const qty = Math.floor(Number(rawQty) || 0)
    if (!id || qty < 1) continue
    const extra = byId.get(id)
    if (!extra) continue
    const maxQty = extra.type === 'add' ? MAX_ADD_EXTRA_QTY : 1
    selected.push({ ...extra, qty: Math.min(maxQty, qty) })
  }
  return selected
}
