/** Decodifica imagem armazenada (data URL, base64 cru, URL http(s)). */
const BASE64_RE = /^[A-Za-z0-9+/=\r\n]+$/

function detectImageKind(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg'
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'png'
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF87a') return 'gif'
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'gif'
  return null
}

function decodeRawBase64(raw) {
  const cleaned = raw.replace(/\s/g, '')
  if (cleaned.length < 64 || cleaned.length % 4 !== 0 || !BASE64_RE.test(cleaned)) {
    return null
  }

  let buffer
  try {
    buffer = Buffer.from(cleaned, 'base64')
  } catch {
    return null
  }

  if (buffer.length < 64) return null

  const kind = detectImageKind(buffer)
  if (!kind) return null

  const fingerprint = buffer.length > 4096 ? buffer.length : buffer.subarray(0, 64).toString('hex')
  return { buffer, cacheKey: `${kind}-${fingerprint}` }
}

export function decodeMenuItemImagePayload(imageValue) {
  const raw = String(imageValue || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) {
    if (raw.length < 12) return null
    return { redirect: raw, cacheKey: `url-${raw.length}` }
  }
  if (raw.length < 64) return null

  const match = raw.match(/^data:image\/([a-z0-9+.-]+);base64,(.+)$/i)
  if (match) {
    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length < 64) return null

    const fingerprint = buffer.length > 4096 ? buffer.length : buffer.subarray(0, 64).toString('hex')
    return {
      buffer,
      cacheKey: `${match[1]}-${fingerprint}`,
    }
  }

  return decodeRawBase64(raw)
}

export function storedMenuItemHasImage(imageValue) {
  const raw = String(imageValue || '').trim()
  if (!raw) return false
  if (/^https?:\/\//i.test(raw)) return raw.length >= 12
  return decodeMenuItemImagePayload(raw) !== null
}
