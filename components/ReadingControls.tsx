import * as React from 'react'
import {
  defaultReadingPreferences,
  parseReadingPreferences
} from 'lib/reading-storage'

export function ReadingControls() {
  const dialog = React.useRef<HTMLDialogElement>(null)
  const trigger = React.useRef<HTMLButtonElement>(null)
  const previousFocus = React.useRef<HTMLElement>(null)
  const [view, setView] = React.useState<'preferences' | 'shortcuts' | null>(
    null
  )
  const [preferences, setPreferences] = React.useState(
    defaultReadingPreferences
  )
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    try {
      setPreferences(
        parseReadingPreferences(
          localStorage.getItem('blog-reading-preferences')
        )
      )
    } catch {}
    setReady(true)
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        event.key !== '?' ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target.closest('input, textarea, select, [contenteditable="true"]') ||
        document.querySelector('dialog[open]')
      )
        return
      event.preventDefault()
      previousFocus.current = document.activeElement as HTMLElement
      setView('shortcuts')
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  React.useEffect(() => {
    if (!ready) return
    document.documentElement.style.setProperty(
      '--reading-font-size',
      `${preferences.size}px`
    )
    document.documentElement.style.setProperty(
      '--reading-line-height',
      String(preferences.spacing)
    )
    try {
      localStorage.setItem(
        'blog-reading-preferences',
        JSON.stringify(preferences)
      )
    } catch {}
  }, [preferences, ready])
  React.useEffect(() => {
    if (view) dialog.current?.showModal()
    else dialog.current?.close()
  }, [view])
  const close = () => setView(null)
  return (
    <>
      <button
        ref={trigger}
        type='button'
        className='reading-control-trigger'
        aria-label='Reading preferences'
        title='Reading preferences and keyboard shortcuts'
        onClick={() => {
          previousFocus.current = trigger.current
          setView('preferences')
        }}
      >
        Aa
      </button>
      <dialog
        ref={dialog}
        className='blog-search-dialog reading-dialog'
        aria-labelledby='reading-dialog-title'
        onCancel={close}
        onClose={() => {
          close()
          previousFocus.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close()
        }}
      >
        <div className='blog-search-content'>
          <div className='blog-search-heading'>
            <h2 id='reading-dialog-title'>
              {view === 'shortcuts'
                ? 'A few handy shortcuts'
                : 'Make yourself comfortable'}
            </h2>
            <button
              type='button'
              aria-label='Close reading preferences'
              onClick={close}
            >
              ×
            </button>
          </div>
          {view === 'preferences' ? (
            <>
              <fieldset>
                <legend>Text size</legend>
                <div className='reading-options'>
                  {[16, 18, 20].map((size) => (
                    <button
                      key={size}
                      type='button'
                      aria-pressed={preferences.size === size}
                      onClick={() =>
                        setPreferences((value) => ({ ...value, size }))
                      }
                    >
                      {size === 16
                        ? 'Standard'
                        : size === 18
                        ? 'Larger'
                        : 'Largest'}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Line spacing</legend>
                <div className='reading-options'>
                  {[1.5, 1.65, 1.85].map((spacing) => (
                    <button
                      key={spacing}
                      type='button'
                      aria-pressed={preferences.spacing === spacing}
                      onClick={() =>
                        setPreferences((value) => ({ ...value, spacing }))
                      }
                    >
                      {spacing === 1.5
                        ? 'Compact'
                        : spacing === 1.65
                        ? 'Comfortable'
                        : 'Airy'}
                    </button>
                  ))}
                </div>
              </fieldset>
              <p
                className='reading-preview'
                style={{
                  fontSize: preferences.size,
                  lineHeight: preferences.spacing
                }}
              >
                A little room to think. A little space to follow your curiosity.
              </p>
              <p className='blog-search-hint'>
                Saved in this browser for your next visit.
              </p>
              <div className='reading-dialog-actions'>
                <button
                  type='button'
                  onClick={() => setPreferences(defaultReadingPreferences)}
                >
                  Reset defaults
                </button>
                <button type='button' onClick={() => setView('shortcuts')}>
                  Keyboard shortcuts
                </button>
              </div>
            </>
          ) : (
            <>
              <dl className='shortcut-list'>
                <div>
                  <dt>
                    <kbd>Ctrl / ⌘</kbd> + <kbd>K</kbd>
                  </dt>
                  <dd>Search articles</dd>
                </div>
                <div>
                  <dt>
                    <kbd>?</kbd>
                  </dt>
                  <dd>Open this guide</dd>
                </div>
                <div>
                  <dt>
                    <kbd>Esc</kbd>
                  </dt>
                  <dd>Close a dialog or reference preview</dd>
                </div>
                <div>
                  <dt>
                    <kbd>Tab</kbd> / <kbd>Shift + Tab</kbd>
                  </dt>
                  <dd>Move between controls</dd>
                </div>
              </dl>
              <button type='button' onClick={() => setView('preferences')}>
                Reading preferences
              </button>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
