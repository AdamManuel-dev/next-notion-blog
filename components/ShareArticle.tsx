import * as React from 'react'

export function ShareArticle({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>()
  React.useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async () => {
    clearTimeout(timer.current)
    setError(false)
    setCopied(false)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      timer.current = setTimeout(() => setCopied(false), 2500)
    } catch {
      setError(true)
    }
  }
  return (
    <section className='article-share' aria-label='Share this article'>
      <p>Worth passing along?</p>
      <div className='article-share-actions'>
        <button type='button' onClick={copy}>
          <span aria-hidden='true'>{copied ? '✓' : '⧉'}</span>{' '}
          {copied ? 'Link copied!' : 'Copy link'}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?${new URLSearchParams({
            text: title,
            url
          })}`}
          target='_blank'
          rel='noopener noreferrer'
          aria-label='Share on X (opens in a new tab)'
        >
          X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams(
            { url }
          )}`}
          target='_blank'
          rel='noopener noreferrer'
          aria-label='Share on LinkedIn (opens in a new tab)'
        >
          LinkedIn
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(
            title
          )}&body=${encodeURIComponent(`${title}\n\n${url}`)}`}
          aria-label='Share by email'
        >
          Email
        </a>
      </div>
      <span className='blog-sr-only' role='status'>
        {copied ? 'Article link copied to clipboard.' : ''}
      </span>
      {error && (
        <div className='share-copy-fallback'>
          <label htmlFor='article-share-url'>Copy this link manually:</label>
          <input
            id='article-share-url'
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
          />
        </div>
      )}
    </section>
  )
}
