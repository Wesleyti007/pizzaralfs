export const PIZZA_SIZE_TEMPLATES = [
  { id: 'broto', label: 'Broto', pieces: 4 },
  { id: 'media', label: 'Media', pieces: 6 },
  { id: 'grande', label: 'Grande', pieces: 8 },
]

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

export function normalizePizzaSizes(rawSizes, fallbackPrice = 0) {
  const byId = new Map()
  if (Array.isArray(rawSizes)) {
    for (const entry of rawSizes) {
      if (entry?.id) byId.set(entry.id, entry)
    }
  }

  const fallback = Number(fallbackPrice) || 0

  return PIZZA_SIZE_TEMPLATES.map((template) => {
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
      list = []
    }
  }
  if (!Array.isArray(list)) return []

  const options = []
  const seen = new Set()
  for (const [index, entry] of list.entries()) {
    const label = String(entry?.label ?? entry ?? '').trim()
    if (!label) continue
    let id = String(entry?.id ?? '').trim() || slugifyOptionId(label, index)
    if (seen.has(id)) id = `${id}-${index + 1}`
    seen.add(id)
    options.push({ id, label })
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
    sizes = normalizeStoredSizes(raw, basePrice)
    if (!sizes.length) {
      sizes = normalizeStoredSizes(
        [
          { id: 'pequeno', label: 'Pequeno', pieces: 1, price: 17 },
          { id: 'grande', label: 'Grande', pieces: 1, price: 24 },
        ],
        basePrice,
      )
    }
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
    minOrderQty: normalizeMinOrderQty(row.min_order_qty ?? row.minOrderQty),
    isActive: row.is_active !== false && row.isActive !== false,
  }
  if (Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
    item.deliveryPrice = deliveryPrice
  }
  return item
}

export function buildMenuItemPayload(body) {
  const category = body.category || 'pizzas'
  const name = String(body.name || '').trim()
  const description = String(body.description || '').trim()
  const image = String(body.image || '').trim()
  const isActive = body.isActive !== false && body.active !== false
  const minOrderQty = normalizeMinOrderQty(body.minOrderQty)

  if (isPizzaCategory(category)) {
    const sizes = normalizePizzaSizes(body.sizes, body.price)
    const invalid = sizes.find((size) => !size.price || size.price <= 0)
    if (invalid) {
      return { error: 'Informe preço válido para Broto, Média e Grande.' }
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
        deliveryPrice: null,
        minOrderQty,
        isActive,
      },
    }
  }

  if (isCalzoneCategory(category)) {
    const sizes = normalizeStoredSizes(body.sizes, body.price)
    const invalid = sizes.find((size) => !size.price || size.price <= 0)
    if (invalid || sizes.length < 1) {
      return { error: 'Informe preço válido para Pequeno e Grande.' }
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
        deliveryPrice: null,
        minOrderQty,
        isActive,
      },
    }
  }

  const options = normalizeMenuItemOptionsList(body.options)

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
      deliveryPrice,
      minOrderQty,
      isActive,
    },
  }
}
