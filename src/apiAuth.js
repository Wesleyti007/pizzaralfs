import { API_BASE_URL } from './apiBaseUrl.js'

export const ADMIN_TOKEN_STORAGE_KEY = 'pizza-ralfs-admin-api-token'
export const CATALOG_CACHE_VERSION = '2'

export function getAdminApiToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || ''
}

export function setAdminApiToken(token) {
  if (token) {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
  }
}

export function clearAdminApiToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
}

function isJsonResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json')
}

/** API de login ainda nao publicada ou senha nao configurada no servidor. */
export function isAuthApiUnavailable(status, response) {
  if (status === 404 || status === 503) return true
  if (status === 405) return true
  if (response && !isJsonResponse(response)) return true
  return false
}

export async function loginAdmin(apiBase, username, password) {
  const response = await fetch(`${apiBase}/auth/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = isJsonResponse(response) ? await response.json().catch(() => ({})) : {}
  if (!response.ok) {
    const err = new Error(body.message || 'Falha no login')
    err.status = response.status
    err.apiUnavailable = isAuthApiUnavailable(response.status, response)
    throw err
  }
  if (!body.token) {
    throw new Error('Resposta de login invalida')
  }
  setAdminApiToken(body.token)
  return body.token
}

/**
 * Login na API; se indisponivel, aceita credenciais locais (build Vite).
 * Retorna { ok, fallback?, error? }.
 */
export async function loginAdminWithFallback(
  apiBase,
  username,
  password,
  { localUser, localPassword },
) {
  const user = String(username || '').trim()
  const pass = String(password || '')
  const localOk =
    user === String(localUser || '').trim() && pass === String(localPassword || '')

  try {
    await loginAdmin(apiBase, user, pass)
    return { ok: true, fallback: false }
  } catch (error) {
    if (localOk && error.apiUnavailable) {
      clearAdminApiToken()
      return { ok: true, fallback: true }
    }
    return {
      ok: false,
      error: error.message || 'Usuario ou senha invalidos',
    }
  }
}

export async function verifyAdminSession(apiBase) {
  const token = getAdminApiToken()
  if (!token) return false

  const response = await fetch(`${apiBase}/auth/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) {
    clearAdminApiToken()
    return false
  }
  if (!isJsonResponse(response)) {
    return false
  }
  const body = await response.json().catch(() => ({}))
  return response.ok && body.ok === true
}

/** fetch com token admin (Pedidos, Admin, Relatórios). */
export async function adminFetch(apiBase, path, options = {}) {
  const token = getAdminApiToken()
  const headers = {
    ...(options.headers || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearAdminApiToken()
    throw new Error('Sessao expirada. Faca login novamente no admin.')
  }

  return response
}

// re-export for tests
export { API_BASE_URL }
