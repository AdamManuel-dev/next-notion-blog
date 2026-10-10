import * as React from 'react'
import { useRouter } from 'next/router'
import styles from './styles.module.css'

export function NavigationLoading() {
  const { events } = useRouter()
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let pendingUrl: string | undefined
    const start = (url: string, { shallow }: { shallow: boolean }) => {
      if (shallow) return
      pendingUrl = url
      clearTimeout(timer)
      // Cached navigations should not flash a loading indicator.
      timer = setTimeout(() => setLoading(true), 180)
    }
    const finish = (url: string) => {
      if (url !== pendingUrl) return
      pendingUrl = undefined
      clearTimeout(timer)
      setLoading(false)
    }
    const fail = (_error: unknown, url: string) => finish(url)
    events.on('routeChangeStart', start)
    events.on('routeChangeComplete', finish)
    events.on('routeChangeError', fail)
    return () => {
      clearTimeout(timer)
      events.off('routeChangeStart', start)
      events.off('routeChangeComplete', finish)
      events.off('routeChangeError', fail)
    }
  }, [events])

  if (!loading) return null

  return (
    <div className={styles.navigationLoading} role='status'>
      <div className={styles.navigationTrack} aria-hidden='true'>
        <span />
      </div>
      <div className={styles.navigationPill}>
        <span className={styles.loadingSpark} aria-hidden='true'>
          ✦
        </span>
        Opening your next read
        <span className={styles.loadingDots} aria-hidden='true'>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}
