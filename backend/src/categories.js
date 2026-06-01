function normalizeCategoryMinOrderQty(value) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(99, parsed)
}

export function findCategory(categories, categoryId) {
  return categories.find((category) => category.id === categoryId) || null
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

export function normalizeCategories(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CATEGORIES
  }

  const categories = raw
    .map((category, index) => {
      const label = String(category?.label || '').trim()
      if (!label) return null

      const id =
        String(category?.id || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-') || `categoria-${index + 1}`

      const subcategories = (Array.isArray(category?.subcategories) ? category.subcategories : [])
        .map((sub, subIndex) => {
          const subLabel = String(sub?.label || '').trim()
          if (!subLabel) return null
          const subId =
            String(sub?.id || '')
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]+/g, '-') || `sub-${subIndex + 1}`
          return {
            id: subId,
            label: subLabel,
            minOrderQty: normalizeCategoryMinOrderQty(sub?.minOrderQty),
          }
        })
        .filter(Boolean)

      return {
        id,
        label,
        subcategories,
        minOrderQty: normalizeCategoryMinOrderQty(category?.minOrderQty),
      }
    })
    .filter(Boolean)

  return categories.length > 0 ? categories : DEFAULT_CATEGORIES
}

export async function loadCategoriesFromDb(query) {
  try {
    const result = await query('SELECT categories FROM catalog_settings WHERE id = 1')
    if (result.rows[0]?.categories) {
      return normalizeCategories(result.rows[0].categories)
    }
  } catch {
    // tabela ainda nao migrada
  }

  return DEFAULT_CATEGORIES
}

export async function saveCategoriesToDb(query, categories) {
  const normalized = normalizeCategories(categories)
  await query(
    `INSERT INTO catalog_settings (id, categories, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET categories = EXCLUDED.categories, updated_at = NOW()`,
    [JSON.stringify(normalized)],
  )
  return normalized
}
