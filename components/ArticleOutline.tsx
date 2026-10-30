import * as React from 'react'

import { getActiveOutlineId } from 'lib/article-outline-position'

export type ArticleOutlineEntry = {
  id: string
  href: string
  text: string
  indentLevel: number
}

/** Reading line: just under the 54px sticky bar and the 76px scroll margin. */
const ACTIVE_MARKER = 96

/** Indentation is capped so deep nesting never pushes labels off the rail. */
function indentStyle(indentLevel: number, step: number): React.CSSProperties {
  return {
    '--toc-indent': `${Math.min(indentLevel, 3) * step}px`
  } as React.CSSProperties
}

/**
 * Tracks which heading owns the viewport.
 *
 * Elements are resolved once per id and cached; scroll and resize are passive
 * and coalesced into a single rAF, and only the resulting id reaches React
 * state, so raw scroll never re-renders the tree. A `ResizeObserver` on the
 * article covers late image loads and reading-preference changes, which move
 * headings without a scroll or resize event.
 */
function useActiveOutlineId(entries: ArticleOutlineEntry[]): string | null {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  // Identity for the effect: the ids, not the array instance.
  const ids = entries.map((entry) => entry.id).join('\n')

  React.useEffect(() => {
    const idList = ids ? ids.split('\n') : []
    if (!idList.length) {
      setActiveId(null)
      return
    }

    const cache = new Map<string, HTMLElement>()
    const resolve = (id: string) => {
      const cached = cache.get(id)
      if (cached && cached.isConnected) return cached
      const found = document.getElementById(id)
      if (found) cache.set(id, found)
      else cache.delete(id)
      return found
    }

    let frame = 0

    const measure = () => {
      frame = 0
      const positions: { id: string; top: number }[] = []
      for (const id of idList) {
        const element = resolve(id)
        // Headings inside a collapsed section have no boxes; skip them.
        if (!element || element.getClientRects().length === 0) continue
        positions.push({ id, top: element.getBoundingClientRect().top })
      }

      const scrolled = window.scrollY > 0
      const atEnd =
        scrolled &&
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 2

      const next = getActiveOutlineId(positions, ACTIVE_MARKER, atEnd)
      setActiveId((current) => (current === next ? current : next))
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })

    const article =
      resolve(idList[0])?.closest('.lr-article, article') ??
      document.querySelector('.lr-article')
    const observer =
      article && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(schedule)
        : null
    if (observer && article) observer.observe(article)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [ids])

  return activeId
}

/** Native navigation still does the scrolling; this only parks focus there. */
function focusHeading(id: string) {
  window.requestAnimationFrame(() => {
    const heading = document.getElementById(id)
    if (!heading) return
    if (!heading.hasAttribute('tabindex'))
      heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  })
}

/** Modified clicks (new tab, download, middle button…) are left to the browser. */
function isPlainClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * Presentational, dependency-free article outline.
 *
 * Two presentations, one data set and one active-section listener:
 *
 * - the original collapsible `<details>`, which the Notion wrapper and narrow
 *   local-reader viewports keep using;
 * - a fixed right-hand tick rail that expands on hover or keyboard activation,
 *   shown only under `.local-reader` at >=1280px (see `styles/local-reader.css`).
 *
 * Open state is owned here rather than by `:hover`, so Escape can close the
 * panel and keep it closed until the reader shows intent again, and so the
 * collapsed panel can stay `hidden` — and therefore untabbable.
 */
