/**
 * Em produção (mesma origem): VITE_API_URL vazio → requisições relativas (/menu-items).
 * Em dev local: padrão http://localhost:3001
 */
export function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  if (import.meta.env.PROD) {
    return ''
  }
  return 'http://localhost:3001'
}

export const API_BASE_URL = resolveApiBaseUrl()
