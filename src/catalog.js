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

export function filterMenuByCatalog(menuItems, categories, categoryId, subcategoryId) {
  const activeCategory = resolveActiveCategory(categories, categoryId)
  const activeSubcategory = resolveActiveSubcategory(categories, activeCategory, subcategoryId)
  const subs = findCategory(categories, activeCategory)?.subcategories || []

  return menuItems.filter((item) => {
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
