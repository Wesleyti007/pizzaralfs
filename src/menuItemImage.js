const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export function hasMenuItemImageValue(image) {
  return String(image ?? '').trim().length > 32
}

export function menuItemHasImage(item) {
  if (!item) return false
  if (item.hasImage === true) return true
  return hasMenuItemImageValue(item.image)
}

/**
 * URL da imagem do produto.
 * @param {'card'|'full'} variant — card = miniatura leve no cardápio; full = admin/preview
 */
export function menuItemImageSrc(item, options = {}) {
  if (!item || !menuItemHasImage(item)) return null

  const apiBase = options.apiBase ?? API_BASE_URL
  const variant = options.variant === 'full' ? 'full' : 'card'

  const inline = String(item.image ?? '').trim()
  if (/^https?:\/\//i.test(inline)) return inline
  if (inline.startsWith('data:image/') && variant === 'full') return inline
  if (inline.startsWith('data:image/')) {
    return inline
  }

  const id = item.id
  if (id == null || id === '') return null
  const base = apiBase.replace(/\/$/, '')
  return `${base}/menu-items/${id}/image?v=${variant}`
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
