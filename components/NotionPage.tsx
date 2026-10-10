import * as React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import cs from 'classnames'
import { useRouter } from 'next/router'
import { useSearchParam } from 'react-use'
import { useDarkMode } from 'lib/use-dark-mode'
import { PageBlock } from 'notion-types'

import { Tweet } from 'react-tweet'

// core notion renderer
import { NotionRenderer } from 'react-notion-x'

// utils
import { getBlockTitle, getBlockValue } from 'notion-utils'
import { mapPageUrl, getCanonicalPageUrl } from 'lib/map-page-url'
import { mapNotionImageUrl } from 'lib/map-image-url'
import { getPageDescription } from 'lib/get-page-description'
import { getPageTweet } from 'lib/get-page-tweet'
import { searchNotion } from 'lib/search-notion'
import * as types from 'lib/types'
import * as config from 'lib/config'

// components
import { CustomFont } from './CustomFont'
import { Loading } from './Loading'
import { Page404 } from './Page404'
import { PageHead } from './PageHead'
import { PageActions } from './PageActions'
import { Footer } from './Footer'
// import { PageSocial } from './PageSocial'
// import { GitHubShareButton } from './GitHubShareButton'
import { ReactUtterances } from './ReactUtterances'

import styles from './styles.module.css'

const Code = dynamic(() =>
  import('react-notion-x/third-party/code').then((m) => m.Code)
)
const Collection = dynamic(() =>
  import('react-notion-x/third-party/collection').then((m) => m.Collection)
)
const Equation = dynamic(() =>
  import('react-notion-x/third-party/equation').then(
    (notion) => notion.Equation
  )
)

const Modal = dynamic(
  () =>
    import('react-notion-x/third-party/modal').then((notion) => notion.Modal),
  { ssr: false }
)

export const NotionPage: React.FC<types.PageProps> = ({
  site,
  recordMap,
  error,
  pageId
}) => {
  const router = useRouter()
  const lite = useSearchParam('lite')

  const params: any = {}
  if (lite) params.lite = lite

  // lite mode is for oembed
  const isLiteMode = lite === 'true'
  const searchParams = new URLSearchParams(params)

  const darkMode = useDarkMode()

  React.useEffect(() => {
    document.body.classList.toggle('notion-lite', isLiteMode)
    return () => document.body.classList.remove('notion-lite')
  }, [isLiteMode])

  if (router.isFallback) {
    return <Loading />
  }

  const keys = Object.keys(recordMap?.block || {})
  const block = getBlockValue(recordMap?.block?.[keys[0]])

  if (error || !site || !keys.length || !block) {
    return <Page404 site={site} pageId={pageId} error={error} />
  }

  const title = getBlockTitle(block, recordMap) || site.name

  const siteMapPageUrl = mapPageUrl(site, recordMap, searchParams)

  const canonicalPageUrl =
    !config.isDev && getCanonicalPageUrl(site, recordMap)(pageId)

  // const isRootPage =
  //   parsePageId(block.id) === parsePageId(site.rootNotionPageId)
  const isBlogPost =
    block.type === 'page' && block.parent_table === 'collection'
  const showTableOfContents = isBlogPost
  const minTableOfContentsItems = 3

  const socialImage = mapNotionImageUrl(
    (block as PageBlock).format?.page_cover || config.defaultPageCover,
    block
  )

  const socialDescription =
    getPageDescription(block, recordMap) ?? config.description

  let comments: React.ReactNode = null
  let pageAside: React.ReactChild = null

  // only display comments and page actions on blog post pages
  if (isBlogPost) {
    if (config.utterancesGitHubRepo) {
      comments = (
        <ReactUtterances
          key={pageId}
          repo={config.utterancesGitHubRepo}
          issueMap='issue-term'
          issueTerm='title'
          theme={darkMode.value ? 'photon-dark' : 'github-light'}
        />
      )
    }

    const tweet = getPageTweet(block, recordMap)
    if (tweet) {
      pageAside = <PageActions tweet={tweet} />
    }
  }

  return (
    <>
      <PageHead site={site} />

      <Head>
        <meta property='og:title' content={title} />
        <meta property='og:site_name' content={site.name} />

        <meta name='twitter:title' content={title} />
        <meta property='twitter:domain' content={site.domain} />

        {config.twitter && (
          <meta name='twitter:creator' content={`@${config.twitter}`} />
        )}

        {socialDescription && (
          <>
            <meta name='description' content={socialDescription} />
            <meta property='og:description' content={socialDescription} />
            <meta name='twitter:description' content={socialDescription} />
          </>
        )}

        {socialImage ? (
          <>
            <meta name='twitter:card' content='summary_large_image' />
            <meta name='twitter:image' content={socialImage} />
            <meta property='og:image' content={socialImage} />
          </>
        ) : (
          <meta name='twitter:card' content='summary' />
        )}

        {canonicalPageUrl && (
          <>
            <link rel='canonical' href={canonicalPageUrl} />
            <meta property='og:url' content={canonicalPageUrl} />
            <meta property='twitter:url' content={canonicalPageUrl} />
          </>
        )}

        <title>{title}</title>
      </Head>

      <CustomFont site={site} />

      <NotionRenderer
        bodyClassName={cs(
          styles.notion,
          pageId === site.rootNotionPageId && 'index-page'
        )}
        components={{
          PageLink: ({
            href,
            as,
            passHref,
            prefetch = false,
            replace,
            scroll,
            shallow,
            locale,
            ...props
          }) => (
            <Link
              legacyBehavior
              href={href}
              as={as}
              passHref={passHref}
              prefetch={prefetch}
              replace={replace}
              scroll={scroll}
              shallow={shallow}
              locale={locale}
            >
              <a {...props} />
            </Link>
          ),
          Code,
          Collection,
          Tweet,
          Modal,
          Equation
        }}
        recordMap={recordMap}
        rootPageId={site.rootNotionPageId}
        fullPage={!isLiteMode}
        darkMode={darkMode.value}
        previewImages={site.previewImages !== false}
        showCollectionViewDropdown={false}
        showTableOfContents={showTableOfContents}
        minTableOfContentsItems={minTableOfContentsItems}
        defaultPageIcon={config.defaultPageIcon}
        defaultPageCover={config.defaultPageCover}
        defaultPageCoverPosition={config.defaultPageCoverPosition}
        mapPageUrl={siteMapPageUrl}
        mapImageUrl={mapNotionImageUrl}
        searchNotion={searchNotion}
        pageFooter={comments}
        pageAside={pageAside}
        footer={
          <Footer
            isDarkMode={darkMode.value}
            toggleDarkMode={darkMode.toggle}
          />
        }
      />

      {/* <GitHubShareButton /> */}
    </>
  )
}
