import sharp from 'sharp'

export const MENU_IMAGE_WIDTH = 800
export const MENU_IMAGE_HEIGHT = 450

function decodeImageBuffer(imageInput) {
  const raw = String(imageInput || '').trim()
  if (!raw || /^https?:\/\//i.test(raw)) {
    return { skip: true, value: raw }
  }

  if (!raw.startsWith('data:image/')) {
    return { skip: true, value: raw }
  }

  const base64 = raw.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '')
  if (!base64) {
    throw new Error('Formato de imagem invalido.')
  }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length < 64) {
    throw new Error('Imagem vazia ou corrompida.')
  }

  return { skip: false, buffer }
}

/**
 * Redimensiona imagens enviadas em base64 (upload do admin).
 * URLs http(s) sao mantidas como estao.
 */
export async function normalizeMenuImageString(imageInput) {
  const decoded = decodeImageBuffer(imageInput)
  if (decoded.skip) {
    return decoded.value
  }

  const output = await sharp(decoded.buffer, { failOn: 'none', limitInputPixels: 40_000_000 })
    .rotate()
    .resize(MENU_IMAGE_WIDTH, MENU_IMAGE_HEIGHT, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  return `data:image/jpeg;base64,${output.toString('base64')}`
}
