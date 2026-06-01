import { useEffect, useRef, useState } from 'react'
import { menuItemImageSrc } from './menuItemImage.js'

/**
 * Só baixa a miniatura quando o card entra (ou quase) na tela.
 */
export function CatalogCardImage({ item, name, priority = false, className = 'card-media-img' }) {
  const hostRef = useRef(null)
  const url = menuItemImageSrc(item, { variant: 'card' })
  const [src, setSrc] = useState(() => (priority && url ? url : null))

  useEffect(() => {
    if (!url || src) return undefined

    if (priority) {
      setSrc(url)
      return undefined
    }

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
      { rootMargin: '180px 0px', threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [url, priority, src])

  if (!url) return null

  return (
    <div ref={hostRef} className="card-media-img-shell">
      <img
        src={src || undefined}
        alt={name}
        className={className}
        width={360}
        height={203}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  )
}
