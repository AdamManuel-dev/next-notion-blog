import * as React from 'react'
import { ReadingControls } from './ReadingControls'
import { ShareArticle } from './ShareArticle'

/**
 * Compact disclosure that groups the per-article tools (reading preferences and
 * sharing) so the header keeps breadcrumbs and search directly reachable.
 *
 * The panel stays mounted so `ReadingControls` never loses its state or its
 * `?` shortcut, and it is force-opened whenever a dialog inside it is showing —
 * a collapsed ancestor would otherwise hide that modal and strand focus.
 */
export function ArticleTools({ title, url }: { title: string; url: string }) {
  const wrapper = React.useRef<HTMLDivElement>(null)
  const panel = React.useRef<HTMLDivElement>(null)
  const trigger = React.useRef<HTMLButtonElement>(null)
  const [open, setOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const openedByUser = React.useRef(false)

  const onDialogOpenChange = React.useCallback((isOpen: boolean) => {
    setDialogOpen(isOpen)
    if (isOpen) setOpen(true)
  }, [])

  const close = React.useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (document.querySelector('dialog[open]')) return
      if (!wrapper.current?.contains(event.target as Node)) close(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // A modal dialog owns Escape while it is showing.
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      close(true)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  React.useEffect(() => {
    if (!open || !openedByUser.current) return
    openedByUser.current = false
    panel.current?.querySelector<HTMLElement>('button, a, input')?.focus()
  }, [open])

  const hidden = !open && !dialogOpen

  return (
    <div className='article-tools' ref={wrapper}>
      <button
        ref={trigger}
        type='button'
        className='article-tools-trigger blog-fill-button'
        aria-expanded={open}
        aria-controls='article-tools-panel'
        onClick={() => {
          openedByUser.current = !open
          setOpen((value) => !value)
        }}
      >
        <svg
          aria-hidden='true'
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
        >
          <path d='M4 7h9m4 0h3M4 17h3m4 0h9' />
          <circle cx='15' cy='7' r='2' />
          <circle cx='9' cy='17' r='2' />
        </svg>
        <span>Article tools</span>
      </button>
      <div
        id='article-tools-panel'
        ref={panel}
        className={`article-tools-panel${
          open ? ' article-tools-panel-open' : ''
        }`}
        hidden={hidden}
      >
        <div className='article-tools-row'>
          <ReadingControls onDialogOpenChange={onDialogOpenChange} />
          <span className='article-tools-row-label'>Reading preferences</span>
        </div>
        {/* The canonical url is resolved client-side; skip sharing until then. */}
        {url ? (
          <ShareArticle
            title={title}
            url={url}
            idPrefix='header-share'
            compact
            label='Share this article'
          />
        ) : null}
      </div>
    </div>
  )
}
