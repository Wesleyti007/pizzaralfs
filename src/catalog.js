export const MESA_SESSION_KEY = 'pizza-ralfs-active-mesa'

/** Item tem imagem exibível no cardápio. */
export function hasMenuItemImage(imageOrItem) {
  if (imageOrItem && typeof imageOrItem === 'object') {
    if (imageOrItem.hasImage === true) return true
    return String(imageOrItem.image ?? '').trim().length > 32
  }
  return String(imageOrItem ?? '').trim().length > 32
}

export function parseTableNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const parsed = Number(String(raw).trim())
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export function persistTableNumber(mesa) {
  if (mesa) {
    sessionStorage.setItem(MESA_SESSION_KEY, String(mesa))
  }
}

export function clearTableNumberSession() {
  sessionStorage.removeItem(MESA_SESSION_KEY)
}

/**
 * Mesa só vale com ?mesa= na URL (QR da mesa).
 * Sem esse parâmetro = cardápio delivery; não reutiliza mesa antiga da sessão.
 */
export function resolveActiveTableNumber(searchParams) {
  const fromUrl = parseTableNumber(searchParams?.get?.('mesa'))
  if (fromUrl) {
    persistTableNumber(fromUrl)
    return fromUrl
  }
  clearTableNumberSession()
  return null
}

export function catalogPathWithMesa(pathname, mesa) {
  const base = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!mesa) return base
  const [path, query = ''] = base.split('?')
  const params = new URLSearchParams(query)
  params.set('mesa', String(mesa))
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export const DEFAULT_CATEGORIES = [
  {
    id: 'pizzas',
    label: 'Pizzas',
    subcategories: [
      { id: 'doces', label: 'Pizza Doces' },
      { id: 'promocionais', label: 'Pizza Promocionais' },
      { id: 'premium', label: 'Pizzas Premium' },
    ],
  },
  { id: 'esfirras', label: 'Esfirras', subcategories: [] },
  { id: 'coxinhas', label: 'Coxinhas', subcategories: [] },
  { id: 'bebidas', label: 'Bebidas', subcategories: [] },
  { id: 'sobremesas', label: 'Sobremesas', subcategories: [] },
]

export function slugify(text) {
  return (
    String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'categoria'
  )
}

export function normalizeCategories(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CATEGORIES
  }

  const usedCategoryIds = new Set()
  const categories = raw
    .map((category, index) => {
      const label = String(category?.label || '').trim()
      if (!label) return null

      let id = String(category?.id || '').trim() || slugify(label)
      while (usedCategoryIds.has(id)) {
        id = `${id}-${index + 1}`
      }
      usedCategoryIds.add(id)

      const usedSubIds = new Set()
      const subcategories = (Array.isArray(category?.subcategories) ? category.subcategories : [])
        .map((sub, subIndex) => {
          const subLabel = String(sub?.label || '').trim()
          if (!subLabel) return null

          let subId = String(sub?.id || '').trim() || slugify(subLabel)
          while (usedSubIds.has(subId)) {
            subId = `${subId}-${subIndex + 1}`
          }
          usedSubIds.add(subId)

          return { id: subId, label: subLabel }
        })
        .filter(Boolean)

      return { id, label, subcategories }
    })
    .filter(Boolean)

  return categories.length > 0 ? categories : DEFAULT_CATEGORIES
}

export function findCategory(categories, categoryId) {
  return categories.find((category) => category.id === categoryId) || null
}

export function getCategoryLabel(categories, categoryId) {
  return findCategory(categories, categoryId)?.label || 'Cardapio'
}

export function getSubcategoryLabel(categories, categoryId, subcategoryId) {
  if (!subcategoryId || subcategoryId === 'todas') return 'Todas'
  const category = findCategory(categories, categoryId)
  return (
    category?.subcategories?.find((sub) => sub.id === subcategoryId)?.label || subcategoryId
  )
}

export function getItemCategoryLabel(categories, item) {
  const categoryLabel = getCategoryLabel(categories, item.category)
  if (!item.subcategory) return categoryLabel
  const subLabel = getSubcategoryLabel(categories, item.category, item.subcategory)
  return `${categoryLabel} · ${subLabel}`
}

export function resolveActiveCategory(categories, categoryId) {
  if (categories.some((category) => category.id === categoryId)) {
    return categoryId
  }
  return categories[0]?.id || 'pizzas'
}

export function resolveActiveSubcategory(categories, categoryId, subcategoryId) {
  const category = findCategory(categories, categoryId)
  const subs = category?.subcategories || []
  if (subs.length === 0) return null
  if (!subcategoryId || subcategoryId === 'todas') return 'todas'
  if (subs.some((sub) => sub.id === subcategoryId)) return subcategoryId
  return 'todas'
}

