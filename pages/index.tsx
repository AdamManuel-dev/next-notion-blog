import { LocalPage } from 'components/LocalPage'
import { getLocalPage, getLocalPages } from 'lib/local-content'

export async function getStaticProps() {
  const page = await getLocalPage()
  if (!page) throw new Error('No content page declares `type: home`')
  return { props: { page, pages: getLocalPages(), isHome: true } }
}

export default LocalPage
