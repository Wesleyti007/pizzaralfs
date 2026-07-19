import { isBurgerCategory, itemExtrasWithoutSauces, normalizeMenuItemExtrasList } from './menuExtras.js'

export const PIZZA_SIZE_TEMPLATES = [
  { id: 'broto', label: 'Broto', pieces: 4 },
  { id: 'media', label: 'Media', pieces: 6 },
  { id: 'grande', label: 'Grande', pieces: 8 },
]

export const DEFAULT_PIZZA_ENABLED_SIZES = ['broto', 'media', 'grande']

export function normalizePizzaEnabledSizes(raw) {
  const allowed = new Set(PIZZA_SIZE_TEMPLATES.map((template) => template.id))
  let list = raw
  if (typeof list === 'string' && list.trim()) {
    try {
      list = JSON.parse(list)
    } catch {
      list = null
    }
  }
  if (!Array.isArray(list)) return [...DEFAULT_PIZZA_ENABLED_SIZES]
  const filtered = list
    .map((entry) => String(entry || '').trim())
    .filter((id) => allowed.has(id))
  return filtered.length ? filtered : [...DEFAULT_PIZZA_ENABLED_SIZES]
}

export function pizzaSizeLabel(sizeId) {
  return PIZZA_SIZE_TEMPLATES.find((entry) => entry.id === sizeId)?.label || sizeId
}

export const CALZONE_SIZE_TEMPLATES = [
  { id: 'pequeno', label: 'Pequeno', pieces: 1 },
  { id: 'grande', label: 'Grande', pieces: 1 },
]

export const DEFAULT_CALZONE_ENABLED_SIZES = ['pequeno', 'grande']

export function normalizeCalzoneEnabledSizes(raw) {
  const allowed = new Set(CALZONE_SIZE_TEMPLATES.map((template) => template.id))
  let list = raw
  if (typeof list === 'string' && list.trim()) {
    try {
      list = JSON.parse(list)
    } catch {
      list = null
    }
  }
  if (!Array.isArray(list)) return [...DEFAULT_CALZONE_ENABLED_SIZES]
  const filtered = list
    .map((entry) => String(entry || '').trim())
    .filter((id) => allowed.has(id))
  return filtered.length ? filtered : [...DEFAULT_CALZONE_ENABLED_SIZES]
}

export function calzoneSizeLabel(sizeId) {
  return CALZONE_SIZE_TEMPLATES.find((entry) => entry.id === sizeId)?.label || sizeId
}

export function normalizeCalzoneSizes(rawSizes, fallbackPrice = 0, enabledCalzoneSizeIds = null) {
  const enabledSet = new Set(normalizeCalzoneEnabledSizes(enabledCalzoneSizeIds))
  const byId = new Map()
  for (const entry of parseMenuItemSizesField(rawSizes)) {
    if (entry?.id) byId.set(entry.id, entry)
  }

  const fallback = Number(fallbackPrice) || 0

  return CALZONE_SIZE_TEMPLATES.filter((template) => enabledSet.has(template.id)).map(
    (template) => {
      const existing = byId.get(template.id) || {}
      const price = Number(existing.price ?? fallback)
      const deliveryPrice = Number(existing.deliveryPrice ?? existing.delivery_price)
      const size = {
        id: template.id,
        label: template.label,
        pieces: template.pieces,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
      }
      if (Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
        size.deliveryPrice = deliveryPrice
      }
      return size
    },
  )
}

export function isPizzaCategory(categoryId) {
  return categoryId === 'pizzas'
}

export function isCalzoneCategory(categoryId) {
  return String(categoryId || '').trim().toLowerCase() === 'calzone'
}

function parseMenuItemSizesField(rawSizes) {
  if (Array.isArray(rawSizes)) return rawSizes
  if (typeof rawSizes === 'string' && rawSizes.trim()) {
    try {
      const parsed = JSON.parse(rawSizes)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function normalizeStoredSizes(rawSizes, fallbackPrice = 0) {
  const list = parseMenuItemSizesField(rawSizes)
  if (!list.length) return []
  const fallback = Number(fallbackPrice) || 0
  return list
    .map((entry, index) => {
      const id = String(entry?.id || `tamanho-${index + 1}`).trim()
      const label = String(entry?.label || id).trim()
      const price = Number(entry?.price ?? fallback)
      const pieces = Number(entry?.pieces) || 1
      const size = {
        id,
        label,
        pieces: Number.isFinite(pieces) && pieces > 0 ? pieces : 1,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
      }
      const deliveryPrice = Number(entry?.deliveryPrice ?? entry?.delivery_price)
      if (Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
        size.deliveryPrice = deliveryPrice
      }
      return size
    })
    .filter((size) => size.price > 0 || size.id)
}

export function normalizePizzaSizes(rawSizes, fallbackPrice = 0, enabledPizzaSizeIds = null) {
  const enabledSet = new Set(normalizePizzaEnabledSizes(enabledPizzaSizeIds))
  const byId = new Map()
  if (Array.isArray(rawSizes)) {
    for (const entry of rawSizes) {
      if (entry?.id) byId.set(entry.id, entry)
    }
  }

  const fallback = Number(fallbackPrice) || 0

  return PIZZA_SIZE_TEMPLATES.filter((template) => enabledSet.has(template.id)).map((template) => {
    const existing = byId.get(template.id) || {}
    const price = Number(existing.price ?? fallback)
    const deliveryPrice = Number(existing.deliveryPrice)
    const size = {
      id: template.id,
      label: template.label,
      pieces: template.pieces,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
    }
    if (Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
      size.deliveryPrice = deliveryPrice
    }
    return size
  })
}

export function normalizeMinOrderQty(value) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(99, parsed)
}

function slugifyOptionId(label, index = 0) {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `opcao-${index + 1}`
}

export function normalizeMenuItemOptionsList(raw) {
  let list = raw
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = String(list)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    }
  }
  if (!Array.isArray(list)) return []

  const options = []
  const seen = new Set()
  for (const [index, entry] of list.entries()) {
    let label = ''
    let price = 0
    let id = ''

    if (typeof entry === 'string') {
      const match = entry.match(/^(.+?)\s*(?:=|\|)\s*([\d.,]+)\s*$/)
      if (match) {
        label = match[1].trim()
        price = Number(String(match[2]).replace(/\./g, '').replace(',', '.'))
      } else {
        label = entry.trim()
      }
    } else if (entry && typeof entry === 'object') {
      label = String(entry.label ?? entry ?? '').trim()
      id = String(entry.id ?? '').trim()
      const parsed = Number(entry.price)
      price = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
    }

    if (!label) continue
    let optionId = id || slugifyOptionId(label, index)
    if (seen.has(optionId)) optionId = `${optionId}-${index + 1}`
    seen.add(optionId)
    const option = { id: optionId, label }
    if (Number.isFinite(price) && price > 0) {
      option.price = Math.round(price * 100) / 100
    }
    options.push(option)
  }
  return options
}

