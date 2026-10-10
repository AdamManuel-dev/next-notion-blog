import * as React from 'react'
import { parseReadingPosition, ReadingPosition } from 'lib/reading-storage'

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
    } catch {}
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
          'article [class*="notion-block-"]'
        )
        const anchor = [...blocks].find(
          (block) => block.getBoundingClientRect().bottom > 80
        )
        const value: ReadingPosition = {
          y: window.scrollY,
          anchor:
            [...(anchor?.classList || [])].find((name) =>
              /^notion-block-[a-f0-9]{32}$/.test(name)
            ) || '',
          offset: anchor?.getBoundingClientRect().top || 0,
          updated: Date.now()
        }
        localStorage.setItem(key, JSON.stringify(value))
      } catch {}
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
            const anchor = position.anchor
              ? document.querySelector<HTMLElement>(`.${position.anchor}`)
              : null
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
          } catch {}
        }}
      >
        Start fresh
      </button>
    </aside>
  )
}
