import { API_BASE_URL } from './apiBaseUrl.js'
import { CALZONE_DEFAULT_IMAGE, isCalzoneCategory } from './catalog.js'

export function hasMenuItemImageValue(image) {
  return String(image ?? '').trim().length > 32
}

export function menuItemHasImage(item) {
  if (!item) return false
  if (isCalzoneCategory(item.category)) return true
  if (item.hasImage === true) return true
  return hasMenuItemImageValue(item.image)
}

/**
 * URL da imagem do produto.
 * @param {'card'|'full'} variant — card = miniatura leve no cardápio; full = admin/preview
 */
/** Pré-visualização no admin (upload local ou foto já salva na API). */
export function adminMenuPreviewSrc(image, item) {
  const inline = String(image ?? '').trim()
  if (/^https?:\/\//i.test(inline)) return inline
  if (inline.startsWith('data:image/')) return inline
  if (item && menuItemHasImage(item)) {
    return menuItemImageSrc(item, { variant: 'card' })
  }
  return null
}

export function shouldShowAdminMenuPreview(image, item) {
  const inline = String(image ?? '').trim()
  if (inline.length > 32) return true
  return Boolean(item && menuItemHasImage(item))
}

export function menuItemImageSrc(item, options = {}) {
  if (!item || !menuItemHasImage(item)) return null

  if (isCalzoneCategory(item.category) && !hasMenuItemImageValue(item.image) && item.hasImage !== true) {
    return CALZONE_DEFAULT_IMAGE
  }

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
  const rev = String(item.imageRev ?? '').trim()
  const revQuery = rev ? `&rev=${encodeURIComponent(rev)}` : ''
  return `${base}/menu-items/${id}/image?v=${variant}${revQuery}`
}

/** Versão leve para localStorage (sem base64). */
export function menuItemsForStorage(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => {
    const { image, ...rest } = item
    return {
      ...rest,
      hasImage: menuItemHasImage(item),
      imageRev: String(item.imageRev ?? '').trim(),
      image: '',
    }
  })
}
