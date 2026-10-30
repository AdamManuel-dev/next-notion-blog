import { LocalPage } from 'components/LocalPage'
import { getLocalPage, getLocalPages } from 'lib/local-content'

export function getStaticProps() {
  const page = getLocalPage()
  if (!page)
    throw new Error('Local homepage is missing from content/manifest.json')
  return { props: { page, pages: getLocalPages(), isHome: true } }
}

export default LocalPage
