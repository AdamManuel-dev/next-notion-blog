import Head from 'next/head'
import * as React from 'react'

import * as config from 'lib/config'

/** Shared document head for the standalone error routes. */
export const PageHead: React.FC<{ description?: string }> = ({
  description = config.description
}) => {
  return (
    <Head>
      <meta charSet='utf-8' />
      <meta httpEquiv='Content-Type' content='text/html; charset=utf-8' />
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, shrink-to-fit=no'
      />

      {description && (
        <>
          <meta name='description' content={description} />
          <meta property='og:description' content={description} />
        </>
      )}

      <meta name='theme-color' content='#EB625A' />
      <meta property='og:type' content='website' />
    </Head>
  )
}
