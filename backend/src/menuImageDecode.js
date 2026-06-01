/** Decodifica imagem armazenada (data URL ou buffer bruto). */
export function decodeMenuItemImagePayload(imageValue) {
  const raw = String(imageValue || '').trim()
  if (!raw || raw.length < 64) return null
  if (/^https?:\/\//i.test(raw)) {
    return { redirect: raw, cacheKey: `url-${raw.length}` }
  }

  const match = raw.match(/^data:image\/([a-z0-9+.-]+);base64,(.+)$/i)
  if (!match) return null

  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length < 64) return null

  const fingerprint = buffer.length > 4096 ? buffer.length : buffer.subarray(0, 64).toString('hex')
  return {
    buffer,
    cacheKey: `${match[1]}-${fingerprint}`,
  }
}
