/**
 * Rate limit em memoria por IP (adequado a um processo Node por instancia).
 * Atras do Caddy: use trust proxy no Express para req.ip correto.
 */
export function createRateLimiter({
  windowMs = Number(process.env.ORDER_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
  max = Number(process.env.ORDER_RATE_LIMIT_MAX) || 25,
  message = 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.',
} = {}) {
  const safeWindow = Math.max(60_000, windowMs)
  const safeMax = Math.max(1, max)
  const buckets = new Map()

  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (now >= entry.resetAt) buckets.delete(key)
    }
  }, safeWindow)
  if (typeof cleanup.unref === 'function') cleanup.unref()

  return function rateLimitMiddleware(req, res, next) {
    const key = String(req.ip || req.socket?.remoteAddress || 'unknown')
    const now = Date.now()
    let entry = buckets.get(key)

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + safeWindow }
      buckets.set(key, entry)
    }

    entry.count += 1

    if (entry.count > safeMax) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfterSec))
      return res.status(429).json({ message })
    }

    return next()
  }
}

export const orderCreateRateLimit = createRateLimiter()
