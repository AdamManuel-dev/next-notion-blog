import React from 'react'
import { domain } from 'lib/config'
import { resolveNotionPage } from 'lib/resolve-notion-page'
import { NotionPage } from 'components'

export const getStaticProps = async (context) => {
  const rawPageId = context.params.pageId as string

  if (rawPageId === 'sitemap.xml' || rawPageId === 'robots.txt') {
    return {
      redirect: { destination: `/api/${rawPageId}`, permanent: false }
    }
  }

  const props = await resolveNotionPage(domain, rawPageId)
  if (props.error?.statusCode === 404) {
    return { notFound: true, revalidate: 60 }
  }

  return { props, revalidate: 60 }
}

export async function getStaticPaths() {
  // Generate articles on first request instead of crawling Notion during builds.
  return { paths: [], fallback: 'blocking' }
}

export default function NotionDomainDynamicPage(props) {
  return <NotionPage {...props} />
}