export function normalizeSearchText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Busca por nome, descrição, categoria, subcategoria e ID. */
export function menuItemMatchesSearch(item, query, categories = []) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true

  const categoryLabel = getCategoryLabel(categories, item.category)
  const subLabel = item.subcategory
    ? getSubcategoryLabel(categories, item.category, item.subcategory)
    : ''

  const haystack = normalizeSearchText(
    [
      item.name,
      item.description,
      item.category,
      categoryLabel,
      subLabel,
      item.subcategory,
      String(item.id ?? ''),
    ].join(' '),
  )

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  return tokens.every((token) => haystack.includes(token))
}

export function filterMenuItemsBySearch(menuItems, query, categories = []) {
  if (!normalizeSearchText(query)) {
    return menuItems
  }
  return menuItems.filter((item) => menuItemMatchesSearch(item, query, categories))
}

/** Filtros da lista de itens no admin (busca, status, categoria, subcategoria). */
export function filterMenuItemsForAdmin(
  menuItems,
  categories = [],
  { search = '', status = 'all', categoryId = 'all', subcategoryId = 'all' } = {},
) {
  let list = menuItems

  if (status === 'active') {
    list = list.filter((item) => item.isActive !== false)
  } else if (status === 'inactive') {
    list = list.filter((item) => item.isActive === false)
  }

  if (categoryId && categoryId !== 'all') {
    list = list.filter((item) => item.category === categoryId)
  }

  if (subcategoryId && subcategoryId !== 'all') {
    list = list.filter((item) => (item.subcategory || '') === subcategoryId)
  }

  return filterMenuItemsBySearch(list, search, categories)
}

export function filterMenuByCatalog(menuItems, categories, categoryId, subcategoryId) {
  const activeCategory = resolveActiveCategory(categories, categoryId)
  const activeSubcategory = resolveActiveSubcategory(categories, activeCategory, subcategoryId)
  const subs = findCategory(categories, activeCategory)?.subcategories || []

  return menuItems.filter((item) => {
    if (item.isActive === false) return false
    const itemCategory = item.category || categories[0]?.id
    if (itemCategory !== activeCategory) return false
    if (subs.length === 0 || activeSubcategory === 'todas') return true
    return (item.subcategory || '') === activeSubcategory
  })
}

function sortMenuItemsByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Agrupa itens do admin por categoria e, quando houver, por subcategoria. */
export function groupMenuItemsForAdmin(menuItems, categories) {
  const knownGroups = categories.map((category) => {
    const inCategory = menuItems.filter((item) => item.category === category.id)
    const totalCount = inCategory.length

    if (!category.subcategories?.length) {
      return {
        category,
        totalCount,
        sections: [{ id: '', label: null, items: sortMenuItemsByName(inCategory) }],
      }
    }

    const bySub = new Map()
    for (const item of inCategory) {
      const key = item.subcategory || ''
      if (!bySub.has(key)) bySub.set(key, [])
      bySub.get(key).push(item)
    }

    const sections = []
    for (const sub of category.subcategories) {
      const items = bySub.get(sub.id)
      if (items?.length) {
        sections.push({ id: sub.id, label: sub.label, items: sortMenuItemsByName(items) })
        bySub.delete(sub.id)
      }
    }

    const generalItems = bySub.get('')
    if (generalItems?.length) {
      sections.push({ id: '', label: 'Geral', items: sortMenuItemsByName(generalItems) })
      bySub.delete('')
    }

    for (const [subId, items] of bySub) {
      if (items.length) {
        const subLabel =
          category.subcategories.find((sub) => sub.id === subId)?.label || subId
        sections.push({ id: subId, label: subLabel, items: sortMenuItemsByName(items) })
      }
    }

    return { category, totalCount, sections }
  })

  const orphans = sortMenuItemsByName(
    menuItems.filter((item) => !categories.some((category) => category.id === item.category)),
  )

  return { knownGroups, orphans }
}

