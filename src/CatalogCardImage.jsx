import { useEffect, useRef, useState } from 'react'
import { menuItemImageSrc } from './menuItemImage.js'

/**
 * Só baixa a miniatura quando o card entra (ou quase) na tela.
 */
export function CatalogCardImage({
  item,
  name,
  src: srcOverride,
  priority = false,
  className = 'card-media-img',
  onError,
}) {
  const hostRef = useRef(null)
  const url = srcOverride ?? menuItemImageSrc(item, { variant: 'card' })
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    if (!url) {
      setSrc(null)
      return undefined
    }

    if (priority) {
      setSrc(url)
      return undefined
    }

    setSrc(null)

    const node = hostRef.current
    if (!node) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setSrc(url)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSrc(url)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [url, priority, item?.id])

  if (!url || failed) return null

  const handleError = () => {
    setFailed(true)
    onError?.()
  }

  return (
    <div ref={hostRef} className="card-media-img-shell">
      <img
        key={url}
        src={src || undefined}
        alt={name}
        className={className}
        width={360}
        height={203}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        onError={handleError}
      />
    </div>
  )
}
