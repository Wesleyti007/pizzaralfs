import sharp from 'sharp'
import { decodeMenuItemImagePayload } from './menuImageDecode.js'

const VARIANTS = {
  card: { width: 360, height: 203, quality: 65 },
  full: { width: 560, height: 315, quality: 74 },
}

const imageCache = new Map()
const CACHE_MAX = 180

function cacheGet(key) {
  const entry = imageCache.get(key)
  if (!entry) return null
  entry.lastUsed = Date.now()
  return entry
}

function cacheSet(key, value) {
  if (imageCache.size >= CACHE_MAX) {
    let oldestKey = null
    let oldest = Infinity
    for (const [k, v] of imageCache) {
      if (v.lastUsed < oldest) {
        oldest = v.lastUsed
        oldestKey = k
      }
    }
    if (oldestKey) imageCache.delete(oldestKey)
  }
  imageCache.set(key, { ...value, lastUsed: Date.now() })
}

export function resolveImageVariant(queryValue) {
  return queryValue === 'full' ? 'full' : 'card'
}

export function prefersWebp(acceptHeader) {
  return String(acceptHeader || '').includes('image/webp')
}

export async function serveMenuItemImageFromStored(
  storedValue,
  { itemId = 0, variant = 'card', preferWebp = false } = {},
) {
  const decoded = decodeMenuItemImagePayload(storedValue)
  if (!decoded) return null
  if (decoded.redirect) return { redirect: decoded.redirect }

  const cacheKey = `${itemId}:${decoded.cacheKey}:${variant}:${preferWebp ? 'webp' : 'jpeg'}`
  const cached = cacheGet(cacheKey)
  if (cached) {
    return { buffer: cached.buffer, mime: cached.mime, etag: cached.etag }
  }

  const spec = VARIANTS[variant] || VARIANTS.card
  let pipeline = sharp(decoded.buffer, { failOn: 'none' })
    .rotate()
    .resize(spec.width, spec.height, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: true,
    })

  let buffer
  let mime
  if (preferWebp) {
    buffer = await pipeline.webp({ quality: spec.quality + 8 }).toBuffer()
    mime = 'image/webp'
  } else {
    buffer = await pipeline.jpeg({ quality: spec.quality, mozjpeg: true }).toBuffer()
    mime = 'image/jpeg'
  }

  const etag = `W/"${cacheKey}-${buffer.length}"`
  cacheSet(cacheKey, { buffer, mime, etag })
  return { buffer, mime, etag }
}
