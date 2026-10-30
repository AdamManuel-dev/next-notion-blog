import Link from 'next/link'
import * as React from 'react'

import { ArticleTools } from './ArticleTools'
import { LocalSearch } from './LocalSearch'
import { ReadingControls } from './ReadingControls'
import { LocalSearchPage } from 'lib/local-search'
import { useDialogViewport } from 'lib/use-dialog-viewport'

/** Scroll distance after which the bar tightens very slightly. */
const COMPACT_AFTER = 72

/** Brand mark of the original site. */
const BRAND_MARK = '⚡'

export interface LocalReaderHeaderProps {
  siteName: string
  /** Canonical url of the current page; sharing is article-only. */
  canonicalUrl: string
  title: string
  /** Recovered page icon: emoji, or a local asset path starting with `/`. */
  icon?: string | null
  isHome: boolean
  /** Static page index powering search; empty disables the trigger. */
  pages?: LocalSearchPage[]
  /** Page whose route is `/`; defaults to the manifest root slug. */
  rootPageId?: string
  /** Layout classes owned by the page's CSS module. */
  className?: string
  brandClassName?: string
}

/**
 * Sticky reader chrome for the static local pages.
 *
 * The bar spans the full viewport and keeps a fixed height, so the reading
 * position never shifts; scrolling past `COMPACT_AFTER` only tightens the inner
 * padding and adds a hairline shadow. Scroll work is coalesced into a single
 * rAF frame and the listener is passive, so this never blocks scrolling.
 */
export function LocalReaderHeader({
  siteName,
  canonicalUrl,
  title,
  icon,
  isHome,
  pages,
  rootPageId,
  className,
  brandClassName
}: LocalReaderHeaderProps) {
  const [compact, setCompact] = React.useState(false)

  // Dialogs opened from here are modal; keep them inside the visual viewport.
  useDialogViewport()

  React.useEffect(() => {
    let frame = 0
    const read = () => {
      frame = 0
      setCompact(window.scrollY > COMPACT_AFTER)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header
      className={`lr-header${className ? ` ${className}` : ''}`}
      data-compact={compact ? 'true' : 'false'}
    >
      <div className={`lr-bar${compact ? ' lr-bar-compact' : ''}`}>
        <Link
          href='/'
          aria-label={siteName}
          className={`lr-brand${brandClassName ? ` ${brandClassName}` : ''}`}
        >
          <span className='lr-brand-mark' aria-hidden='true'>
            {BRAND_MARK}
          </span>
          <span className='lr-brand-name'>{siteName}</span>
        </Link>

        {isHome ? null : (
          <>
            <span className='lr-crumb-sep' aria-hidden='true'>
              /
            </span>
            {/* Breadcrumb for the current article; the <h1> names the page, so
                the icon here is decorative. */}
            <span className='lr-crumb' title={title}>
              {icon ? (
                icon.startsWith('/') ? (
                  <img
                    className='lr-crumb-icon'
                    src={icon}
                    alt=''
                    aria-hidden='true'
                  />
                ) : (
                  <span className='lr-crumb-icon' aria-hidden='true'>
                    {icon}
                  </span>
                )
              ) : null}
              <span className='lr-crumb-text'>{title}</span>
            </span>
          </>
        )}

        <div className='lr-header-actions'>
          {isHome ? (
            <ReadingControls />
          ) : (
            <ArticleTools title={title} url={canonicalUrl} />
          )}
          {pages?.length ? (
            <LocalSearch pages={pages} rootPageId={rootPageId} />
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default LocalReaderHeader
