import * as React from 'react'
import {
  isReadingAnchor,
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
    let timer: ReturnType<typeof setTimeout>
    let dirty = false
    const save = () => {
      clearTimeout(timer)
      if (!dirty || pending.current || window.scrollY < 200) return
      const end = document
        .querySelector('.article-end')
        ?.getBoundingClientRect()
      try {
        if (end && end.top <= window.innerHeight) {
          localStorage.removeItem(key)
          return
        }
        const blocks = document.querySelectorAll<HTMLElement>(
          'article [id], article [class*="notion-block-"]'
        )
        const anchor = [...blocks].find(
          (block) =>
            block.getBoundingClientRect().bottom > 80 &&
            ((!!block.id && isReadingAnchor(block.id)) ||
              [...block.classList].some((name) =>
                /^notion-block-[a-f0-9]{32}$/.test(name)
              ))
        )
        const anchorId =
          anchor?.id && isReadingAnchor(anchor.id)
            ? anchor.id
            : [...(anchor?.classList || [])].find((name) =>
                /^notion-block-[a-f0-9]{32}$/.test(name)
              ) || ''
        const value: ReadingPosition = {
          y: window.scrollY,
          anchor: anchorId,
          offset: anchor?.getBoundingClientRect().top || 0,
          updated: Date.now()
        }
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Quotas and privacy settings can prevent position persistence.
      }
    }
    const scroll = () => {
      dirty = true
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