export function ArticleOutline({
  entries,
  label = 'Article sections'
}: {
  entries: ArticleOutlineEntry[]
  label?: string
}) {
  const details = React.useRef<HTMLDetailsElement>(null)
  const panel = React.useRef<HTMLDivElement>(null)
  const toggle = React.useRef<HTMLButtonElement>(null)
  const closeButton = React.useRef<HTMLButtonElement>(null)
  const reactId = React.useId()
  const panelId = `article-outline-panel-${reactId}`

  const activeId = useActiveOutlineId(entries)

  // `pinned` is deliberate (click or keyboard); `hovering` is transient;
  // `panelFocus` keeps the panel open while a link inside it holds focus.
  const [pinned, setPinned] = React.useState(false)
  const [hovering, setHovering] = React.useState(false)
  const [panelFocus, setPanelFocus] = React.useState(false)
  // Set by Escape and by a heading jump: suppresses hover-open until the
  // pointer leaves the rail, so focus returning to the toggle cannot reopen it.
  const [suppressed, setSuppressed] = React.useState(false)

  const open = pinned || panelFocus || (hovering && !suppressed)

  const close = React.useCallback(() => {
    setPinned(false)
    setPanelFocus(false)
    setSuppressed(true)
  }, [])

  // The expanded panel covers the rail: give keyboard users a visible control.
  React.useEffect(() => {
    if (open && document.activeElement === toggle.current)
      closeButton.current?.focus({ preventScroll: true })
  }, [open])

  // Keep the active entry visible inside the panel — never scroll the page.
  React.useEffect(() => {
    if (!open || !activeId) return
    const list = panel.current
    if (!list) return
    const link = list.querySelector<HTMLElement>('[data-outline-active="true"]')
    if (!link) return
    const top = link.offsetTop
    const bottom = top + link.offsetHeight
    const headingHeight =
      list.querySelector<HTMLElement>('.article-outline-panel-heading')
        ?.offsetHeight ?? 0
    if (top < list.scrollTop + headingHeight)
      list.scrollTop = Math.max(0, top - headingHeight)
    else if (bottom > list.scrollTop + list.clientHeight - 8) {
      list.scrollTop = bottom - list.clientHeight + 8
    }
  }, [open, activeId])

  if (!entries.length) return null

  const handleJump =
    (onPlainClick: () => void) =>
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      if (!isPlainClick(event)) return
      onPlainClick()
      focusHeading(id)
    }

  const handleDetailsClick = handleJump(() => {
    if (details.current) details.current.open = false
  })
  const handleRailClick = handleJump(close)

  return (
    <>
      <details className='article-toc' ref={details}>
        <summary>
          <span className='article-toc-label'>On this page</span>
          <span className='article-toc-count'>{entries.length}</span>
          <span className='article-toc-chevron' aria-hidden='true'>
            ⌄
          </span>
        </summary>
        <nav aria-label={label}>
          <ol>
            {entries.map((entry) => (
              <li key={entry.id} style={indentStyle(entry.indentLevel, 14)}>
                <a
                  href={entry.href}
                  aria-current={entry.id === activeId ? 'location' : undefined}
                  data-outline-active={
                    entry.id === activeId ? 'true' : undefined
                  }
                  onClick={(event) => handleDetailsClick(event, entry.id)}
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </details>

      <div
        className='article-outline-rail'
        style={{ '--outline-count': entries.length } as React.CSSProperties}
        data-open={open ? 'true' : 'false'}
        onPointerEnter={() => {
          setHovering(true)
          setSuppressed(false)
        }}
        onPointerLeave={() => {
          setHovering(false)
          // Leaving the rail ends the current interaction: the next hover is
          // fresh intent, so Escape's suppression is lifted here.
          setSuppressed(false)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setPinned(false)
            setPanelFocus(false)
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !open) return
          event.stopPropagation()
          close()
          toggle.current?.focus()
        }}
      >
        <button
          type='button'
          ref={toggle}
          className='article-outline-rail-toggle'
          aria-label={label}
          aria-expanded={open}
          aria-controls={panelId}
          onFocus={(event) => {
            // Escape returns from the panel without immediately reopening it.
            if (
              event.currentTarget.matches(':focus-visible') &&
              !panel.current?.contains(event.relatedTarget as Node)
            ) {
              setSuppressed(false)
              setPinned(true)
            }
          }}
          onClick={() => {
            setSuppressed(false)
            setPinned((wasPinned) => !wasPinned)
          }}
        >
          <span className='article-outline-ticks' aria-hidden='true'>
            {entries.map((entry) => (
              <span
                key={entry.id}
                className='article-outline-tick'
                data-outline-active={entry.id === activeId ? 'true' : undefined}
              />
            ))}
          </span>
        </button>

        <div
          id={panelId}
          ref={panel}
          className='article-outline-panel'
          hidden={!open}
          onFocus={() => setPanelFocus(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setPanelFocus(false)
            }
          }}
        >
          <div className='article-outline-panel-heading'>
            <p className='article-outline-panel-title'>On this page</p>
            <button
              ref={closeButton}
              type='button'
              aria-label='Close outline'
              className='article-outline-close'
              onClick={() => {
                close()
                toggle.current?.focus({ preventScroll: true })
              }}
            >
              <span aria-hidden='true'>×</span>
            </button>
          </div>
          <nav aria-label={label}>
            <ol>
              {entries.map((entry) => (
                <li key={entry.id} style={indentStyle(entry.indentLevel, 12)}>
                  <a
                    href={entry.href}
                    aria-current={
                      entry.id === activeId ? 'location' : undefined
                    }
                    data-outline-active={
                      entry.id === activeId ? 'true' : undefined
                    }
                    onClick={(event) => handleRailClick(event, entry.id)}
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </>
  )
}

export default ArticleOutline
