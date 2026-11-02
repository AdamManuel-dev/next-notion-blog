import * as React from 'react'
import {
  captureReadingPosition,
  parseReadingPosition,
  ReadingPosition
} from 'lib/reading-storage'

export function ReadingResume({ pageId }: { pageId: string }) {
  const [saved, setSaved] = React.useState<ReadingPosition | null>(null)
  const pending = React.useRef(false)
  const key = `blog-reading-position:${pageId.replace(/-/g, '')}`
  React.useEffect(() => {
    try {
      const position = parseReadingPosition(localStorage.getItem(key))
      // Explicit deep links and restored browser scroll positions take precedence.
      if (position && !location.hash && window.scrollY < 200) {
        pending.current = true
        setSaved(position)
      }
    } catch {
      // Storage is optional; a blocked store must not interrupt reading.
    }
    // This effect owns one article element; a route change mounts a new one,
    // so every measurement happens while this article is still connected and
    // writes only ever replay that captured snapshot.
    const article = document.querySelector('article')
    const blocks = article
      ? [
          ...article.querySelectorAll<HTMLElement>(
            '[id], [class*="notion-block-"]'
          )
        ]
      : []
    const end = article?.closest('main')?.querySelector('.article-end')
    let timer: ReturnType<typeof setTimeout>
    let snapshot: ReadingPosition | null = null
    let finished = false
    const capture = () => {
      if (!article?.isConnected) return
      if (window.scrollY < 200) {
        finished = false
        snapshot = null
        return
      }
      const rect = end?.getBoundingClientRect()
      finished = !!rect && rect.top <= window.innerHeight
      snapshot = finished
        ? null
        : captureReadingPosition(window.scrollY, blocks)
    }
    const save = () => {
      clearTimeout(timer)
      if (!finished && !snapshot) return
      try {
        if (finished) localStorage.removeItem(key)
        else localStorage.setItem(key, JSON.stringify(snapshot))
      } catch {
        // Quotas and privacy settings can prevent position persistence.
      }
    }
    const scroll = () => {
      // Reading on past the banner is an implicit answer to it.
      if (pending.current) {
        if (window.scrollY < 200) return
        pending.current = false
        setSaved(null)
      }
      capture()
      clearTimeout(timer)
      timer = setTimeout(save, 600)
    }
    const hide = () => {
      if (document.visibilityState === 'hidden') save()
    }
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', hide)
    return () => {
      save()
      clearTimeout(timer)
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [key])
  if (!saved) return null
  return (
    <aside className='reading-resume' aria-label='Saved reading position'>
      <span>Pick up where you left off?</span>
      <button
        type='button'
        onClick={() => {
          const position = saved
          pending.current = false
          setSaved(null)
          requestAnimationFrame(() => {
            const candidate = position.anchor
              ? document.getElementById(position.anchor) ||
                (/^notion-block-[a-f0-9]{32}$/.test(position.anchor)
                  ? document.querySelector<HTMLElement>(
                      `article .${position.anchor}`
                    )
                  : null)
              : null
            const anchor = candidate?.closest('article') ? candidate : null
            const top = anchor
              ? window.scrollY +
                anchor.getBoundingClientRect().top -
                position.offset
              : position.y
            window.scrollTo({ top, behavior: 'auto' })
            if (anchor) {
              anchor.setAttribute('tabindex', '-1')
              anchor.focus({ preventScroll: true })
            }
          })
        }}
      >
        Resume reading
      </button>
      <button
        type='button'
        onClick={() => {
          pending.current = false
          setSaved(null)
          try {
            localStorage.removeItem(key)
          } catch {
            // Dismissing the banner still works when storage is unavailable.
          }
        }}
      >
        Start fresh
      </button>
    </aside>
  )
}
