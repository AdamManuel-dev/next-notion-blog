import type { GetStaticPropsContext } from 'next'
import { LocalPage } from 'components/LocalPage'
import { getLocalPage, getLocalPages, getLocalPaths } from 'lib/local-content'
import { contentRevision } from '../.generated/content-revision'

export async function getStaticProps(context: GetStaticPropsContext) {
  const page = await getLocalPage(context.params?.pageId as string)
  if (!page) return { notFound: true }
  // The home page is also reachable through its id aliases.
  const isHome = page.type === 'home'
  // The full index ships with every page: articles use it for search and
  // related reading, the homepage additionally renders it as a list.
  return {
    props: {
      page,
      pages: getLocalPages(),
      isHome,
      // The generated dependency makes filesystem edits refresh static props.
      ...(process.env.NODE_ENV === 'development' ? { contentRevision } : {})
    }
  }
}

export function getStaticPaths() {
  return {
    paths: getLocalPaths().map((pageId) => ({ params: { pageId } })),
    fallback: false
  }
}

export default LocalPage