export function normalizeMenuItemRow(row) {
  const category = row.category || 'pizzas'
  const basePrice = Number(row.price) || 0
  let sizes = []

  let raw = row.sizes
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = []
    }
  }

  if (isPizzaCategory(category)) {
    sizes = normalizePizzaSizes(raw, basePrice)
  } else if (isCalzoneCategory(category)) {
    sizes = normalizeCalzoneSizes(raw, basePrice)
  }

  const price =
    sizes.length > 0
      ? Math.min(...sizes.map((size) => size.price).filter((value) => value > 0)) ||
        basePrice
      : basePrice

  const deliveryPrice = Number(row.delivery_price)
  const options =
    isPizzaCategory(category) || isCalzoneCategory(category)
      ? []
      : normalizeMenuItemOptionsList(row.options)
  const extras =
    isPizzaCategory(category) || isCalzoneCategory(category)
      ? []
      : normalizeMenuItemExtrasList(row.extras)
  const item = {
    id: row.id,
    category,
    subcategory: row.subcategory || '',
    name: row.name,
    description: row.description || '',
    price,
    image: row.image || '',
    sizes,
    options,
    extras,
    minOrderQty: normalizeMinOrderQty(row.min_order_qty ?? row.minOrderQty),
    isActive: row.is_active !== false && row.isActive !== false,
  }
  if (Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
    item.deliveryPrice = deliveryPrice
  }
  return item
}

export function buildMenuItemPayload(body, { enabledPizzaSizes = null, enabledCalzoneSizes = null } = {}) {
  const category = body.category || 'pizzas'
  const name = String(body.name || '').trim()
  const description = String(body.description || '').trim()
  const image = String(body.image || '').trim()
  const isActive = body.isActive !== false && body.active !== false
  const minOrderQty = normalizeMinOrderQty(body.minOrderQty)

  if (isPizzaCategory(category)) {
    const enabled = normalizePizzaEnabledSizes(enabledPizzaSizes)
    const sizes = normalizePizzaSizes(body.sizes, body.price, enabled)
    const missing = enabled.find((sizeId) => {
      const size = sizes.find((entry) => entry.id === sizeId)
      return !size || !size.price || size.price <= 0
    })
    if (missing) {
      const labels = enabled.map((sizeId) => pizzaSizeLabel(sizeId)).join(', ')
      return { error: `Informe preço válido para ${labels}.` }
    }

    const price = Math.min(...sizes.map((size) => size.price))
    return {
      payload: {
        category,
        subcategory: body.subcategory || '',
        name,
        description,
        price,
        image,
        sizes,
        options: [],
        extras: [],
        deliveryPrice: null,
        minOrderQty,
        isActive,
      },
    }
  }

  if (isCalzoneCategory(category)) {
    const enabled = normalizeCalzoneEnabledSizes(enabledCalzoneSizes)
    const sizes = normalizeCalzoneSizes(body.sizes, body.price, enabled)
    const missing = enabled.find((sizeId) => {
      const size = sizes.find((entry) => entry.id === sizeId)
      return !size || !size.price || size.price <= 0
    })
    if (missing) {
      const labels = enabled.map((sizeId) => calzoneSizeLabel(sizeId)).join(', ')
      return { error: `Informe preço válido para ${labels}.` }
    }

    const price = Math.min(...sizes.map((size) => size.price))
    return {
      payload: {
        category,
        subcategory: body.subcategory || '',
        name,
        description,
        price,
        image,
        sizes,
        options: [],
        extras: [],
        deliveryPrice: null,
        minOrderQty,
        isActive,
      },
    }
  }

  const options = normalizeMenuItemOptionsList(body.options)
  const extras = isBurgerCategory(category)
    ? itemExtrasWithoutSauces(body.extras)
    : normalizeMenuItemExtrasList(body.extras)

  const price = Number(body.price)
  if (!name || Number.isNaN(price) || price <= 0) {
    return { error: 'Dados inválidos do produto' }
  }

  const rawDelivery = body.deliveryPrice
  const deliveryPrice =
    rawDelivery === null || rawDelivery === undefined || rawDelivery === ''
      ? null
      : Number(rawDelivery)
  if (deliveryPrice !== null && (Number.isNaN(deliveryPrice) || deliveryPrice <= 0)) {
    return { error: 'Preço delivery inválido' }
  }

  return {
    payload: {
      category,
      subcategory: body.subcategory || '',
      name,
      description,
      price,
      image,
      sizes: [],
      options,
      extras,
      deliveryPrice,
      minOrderQty,
      isActive,
    },
  }
}
