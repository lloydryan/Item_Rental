const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024
export const TARGET_IMAGE_BYTES = 350 * 1024

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('This browser could not convert the image to WebP.')), 'image/webp', quality)
  })
}

function webpName(name) {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'item-image'
  return `${base}.webp`
}

export async function optimizeItemImage(sourceFile) {
  if (!SUPPORTED_TYPES.has(sourceFile.type)) throw new Error('Choose a JPG, PNG, WebP, or AVIF image.')
  if (sourceFile.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('Choose an image that is 20 MB or smaller.')

  let bitmap
  try {
    bitmap = await createImageBitmap(sourceFile, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('The selected image could not be read. Try a different JPG, PNG, WebP, or AVIF file.')
  }

  const maxEdge = 1600
  const initialScale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  let width = Math.max(1, Math.round(bitmap.width * initialScale))
  let height = Math.max(1, Math.round(bitmap.height * initialScale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { alpha: true })

  if (!context) {
    bitmap.close?.()
    throw new Error('Image optimization is unavailable in this browser.')
  }

  try {
    for (let resizePass = 0; resizePass < 8; resizePass += 1) {
      canvas.width = width
      canvas.height = height
      context.clearRect(0, 0, width, height)
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, width, height)

      for (const quality of [0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26]) {
        const blob = await canvasBlob(canvas, quality)
        if (blob.size <= TARGET_IMAGE_BYTES) {
          return {
            file: new File([blob], webpName(sourceFile.name), { type: 'image/webp', lastModified: Date.now() }),
            width,
            height,
            originalBytes: sourceFile.size,
          }
        }
      }

      width = Math.max(1, Math.round(width * 0.8))
      height = Math.max(1, Math.round(height * 0.8))
    }
  } finally {
    bitmap.close?.()
  }

  throw new Error('The image could not be reduced below 350 KB. Try a less detailed image.')
}

export function formatImageSize(bytes) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
