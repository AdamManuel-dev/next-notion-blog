import type { GetStaticPropsContext } from 'next'
import { LocalPage } from 'components/LocalPage'
import { getLocalPage, getLocalPages, getLocalPaths } from 'lib/local-content'

export function getStaticProps(context: GetStaticPropsContext) {
  const page = getLocalPage(context.params?.pageId as string)
  if (!page) return { notFound: true }
  // The root page is also reachable through its slug aliases.
  const isHome = page.id === getLocalPage()?.id
  // The full index ships with every page: articles use it for search and
  // related reading, the homepage additionally renders it as a list.
  return { props: { page, pages: getLocalPages(), isHome } }
}

export function getStaticPaths() {
  return {
    paths: getLocalPaths().map((pageId) => ({ params: { pageId } })),
    fallback: false
  }
}

export default LocalPage
