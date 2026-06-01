const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export function hasMenuItemImageValue(image) {
  return String(image ?? '').trim().length > 32
}

export function menuItemHasImage(item) {
  if (!item) return false
  if (item.hasImage === true) return true
  return hasMenuItemImageValue(item.image)
}

/** URL para exibir foto do produto (endpoint binário com cache). */
export function menuItemImageSrc(item, apiBase = API_BASE_URL) {
  if (!item || !menuItemHasImage(item)) return null

  const inline = String(item.image ?? '').trim()
  if (/^https?:\/\//i.test(inline)) return inline
  if (inline.startsWith('data:image/')) return inline

  const id = item.id
  if (id == null || id === '') return null
  return `${apiBase.replace(/\/$/, '')}/menu-items/${id}/image`
}

/** Versão leve para localStorage (sem base64). */
export function menuItemsForStorage(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => {
    const { image, ...rest } = item
    return {
      ...rest,
      hasImage: menuItemHasImage(item),
      image: '',
    }
  })
}
