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
    return {
      id: template.id,
      label: template.label,
      pieces: template.pieces,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
    }
  })
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

  return {
    id: row.id,
    category,
    subcategory: row.subcategory || '',
    name: row.name,
    description: row.description || '',
    price,
    image: row.image || '',
    sizes,
  }
}

export function buildMenuItemPayload(body) {
  const category = body.category || 'pizzas'
  const name = String(body.name || '').trim()
  const description = String(body.description || '').trim()
  const image = String(body.image || '').trim()

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
      },
    }
  }

  const price = Number(body.price)
  if (!name || Number.isNaN(price) || price <= 0) {
    return { error: 'Dados inválidos do produto' }
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
    },
  }
}
