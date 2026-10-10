import * as React from 'react'
import { ShareArticle } from './ShareArticle'

export function ReaderDelight({ title, url }: { title: string; url: string }) {
  const end = React.useRef<HTMLDivElement>(null)
  const progress = React.useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = React.useState(false)
  const [finished, setFinished] = React.useState(false)

  const [sharing, setSharing] = React.useState(false)

  React.useEffect(() => {
    if (!finished) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) {
      setSharing(true)
      return
    }
    const timer = setTimeout(() => setSharing(true), 1600)
    const change = () => {
      if (reduced.matches) setSharing(true)
    }
    reduced.addEventListener('change', change)
    return () => {
      clearTimeout(timer)
      reduced.removeEventListener('change', change)
    }
  }, [finished])

  React.useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const marker = end.current
      if (!marker) return
      const top =
        document.querySelector('.notion-title')?.getBoundingClientRect().top +
          window.scrollY || 0
      const bottom = marker.getBoundingClientRect().top
      const distance = Math.max(
        1,
        bottom + window.scrollY - window.innerHeight - top
      )
      const amount = Math.min(1, Math.max(0, (window.scrollY - top) / distance))
      if (progress.current)
        progress.current.style.transform = `scaleX(${amount})`
      setShowTop(window.scrollY > 500)
      if (window.scrollY > 80 && bottom <= window.innerHeight && bottom >= 0)
        setFinished(true)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const resize = new ResizeObserver(schedule)
    resize.observe(document.body)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <>
      <div className='reading-track' aria-hidden='true'>
        <div ref={progress} />
      </div>
      {showTop && (
        <button
          className='back-to-top'
          type='button'
          aria-label='Back to top'
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'auto'
                : 'smooth'
            })
            const title = document.querySelector<HTMLElement>('.notion-title')
            title?.setAttribute('tabindex', '-1')
            title?.focus({ preventScroll: true })
          }}
        >
          <span aria-hidden='true'>↑</span>
        </button>
      )}
      <div
        ref={end}
        className={`article-end article-end-transition ${
          finished ? 'article-end-reached' : ''
        } ${sharing ? 'article-end-sharing' : ''}`}
      >
        <div className='article-end-thanks' aria-hidden={sharing}>
          <span className='article-end-mark' aria-hidden='true'>
            ✦
          </span>
          <span>You made it. Thanks for reading.</span>
        </div>
        <div className='article-end-share' aria-hidden={!sharing}>
          <ShareArticle title={title} url={url} />
        </div>
      </div>
    </>
  )
}
