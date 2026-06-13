import { normalizeCatalogSizeSettings } from './catalog.js'

export const SEEN_SERVER_CATALOG_VERSION_KEY = 'pizza-ralfs-seen-server-catalog-version'

export function catalogSizeSettingsSignature(catalogSizeSettings) {
  return JSON.stringify(normalizeCatalogSizeSettings(catalogSizeSettings || {}))
}

/**
 * Se a versão do cardápio no servidor mudou (deploy), limpa cache e recarrega a página.
 * Retorna true se vai recarregar.
 */
export function reloadIfServerCatalogVersionChanged(serverCatalogVersion) {
  const next = String(serverCatalogVersion || '').trim()
  if (!next) return false

  const seen = sessionStorage.getItem(SEEN_SERVER_CATALOG_VERSION_KEY)
  if (seen && seen !== next) {
    sessionStorage.setItem(SEEN_SERVER_CATALOG_VERSION_KEY, next)
    localStorage.removeItem('pizza-ralfs-menu')
    localStorage.removeItem('pizza-ralfs-catalog-version')
    localStorage.removeItem('pizza-ralfs-catalog-size-settings')
    window.location.reload()
    return true
  }

  if (!seen) {
    sessionStorage.setItem(SEEN_SERVER_CATALOG_VERSION_KEY, next)
  }
  return false
}
