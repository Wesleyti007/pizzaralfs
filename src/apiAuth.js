import { API_BASE_URL } from './apiBaseUrl.js'

export const ADMIN_TOKEN_STORAGE_KEY = 'pizza-ralfs-admin-api-token'
export const WAITER_TOKEN_STORAGE_KEY = 'pizza-ralfs-waiter-api-token'
export const CATALOG_CACHE_VERSION = '9'

function isJsonResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json')
}

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

export function getWaiterApiToken() {
  return sessionStorage.getItem(WAITER_TOKEN_STORAGE_KEY) || ''
}

export function setWaiterApiToken(token) {
  if (token) {
    sessionStorage.setItem(WAITER_TOKEN_STORAGE_KEY, token)
  } else {
    sessionStorage.removeItem(WAITER_TOKEN_STORAGE_KEY)
  }
}

export function clearWaiterApiToken() {
  sessionStorage.removeItem(WAITER_TOKEN_STORAGE_KEY)
}

async function staffLogin(apiBase, path, username, password, setToken) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = isJsonResponse(response) ? await response.json().catch(() => ({})) : {}
  if (!response.ok) {
    throw new Error(body.message || 'Falha no login')
  }
  if (!body.token) {
    throw new Error('Resposta de login invalida')
  }
  setToken(body.token)
  return body.token
}

export function loginAdmin(apiBase, username, password) {
  return staffLogin(apiBase, '/auth/admin', username, password, setAdminApiToken)
}

export function loginWaiter(apiBase, username, password) {
  return staffLogin(apiBase, '/auth/waiter', username, password, setWaiterApiToken)
}

async function verifyStaffSession(apiBase, verifyPath, getToken, clearToken) {
  const token = getToken()
  if (!token) return false

  const response = await fetch(`${apiBase}${verifyPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) {
    clearToken()
    return false
  }
  if (!isJsonResponse(response)) {
    return false
  }
  const body = await response.json().catch(() => ({}))
  return response.ok && body.ok === true
}

export function verifyAdminSession(apiBase) {
  return verifyStaffSession(apiBase, '/auth/verify', getAdminApiToken, clearAdminApiToken)
}

export function verifyWaiterSession(apiBase) {
  return verifyStaffSession(
    apiBase,
    '/auth/waiter/verify',
    getWaiterApiToken,
    clearWaiterApiToken,
  )
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

export { API_BASE_URL }
