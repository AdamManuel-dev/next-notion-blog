import * as React from 'react'
import { createPortal } from 'react-dom'

type Preview = {
  text: string
  label: string
  target: HTMLElement
  link: HTMLAnchorElement
  top: number
  left: number
}
export function FootnotePreview() {
  const [preview, setPreview] = React.useState<Preview | null>(null)
  const panel = React.useRef<HTMLDivElement>(null)
  const pinned = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>()
  const close = React.useCallback(() => {
    clearTimeout(timer.current)
    pinned.current = false
    setPreview(null)
  }, [])
  React.useEffect(() => {
    const reference = (node: EventTarget) => {
      const link = (node as HTMLElement)?.closest?.(
        'a[href]'
      ) as HTMLAnchorElement
      if (
        !link ||
        !link.closest('article') ||
        link.closest('.footnote-preview')
      )
        return null
      const url = new URL(link.href, location.href)
      if (
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        !url.hash
      )
        return null
      if (
        !(
          link.getAttribute('role') === 'doc-noteref' ||
          link.closest('sup') ||
          /^\[?\d+\]?$/.test(link.textContent.trim()) ||
          /^#(?:fn|footnote)/i.test(url.hash)
        )
      )
        return null
      let id: string
      try {
        id = decodeURIComponent(url.hash.slice(1))
      } catch {
        return null
      }
      const target =
        document.getElementById(id) ||
        (/^[a-f0-9-]{32,36}$/i.test(id)
          ? document.querySelector<HTMLElement>(
              `.notion-block-${id.replace(/-/g, '')}`
            )
          : null)
      if (!target || !target.textContent.trim()) return null
      const rect = link.getBoundingClientRect()
      return {
        link,
        target,
        label: link.textContent.trim(),
        text: target.textContent.trim().slice(0, 700),
        left: Math.max(16, Math.min(rect.left, innerWidth - 356)),
        top: Math.max(16, Math.min(rect.bottom + 8, innerHeight - 260))
      }
    }
    const show = (event: Event) => {
      if ((event.target as HTMLElement).closest?.('.footnote-preview')) {
        clearTimeout(timer.current)
        return
      }
      const value = reference(event.target)
      if (value && !pinned.current) {
        clearTimeout(timer.current)
        setPreview(value)
      }
    }
    const click = (event: MouseEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return
      const value = reference(event.target)
      if (value) {
        event.preventDefault()
        pinned.current = true
        clearTimeout(timer.current)
        setPreview(value)
        requestAnimationFrame(() =>
          panel.current?.focus({ preventScroll: true })
        )
      }
    }
    const leave = (event: FocusEvent | MouseEvent) => {
      if (pinned.current) return
      const source = event.target as HTMLElement
      if (!source.closest?.('.footnote-preview') && !reference(source)) return
      if (
        event.type === 'mouseout' &&
        panel.current?.contains(document.activeElement)
      )
        return
      const next = event.relatedTarget as HTMLElement
      if (next?.closest?.('.footnote-preview') || reference(next)) return
      clearTimeout(timer.current)
      timer.current = setTimeout(close, 180)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mouseover', show)
    document.addEventListener('focusin', show)
    document.addEventListener('mouseout', leave)
    document.addEventListener('focusout', leave)
    document.addEventListener('click', click)
    document.addEventListener('keydown', escape)
    const scroll = () => {
      if (!pinned.current) close()
    }
    window.addEventListener('scroll', scroll)
    window.addEventListener('resize', close)
    return () => {
      clearTimeout(timer.current)
      document.removeEventListener('mouseover', show)
      document.removeEventListener('focusin', show)
      document.removeEventListener('mouseout', leave)
      document.removeEventListener('focusout', leave)
      document.removeEventListener('click', click)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('resize', close)
    }
  }, [close])
  if (!preview) return null
  return createPortal(
    <div
      ref={panel}
      tabIndex={-1}
      role='dialog'
      aria-label={`Reference ${preview.label}`}
      className='footnote-preview'
      style={{ top: preview.top, left: preview.left }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          preview.link.focus({ preventScroll: true })
          close()
        }
      }}
    >
      <div className='footnote-preview-heading'>
        <strong>Reference {preview.label}</strong>
        <button
          type='button'
          aria-label='Close reference preview'
          onClick={() => {
            preview.link.focus({ preventScroll: true })
            close()
          }}
        >
          ×
        </button>
      </div>
      <p>{preview.text}</p>
      <button
        type='button'
        onClick={() => {
          close()
          preview.target.scrollIntoView({ block: 'center', behavior: 'auto' })
          preview.target.setAttribute('tabindex', '-1')
          preview.target.focus({ preventScroll: true })
        }}
      >
        Jump to reference
      </button>
    </div>,
    document.body
  )
}
