import Link from 'next/link'
import * as React from 'react'

import {
  isSearchShortcut,
  LocalSearchPage,
  searchLocalPages
} from 'lib/local-search'

export interface LocalSearchProps {
  /** The static page index shipped with the build. */
  pages: LocalSearchPage[]
  /** Page whose route is `/`; defaults to the manifest root slug. */
  rootPageId?: string
}

/**
 * Search over the static page index.
 *
 * There is no network here: `searchLocalPages` is a pure function over the
 * build-time manifest, so results are derived synchronously with `useMemo` and
 * the dialog never shows a loading or retry state. The markup reuses the
 * original `.blog-search-*` classes so the shared palette, dark mode and
 * motion rules apply unchanged.
 */
export function LocalSearch({ pages, rootPageId }: LocalSearchProps) {
  const dialog = React.useRef<HTMLDialogElement>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const trigger = React.useRef<HTMLButtonElement>(null)
  // Rendered closed on both the server and the first client paint; the dialog
  // is only ever promoted to modal from an effect.
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const trimmed = query.trim()
  const results = React.useMemo(
    () => (trimmed ? searchLocalPages(trimmed, pages, rootPageId) : []),
    [trimmed, pages, rootPageId]
  )

  React.useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (isSearchShortcut(event)) {
        // Another modal owns the viewport; leave its own shortcuts alone.
        if (document.querySelector('dialog[open]') && !dialog.current?.open)
          return
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  React.useEffect(() => {
    if (open) {
      if (!dialog.current?.open) dialog.current?.showModal()
      input.current?.focus()
    } else if (dialog.current?.open) {
      dialog.current.close()
    }
  }, [open])

  const clear = () => {
    setQuery('')
    input.current?.focus()
  }

  return (
    <>
      <button
        ref={trigger}
        type='button'
        className='blog-search-trigger blog-fill-button lr-search-trigger'
        aria-label='Search articles'
        onClick={() => setOpen(true)}
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
          <circle cx='10.5' cy='10.5' r='6.5' />
          <path d='m16 16 4 4' />
        </svg>
        <span className='lr-search-label' aria-hidden='true'>
          Search
        </span>
      </button>

      <dialog
        ref={dialog}
        className='blog-search-dialog'
        aria-labelledby='local-search-title'
        onCancel={() => setOpen(false)}
        onClose={() => {
          setOpen(false)
          trigger.current?.focus()
        }}
        onClick={(event) => {
          // Clicks on the backdrop land on the dialog element itself.
          if (event.target === dialog.current) setOpen(false)
        }}
      >
        <div className='blog-search-content'>
          <div className='blog-search-heading'>
            <h2 id='local-search-title'>Find your next rabbit hole</h2>
            <button
              type='button'
              aria-label='Close search'
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className='blog-search-field'>
            <input
              ref={input}
              type='search'
              aria-label='Search articles'
              placeholder='Search articles…'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type='button' onClick={clear}>
                Clear
              </button>
            ) : null}
          </div>

          <div role='status' className='blog-search-status'>
            {trimmed && results.length
              ? `${results.length} ${
                  results.length === 1 ? 'article' : 'articles'
                } found`
              : ''}
          </div>

          {!trimmed ? (
            <p className='blog-search-hint'>
              A topic, a tool, a tiny curiosity. Start anywhere.
            </p>
          ) : null}

          {trimmed && !results.length ? (
            <div className='blog-search-empty'>
              <svg
                aria-hidden='true'
                viewBox='0 0 100 70'
                width='100'
                height='70'
              >
                <path
                  d='M12 17q18-8 36 2v39q-18-10-36-2zm76 0q-18-8-36 2v39q18-10 36-2z'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                />
                <path
                  d='M66 3v10m-5-5h10M28 28h10m-10 9h10'
                  stroke='currentColor'
                  strokeWidth='2'
                />
              </svg>
              <h3>No pages on that shelf yet.</h3>
              <p>Try a broader topic or start fresh.</p>
              <button type='button' onClick={clear}>
                Clear search
              </button>
            </div>
          ) : null}

          {results.length ? (
            <ul className='blog-search-results' key={trimmed}>
              {results.map((result, index) => (
                <li
                  key={result.id}
                  style={
                    {
                      '--result-delay': `${Math.min(index, 5) * 35}ms`
                    } as React.CSSProperties
                  }
                >
                  <Link
                    href={result.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                  >
                    <span>{result.title}</span>
                    <span aria-hidden='true'>↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </dialog>
    </>
  )
}

export default LocalSearch
