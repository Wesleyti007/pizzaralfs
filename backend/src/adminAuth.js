import { createHash, timingSafeEqual } from 'node:crypto'

function safeEqualToken(provided, expected) {
  const a = Buffer.from(String(provided || ''))
  const b = Buffer.from(String(expected || ''))
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function extractBearerToken(req) {
  const header = String(req.headers.authorization || '').trim()
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  return String(req.headers['x-admin-key'] || req.headers['x-staff-key'] || '').trim()
}

export function resolveAdminApiKey() {
  const explicit = String(process.env.ADMIN_API_KEY || '').trim()
  if (explicit) return explicit

  const pass = String(process.env.ADMIN_PASSWORD || '').trim()
  if (pass) {
    return createHash('sha256').update(`pizzaralfs-admin:${pass}`).digest('hex')
  }

  return 'dev-insecure-admin-key'
}

export function resolveWaiterApiKey() {
  const explicit = String(process.env.WAITER_API_KEY || '').trim()
  if (explicit) return explicit

  const pass = String(process.env.WAITER_PASSWORD || '').trim()
  if (pass) {
    return createHash('sha256').update(`pizzaralfs-waiter:${pass}`).digest('hex')
  }

  return 'dev-insecure-waiter-key'
}

export function isValidAdminToken(token) {
  return safeEqualToken(token, resolveAdminApiKey())
}

export function isValidWaiterToken(token) {
  return safeEqualToken(token, resolveWaiterApiKey())
}

export function requireAdmin(req, res, next) {
  if (isValidAdminToken(extractBearerToken(req))) {
    return next()
  }
  return res.status(401).json({ message: 'Nao autorizado. Faca login no admin.' })
}

export function requireWaiter(req, res, next) {
  if (isValidWaiterToken(extractBearerToken(req))) {
    return next()
  }
  return res.status(401).json({ message: 'Nao autorizado. Faca login do garcom.' })
}

export function postAdminLogin(req, res) {
  const username = String(req.body.username ?? req.body.user ?? '').trim()
  const password = String(req.body.password ?? '').trim()
  const expectedUser = String(process.env.ADMIN_USER || 'admin').trim()
  const expectedPass = String(process.env.ADMIN_PASSWORD || '').trim()

  if (!expectedPass) {
    return res.status(503).json({ message: 'ADMIN_PASSWORD nao configurada no servidor' })
  }

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ message: 'Usuario ou senha invalidos' })
  }

  return res.json({ token: resolveAdminApiKey() })
}

export function postWaiterLogin(req, res) {
  const username = String(req.body.username ?? req.body.user ?? '').trim()
  const password = String(req.body.password ?? '').trim()
  const expectedUser = String(process.env.WAITER_USER || 'garcom').trim()
  const expectedPass = String(process.env.WAITER_PASSWORD || '').trim()

  if (!expectedPass) {
    return res.status(503).json({ message: 'WAITER_PASSWORD nao configurada no servidor' })
  }

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ message: 'Usuario ou senha invalidos' })
  }

  return res.json({ token: resolveWaiterApiKey() })
}
