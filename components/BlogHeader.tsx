import * as React from 'react'
import { useDialogViewport } from 'lib/use-dialog-viewport'
import { ReadingControls } from './ReadingControls'
import Link from 'next/link'
import { Block, ExtendedRecordMap } from 'notion-types'
import { Breadcrumbs, useNotionContext } from 'react-notion-x'
import { getBlockValue, getBlockTitle, getBlockParentPage } from 'notion-utils'

type Result = { id: string; title: string; href: string }

export function BlogHeader({ block }: { block: Block }) {
  useDialogViewport()
  const { searchNotion, rootPageId, mapPageUrl } = useNotionContext()
  const dialog = React.useRef<HTMLDialogElement>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const trigger = React.useRef<HTMLButtonElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<Result[]>([])
  const [state, setState] = React.useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [retry, setRetry] = React.useState(0)

  React.useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key.toLowerCase() === 'k' ||
          (event.metaKey && event.key.toLowerCase() === 'p'))
      ) {
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
      dialog.current?.showModal()
      input.current?.focus()
    } else if (dialog.current?.open) {
      dialog.current.close()
    }
  }, [open])

  React.useEffect(() => {
    if (!open || !query.trim()) {
      setResults([])
      setState('idle')
      return
    }
    let active = true
    setState('loading')
    const timer = setTimeout(async () => {
      try {
        const response = await searchNotion({
          query: query.trim(),
          ancestorId: rootPageId || block.id
        })
        if (!active) return
        if ((response as any).error || (response as any).errorId)
          throw new Error('Search unavailable')
        const resultMap: ExtendedRecordMap = {
          collection: {},
          collection_view: {},
          notion_user: {},
          ...response.recordMap,
          collection_query: {},
          signed_urls: {}
        }
        const pages = new Map<string, Result>()
        for (const result of response.results) {
          const found = getBlockValue(resultMap.block[result.id])
          if (!found) continue
          const page =
            getBlockParentPage(found, resultMap, {
              inclusive: true
            }) || found
          const title = getBlockTitle(page, resultMap)
          if (title)
            pages.set(page.id, {
              id: page.id,
              title,
              href: mapPageUrl(page.id, resultMap)
            })
        }
        setResults([...pages.values()])
        setState('ready')
      } catch {
        if (active) setState('error')
      }
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, open, retry, searchNotion, rootPageId, block.id, mapPageUrl])

  const clear = () => {
    setQuery('')
    input.current?.focus()
  }
  return (
    <header className='notion-header'>
      <div className='notion-nav-header'>
        <Breadcrumbs block={block} />
        <div className='blog-header-actions'>
          <ReadingControls />
          <button
            ref={trigger}
            type='button'
            className='blog-search-trigger'
            onClick={() => setOpen(true)}
          >
            ⌕ <span>Search</span>
          </button>
        </div>
      </div>
      <dialog
        ref={dialog}
        className='blog-search-dialog'
        aria-labelledby='blog-search-title'
        onCancel={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
          }
        }}
        onClose={() => {
          setOpen(false)
          trigger.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === dialog.current) setOpen(false)
        }}
      >
        <div className='blog-search-content'>
          <div className='blog-search-heading'>
            <h2 id='blog-search-title'>Find your next rabbit hole</h2>
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
            {query && (
              <button type='button' onClick={clear}>
                Clear
              </button>
            )}
          </div>
          <div role='status' className='blog-search-status'>
            {state === 'loading'
              ? 'Looking through the library…'
              : state === 'ready' && results.length
              ? `${results.length} ${
                  results.length === 1 ? 'article' : 'articles'
                } found`
              : ''}
          </div>
          {state === 'idle' && (
            <p className='blog-search-hint'>
              A topic, a tool, a tiny curiosity. Start anywhere.
            </p>
          )}
          {state === 'error' && (
            <div className='blog-search-empty'>
              <p>Search is taking a breather. Please try again shortly.</p>
              <button
                type='button'
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          )}
          {state === 'ready' && !results.length && (
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
          )}
          {state === 'ready' && results.length > 0 && (
            <ul className='blog-search-results' key={query}>
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
          )}
        </div>
      </dialog>
    </header>
  )
}
