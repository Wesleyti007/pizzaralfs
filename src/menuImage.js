/** Proporção e tamanho usados nos cards do cardápio (16:9). */
export const MENU_IMAGE_WIDTH = 800
export const MENU_IMAGE_HEIGHT = 450
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const JPEG_QUALITY = 0.82
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i

function isImageUploadFile(file) {
  if (!file) return false
  if (file.type?.startsWith('image/')) return true
  return IMAGE_EXT_RE.test(file.name || '')
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(
        new Error(
          'Não foi possível abrir a imagem. Use JPG ou PNG (no iPhone: Ajustes > Câmera > Formatos > Mais compatível).',
        ),
      )
    img.src = src
  })
}

function cropCoverSourceRect(naturalWidth, naturalHeight, aspect) {
  const srcAspect = naturalWidth / naturalHeight
  if (srcAspect > aspect) {
    const sHeight = naturalHeight
    const sWidth = sHeight * aspect
    return {
      sx: (naturalWidth - sWidth) / 2,
      sy: 0,
      sWidth,
      sHeight,
    }
  }
  const sWidth = naturalWidth
  const sHeight = sWidth / aspect
  return {
    sx: 0,
    sy: (naturalHeight - sHeight) / 2,
    sWidth,
    sHeight,
  }
}

function drawNormalizedImage(img, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Seu navegador não suporta o processamento de imagem.')
  }

  ctx.fillStyle = '#ebe6dc'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const { sx, sy, sWidth, sHeight } = cropCoverSourceRect(
    img.naturalWidth,
    img.naturalHeight,
    width / height,
  )

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

/**
 * Recorta (centro), redimensiona e comprime para o cardápio.
 */
export async function normalizeMenuImageFile(
  file,
  { width = MENU_IMAGE_WIDTH, height = MENU_IMAGE_HEIGHT } = {},
) {
  if (!isImageUploadFile(file)) {
    throw new Error('Selecione um arquivo de imagem (JPG, PNG ou WebP).')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Imagem muito grande. Use um arquivo de até 15 MB.')
  }

  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)

  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error('Não foi possível ler as dimensões da imagem.')
  }

  const normalized = drawNormalizedImage(img, width, height)
  if (!normalized || normalized.length < 32) {
    throw new Error('Não foi possível gerar a imagem.')
  }

  return normalized
}

/** Reprocessa data URL (ex.: colada no campo URL) antes de salvar. */
export async function normalizeMenuImageSource(imageValue) {
  const raw = String(imageValue || '').trim()
  if (!raw || /^https?:\/\//i.test(raw)) {
    return raw
  }
  if (!raw.startsWith('data:image/')) {
    return raw
  }

  const img = await loadImage(raw)
  return drawNormalizedImage(img, MENU_IMAGE_WIDTH, MENU_IMAGE_HEIGHT)
}
