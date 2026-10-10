import React from 'react'
import { domain } from 'lib/config'
import { resolveNotionPage } from 'lib/resolve-notion-page'
import { NotionPage } from 'components'

export const getStaticProps = async (context) => {
  try {
    const props = await resolveNotionPage(domain)

    if (
      props.error?.statusCode === 503 &&
      process.env.NODE_ENV === 'production' &&
      context.revalidateReason === 'stale'
    ) {
      // Keep the previously generated page when background refresh fails.
      throw new Error(props.error.message)
    }
    return { props, revalidate: props.error?.statusCode === 503 ? 15 : 60 }
  } catch (err) {
    console.error('page error', domain, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export default function NotionDomainPage(props) {
  return <NotionPage {...props} />
}