export const PIZZA_SIZE_TEMPLATES = [
  { id: 'broto', label: 'Broto', pieces: 4 },
  { id: 'media', label: 'Média', pieces: 6 },
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

export function itemHasSizes(item) {
  return isPizzaCategory(item?.category) && Array.isArray(item?.sizes) && item.sizes.length > 0
}

/** Subcategorias tratadas como pizza doce nos combos de sabores. */
export const PIZZA_SWEET_SUBCATEGORY_IDS = new Set(['doces'])

export function isPizzaSweetItem(item, categories = []) {
  const subId = String(item?.subcategory || '').trim()
  if (PIZZA_SWEET_SUBCATEGORY_IDS.has(subId)) return true

  const category = findCategory(categories, item?.category)
  const subLabel =
    category?.subcategories?.find((entry) => entry.id === subId)?.label?.toLowerCase() || ''
  if (subLabel.includes('doce')) return true

  const name = String(item?.name || '').toLowerCase()
  return name.includes('doce') && (isPizzaCategory(item?.category) || name.includes('pizza'))
}

/** Pizzas que podem entrar no seletor de vários sabores (salgada + doce). */
export function isCombinablePizzaItem(item, categories = []) {
  if (item?.isActive === false) return false
  if (!itemHasSizes(item)) return false
  if (isPizzaCategory(item?.category)) return true
  return isPizzaSweetItem(item, categories)
}

export function getCombinablePizzaFlavors(menuItems, categories = [], { excludeItemId } = {}) {
  const excludeKey = excludeItemId != null ? String(excludeItemId) : ''

  return menuItems
    .filter((item) => isCombinablePizzaItem(item, categories))
    .filter((item) => String(item.id) !== excludeKey)
    .sort((a, b) => {
      const aSweet = isPizzaSweetItem(a, categories) ? 1 : 0
      const bSweet = isPizzaSweetItem(b, categories) ? 1 : 0
      if (aSweet !== bSweet) return aSweet - bSweet
      return a.name.localeCompare(b.name, 'pt-BR')
    })
}

export function groupPizzaFlavorOptions(items, categories = []) {
  const savory = []
  const sweet = []

  for (const item of items) {
    if (isPizzaSweetItem(item, categories)) {
      sweet.push(item)
    } else {
      savory.push(item)
    }
  }

  return { savory, sweet }
}

export function getPizzaSizePrice(menuItem, sizeId) {
  if (!itemHasSizes(menuItem)) {
    const price = Number(menuItem?.price)
    return Number.isFinite(price) && price > 0 ? price : 0
  }

  const size = menuItem.sizes.find((entry) => entry.id === sizeId)
  const price = Number(size?.price ?? menuItem.price)
  return Number.isFinite(price) && price > 0 ? price : 0
}

/** Quantos sabores o cliente pode combinar neste tamanho. */
export function getMaxFlavorsForSize(sizeId) {
  if (sizeId === 'broto') return 1
  if (sizeId === 'media') return 2
  if (sizeId === 'grande') return 4
  return 1
}

export function getPiecesForSize(sizeId, sizes = []) {
  const found = sizes.find((entry) => entry.id === sizeId)
  if (found?.pieces) return found.pieces
  const template = PIZZA_SIZE_TEMPLATES.find((entry) => entry.id === sizeId)
  return template?.pieces ?? 4
}

export function normalizeFlavorIdList(ids) {
  const seen = new Set()
  const list = []
  for (const raw of ids || []) {
    const id = String(raw ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    list.push(id)
  }
  return list
}

export function multiFlavorCartKey(flavorIds, sizeId) {
  const sorted = [...normalizeFlavorIdList(flavorIds)].sort()
  return `${sorted.join('+')}:${sizeId || ''}`
}

/** Preço da pizza com vários sabores no tamanho escolhido. */
export function computeMultiFlavorPrice(pizzaItemsById, flavorIds, sizeId) {
  const prices = normalizeFlavorIdList(flavorIds).map((id) => {
    const item = pizzaItemsById.get(id)
    return item ? getPizzaSizePrice(item, sizeId) : 0
  })
  return prices.length ? Math.max(...prices) : 0
}

/** Meia a meia (2 sabores): compatibilidade. */
export function computeHalfAndHalfPrice(primary, secondary, sizeId) {
  return computeMultiFlavorPrice(
    new Map([
      [String(primary?.id), primary],
      [String(secondary?.id), secondary],
    ]),
    [primary?.id, secondary?.id],
    sizeId,
  )
}

export function halfAndHalfPairKey(idA, idB) {
  return multiFlavorCartKey([idA, idB], '')
}

export function buildMultiFlavorCartName(flavorItems, sizeLabel) {
  const names = flavorItems.map((item) => item?.name).filter(Boolean)
  if (!names.length) return 'Pizza'

  let base = names[0]
  if (names.length === 2) {
    base = `Meia ${names[0]} / Meia ${names[1]}`
  } else if (names.length > 2) {
    base = names.join(' + ')
  }

  if (!sizeLabel) return base
  const shortSize = String(sizeLabel).split(' (')[0]
  return `${base} — ${shortSize}`
}

export function buildHalfAndHalfCartName(primary, secondary, sizeLabel) {
  return buildMultiFlavorCartName([primary, secondary], sizeLabel)
}

/** Distribui índices de sabor: fatias do mesmo sabor ficam juntas no círculo. */
export function distributeFlavorSlices(pieceCount, flavorCount) {
  if (flavorCount <= 0 || pieceCount <= 0) return []

  const sliceOwners = []
  for (let flavorIndex = 0; flavorIndex < flavorCount; flavorIndex += 1) {
    const extra = flavorIndex < pieceCount % flavorCount ? 1 : 0
    const count = Math.floor(pieceCount / flavorCount) + extra
    for (let slice = 0; slice < count; slice += 1) {
      sliceOwners.push(flavorIndex)
    }
  }
  return sliceOwners
}

export const PIZZA_FLAVOR_COLORS = [
  '#c45c26',
  '#8b1e1e',
  '#d4a574',
  '#5c7a29',
  '#b8860b',
  '#6b4423',
  '#c9a227',
  '#7a4b2a',
]

export function formatPriceRangeLabel(item) {
  if (!itemHasSizes(item)) {
    return `R$ ${Number(item.price).toFixed(2)}`
  }

  const prices = item.sizes.map((size) => size.price).filter((value) => value > 0)
  if (prices.length === 0) return `R$ ${Number(item.price).toFixed(2)}`

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `R$ ${min.toFixed(2)}`
  return `R$ ${min.toFixed(2)} a R$ ${max.toFixed(2)}`
}

export function stripPriceDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/** Formata como moeda BRL enquanto digita (ex.: digitar 4990 vira 49,90). */
export function applyPriceMask(raw) {
  const digits = stripPriceDigits(raw)
  if (!digits) return ''

  const cents = Number.parseInt(digits, 10)
  if (!Number.isFinite(cents)) return ''

  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parsePriceInput(value) {
  const digits = stripPriceDigits(value)
  if (digits) {
    const cents = Number.parseInt(digits, 10)
    if (Number.isFinite(cents)) return cents / 100
  }

  const normalized = String(value ?? '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
  if (!normalized) return Number.NaN

  return Number(normalized)
}

export function formatPriceForInput(price) {
  if (price === '' || price === null || price === undefined) return ''
  const numeric = Number(price)
  if (!Number.isFinite(numeric) || numeric < 0) return ''
  return applyPriceMask(String(Math.round(numeric * 100)))
}

export function emptySizePrices() {
  return { broto: '', media: '', grande: '' }
}

export function buildSizePricesFromItem(item, { delivery = false } = {}) {
  const prices = emptySizePrices()
  if (!itemHasSizes(item)) return prices

  for (const size of item.sizes) {
    const value = delivery ? size.deliveryPrice : size.price
    prices[size.id] = value > 0 ? formatPriceForInput(value) : ''
  }
  return prices
}

export function buildSizesFromForm(category, price, sizePrices, sizeDeliveryPrices = null) {
  if (!isPizzaCategory(category)) return []

  return PIZZA_SIZE_TEMPLATES.map((template) => {
    const parsed = parsePriceInput(sizePrices?.[template.id] || '')
    const parsedDelivery = parsePriceInput(sizeDeliveryPrices?.[template.id] || '')
    const size = {
      id: template.id,
      label: template.label,
      pieces: template.pieces,
      price: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    }
    if (Number.isFinite(parsedDelivery) && parsedDelivery > 0) {
      size.deliveryPrice = parsedDelivery
    }
    return size
  })
}

export function normalizeMenuItemSizes(item) {
  if (!isPizzaCategory(item.category)) {
    return { ...item, sizes: [] }
  }

  const sizes = normalizePizzaSizes(item.sizes, item.price)
  const positivePrices = sizes.map((size) => size.price).filter((value) => value > 0)
  const price =
    positivePrices.length > 0 ? Math.min(...positivePrices) : Number(item.price) || 0

  return { ...item, sizes, price }
}

export function normalizeMenuItemCategories(item, categories) {
  const activeCategory = resolveActiveCategory(categories, item.category)
  const category = findCategory(categories, activeCategory)
  let subcategory = String(item.subcategory || '').trim()

  if (!category?.subcategories?.length) {
    subcategory = ''
  } else if (subcategory && !category.subcategories.some((sub) => sub.id === subcategory)) {
    subcategory = ''
  }

  return {
    ...item,
    category: activeCategory,
    subcategory,
  }
}
