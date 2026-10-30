import Head from 'next/head'
import Link from 'next/link'
import * as React from 'react'

import * as config from 'lib/config'
import { PageHead } from './PageHead'

import styles from './styles.module.css'

export const Page404: React.FC = () => {
  const title = 'Page Not Found'

  return (
    <>
      <PageHead />

      <Head>
        <meta property='og:site_name' content={config.name} />
        <meta property='og:title' content={title} />

        <title>{title}</title>
      </Head>

      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{title}</h1>

          <p>
            That page doesn’t exist. It may have been renamed or moved.{' '}
            <Link href='/'>Head back to the blog</Link>.
          </p>

          <img
            src='/404.png'
            alt='404 Not Found'
            className={styles.errorImage}
          />
        </main>
      </div>
    </>
  )
}
