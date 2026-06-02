export const PIZZA_SIZE_TEMPLATES = [
  { id: 'broto', label: 'Broto', pieces: 4 },
  { id: 'media', label: 'Media', pieces: 6 },
  { id: 'grande', label: 'Grande', pieces: 8 },
]

export function isPizzaCategory(categoryId) {
  return categoryId === 'pizzas'
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

  if (isPizzaCategory(category)) {
    let raw = row.sizes
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw)
      } catch {
        raw = []
      }
    }
    sizes = normalizePizzaSizes(raw, basePrice)
  }

  const price =
    sizes.length > 0
      ? Math.min(...sizes.map((size) => size.price).filter((value) => value > 0)) ||
        basePrice
      : basePrice

  const deliveryPrice = Number(row.delivery_price)
  const options = isPizzaCategory(category) ? [] : normalizeMenuItemOptionsList(row.options)
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
