import { LocalPage } from 'components/LocalPage'
import { getLocalPage, getLocalPages } from 'lib/local-content'
import { contentRevision } from '../.generated/content-revision'

export async function getStaticProps() {
  const page = await getLocalPage()
  if (!page) throw new Error('No content page declares `type: home`')
  return {
    props: {
      page,
      pages: getLocalPages(),
      isHome: true,
      ...(process.env.NODE_ENV === 'development' ? { contentRevision } : {})
    }
  }
}

export default LocalPage
