import * as React from 'react'

function reveal(image: HTMLImageElement) {
  if (
    image.naturalWidth > 0 &&
    !image.classList.contains('lazy-image-preview') &&
    image.closest(
      '.notion-asset-wrapper-image, .notion-bookmark-image, .notion-page-cover'
    )
  )
    image.classList.add('blog-image-ready')
}

export function ImageReveal({ children }: { children: React.ReactNode }) {
  const root = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    // Cached images can finish before React attaches the load listener.
    root.current?.querySelectorAll('img').forEach((image) => {
      if (image.complete) reveal(image)
    })
  }, [])
  return (
    <div
      ref={root}
      style={{ display: 'contents' }}
      onLoadCapture={(event) => {
        if (event.target instanceof HTMLImageElement) reveal(event.target)
      }}
    >
      {children}
    </div>
  )
}
