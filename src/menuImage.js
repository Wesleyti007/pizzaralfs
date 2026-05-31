/** Proporção e tamanho usados nos cards do cardápio (16:9). */
export const MENU_IMAGE_WIDTH = 800
export const MENU_IMAGE_HEIGHT = 450
const MENU_IMAGE_ASPECT = MENU_IMAGE_WIDTH / MENU_IMAGE_HEIGHT
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
const JPEG_QUALITY = 0.82

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
    img.onerror = () => reject(new Error('Arquivo de imagem inválido.'))
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

/**
 * Recorta (centro, estilo object-fit: cover), redimensiona e comprime para o cardápio.
 */
export async function normalizeMenuImageFile(
  file,
  { width = MENU_IMAGE_WIDTH, height = MENU_IMAGE_HEIGHT, quality = JPEG_QUALITY } = {},
) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem (JPG, PNG ou WebP).')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Imagem muito grande. Use um arquivo de até 12 MB.')
  }

  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)

  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error('Não foi possível ler as dimensões da imagem.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Seu navegador não suporta o processamento de imagem.')
  }

  ctx.fillStyle = '#ebe6dc'
  ctx.fillRect(0, 0, width, height)

  const { sx, sy, sWidth, sHeight } = cropCoverSourceRect(
    img.naturalWidth,
    img.naturalHeight,
    width / height,
  )

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height)

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const normalized =
    outputType === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', quality)

  if (!normalized || normalized.length < 32) {
    throw new Error('Não foi possível gerar a imagem.')
  }

  return normalized
}
