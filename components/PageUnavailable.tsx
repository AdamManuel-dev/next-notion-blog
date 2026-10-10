import React from 'react'
import Head from 'next/head'
import styles from './styles.module.css'

export function PageUnavailable() {
  const [retrying, setRetrying] = React.useState(false)
  return (
    <div className={`${styles.container} ${styles.unavailable}`}>
      <Head>
        <title>Page temporarily unavailable</title>
        <meta name='robots' content='noindex' />
      </Head>
      <main className={styles.main}>
        <h1>This page is temporarily unavailable</h1>
        <p>Notion is busy. Please wait a minute, then try again.</p>
        <button
          type='button'
          disabled={retrying}
          onClick={() => {
            setRetrying(true)
            window.location.reload()
          }}
        >
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
      </main>
    </div>
  )
}
