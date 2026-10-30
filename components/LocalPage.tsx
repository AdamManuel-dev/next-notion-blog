import Head from 'next/head'
import Link from 'next/link'
import * as React from 'react'

import { prepareLocalArticle } from 'lib/local-article-outline'
import { selectRelatedPages } from 'lib/related-pages'
import { useDarkMode } from 'lib/use-dark-mode'
import { ArticleOutline } from './ArticleOutline'
import { Footer } from './Footer'
import { FootnotePreview } from './FootnotePreview'
import { ImageReveal } from './ImageReveal'
import { LocalReaderHeader } from './LocalReaderHeader'
import { ReaderDelight } from './ReaderDelight'
import { ReadingResume } from './ReadingResume'
import { RelatedArticles } from './RelatedArticles'
import styles from './LocalPage.module.css'

/** Hover/focus affordance; decorative, so it stays out of the a11y tree. */
function LinkArrow() {
  return (
    <span className='lr-arrow' aria-hidden='true'>
      →
    </span>
  )
}

const SITE_NAME = 'Adam Manuel’s “Dev Blog”'
/** Manifest slug of the page served at `/`. */
const ROOT_SLUG = 'adam-manuel-s-dev-blog'
/** The original site uses the lightning bolt as its default page icon. */
const DEFAULT_PAGE_ICON = '⚡'
const SITE_ORIGIN = 'https://blog.manuel.dev'
const SITE_DESCRIPTION = 'Notes and articles by Adam Manuel.'
const MAX_DESCRIPTION_LENGTH = 180

export interface LocalPageData {
  id: string
  slug: string
  title: string
  html: string
  cover: string | null
  sourceUrl: string
  /** Recovered page icon: an emoji, or a local asset path starting with `/`. */
  icon?: string | null
  /** Normalized 0..1 vertical focal point for the cover image. */
  coverPosition?: number
}

export interface LocalPageIndexEntry {
  id: string
  slug: string
  title: string
}

export interface LocalPageProps {
  page: LocalPageData
  isHome: boolean
  /** Full static index: powers search everywhere, the list on the homepage. */
  pages?: LocalPageIndexEntry[]
}

const tagPattern = /<[^>]*>/g
const entityPattern = /&(amp|lt|gt|quot|#39|nbsp);/g
const whitespacePattern = /\s+/g

const entityReplacements: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' '
}

/** Builds a plain-text meta description from the already-sanitized markup. */
function getDescription(html: string, title: string): string {
  const text = html
    .replace(tagPattern, ' ')
    .replace(entityPattern, (match) => entityReplacements[match] ?? ' ')
    .replace(whitespacePattern, ' ')
    .trim()

  if (!text) {
    return `${title} — ${SITE_NAME}`
  }

  if (text.length <= MAX_DESCRIPTION_LENGTH) {
    return text
  }

  const truncated = text.slice(0, MAX_DESCRIPTION_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')

  return `${(lastSpace > 80
    ? truncated.slice(0, lastSpace)
    : truncated
  ).trim()}…`
}

/**
 * Renders the recovered page icon: an emoji, or a downloaded local image.
 * Decorative either way — the title already names the page.
 */
function PageIcon({
  icon,
  className
}: {
  icon: string | null | undefined
  className: string
}) {
  const resolved = icon || DEFAULT_PAGE_ICON

  if (resolved.startsWith('/')) {
    return (
      <img className={className} src={resolved} alt='' aria-hidden='true' />
    )
  }

  return (
    <span className={className} aria-hidden='true'>
      {resolved}
    </span>
  )
}

export function LocalPage({ page, isHome, pages }: LocalPageProps) {
  const { title, html, cover, coverPosition, icon, slug, sourceUrl } = page
  const { value: isDarkMode, toggle: toggleDarkMode } = useDarkMode()

  const documentTitle = isHome ? SITE_NAME : `${title} — ${SITE_NAME}`
  const canonicalUrl = isHome ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}/${slug}`
  const description = isHome ? SITE_DESCRIPTION : getDescription(html, title)

  const indexEntries = isHome && pages?.length ? pages : null

  const rootPageId = isHome
    ? page.id
    : pages?.find((entry) => entry.slug === ROOT_SLUG)?.id

  // Related reading is title-similarity only, over the same static index.
  const relatedPages = React.useMemo(
    () =>
      isHome
        ? []
        : selectRelatedPages(
            { id: page.id, title },
            (pages ?? [])
              .filter((entry) => entry.slug !== ROOT_SLUG)
              .map((entry) => ({
                id: entry.id,
                title: entry.title,
                href: `/${entry.slug}`
              }))
          ),
    [isHome, page.id, title, pages]
  )

  // Heading anchors are injected once per article; the homepage has no outline.
  const article = React.useMemo(
    () => (isHome ? { html, entries: [] } : prepareLocalArticle(html)),
    [html, isHome]
  )

  return (
    <>
      <Head>
        <title>{documentTitle}</title>
        <meta name='description' content={description} />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='canonical' href={canonicalUrl} />
        <meta property='og:type' content='article' />
        <meta property='og:site_name' content={SITE_NAME} />
        <meta property='og:title' content={documentTitle} />
        <meta property='og:description' content={description} />
        <meta property='og:url' content={canonicalUrl} />
      </Head>

      <div
        className={`${styles.page}${
          isHome ? ` ${styles.wide}` : ''
        } local-reader`}
        id='top'
      >
        <a className={styles.skipLink} href='#main'>
          Skip to content
        </a>

        <LocalReaderHeader
          key={`header-${page.id}`}
          pages={pages}
          rootPageId={rootPageId}
          siteName={SITE_NAME}
          canonicalUrl={canonicalUrl}
          title={title}
          icon={icon ?? null}
          isHome={isHome}
          className={styles.header}
          brandClassName={styles.brand}
        />

        {/* Keyed on the page so image listeners and reader state reset on
            every client-side navigation. */}
        <ImageReveal key={`content-${page.id}`}>
          <main className={styles.main} id='main'>
            {cover ? (
              <img
                className={styles.cover}
                src={cover}
                alt=''
                style={{
                  objectPosition: `center ${Math.round(
                    (coverPosition ?? 0.5) * 100
                  )}%`
                }}
              />
            ) : null}

            <PageIcon icon={icon} className={styles.pageIcon} />

            {/* Keyed on the page so the fade plays once per navigation. */}
            <h1 key={page.id} className={`${styles.title} lr-title`}>
              {title}
            </h1>

            {isHome ? null : <ReadingResume pageId={page.id} />}

            {isHome ? null : <ArticleOutline entries={article.entries} />}

            {/* Content is pre-sanitized at build time and checked into the repo. */}
            <article
              className={`${styles.content} lr-article`}
              // pi-lens-ignore: dangerouslySetInnerHTML
              dangerouslySetInnerHTML={{ __html: article.html }}
            />

            {indexEntries ? (
              <section className={styles.index} aria-labelledby='all-pages'>
                <details className={styles.indexDetails}>
                  <summary id='all-pages'>All notes and articles</summary>
                  <ul className={styles.indexList}>
                    {indexEntries.map((entry) => (
                      <li key={entry.id}>
                        <Link
                          href={entry.id === page.id ? '/' : `/${entry.slug}`}
                        >
                          {entry.title}
                          <LinkArrow />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            ) : null}

            {isHome ? null : (
              <>
                <ReaderDelight title={title} url={canonicalUrl} />
                <RelatedArticles pages={relatedPages} />
                <FootnotePreview />
              </>
            )}
          </main>
        </ImageReveal>

        {/* Utility links live in a nav so the shared <Footer> stays the only
            <footer> on the page. */}
        <nav className={styles.pageNav} aria-label='Page'>
          <Link href='/'>
            Home
            <LinkArrow />
          </Link>
          <a href='#top'>
            Back to top
            <LinkArrow />
          </a>
          {sourceUrl ? (
            <a href={sourceUrl} rel='noopener noreferrer nofollow'>
              Original
              <LinkArrow />
            </a>
          ) : null}
        </nav>

        <Footer isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      </div>
    </>
  )
}

export default LocalPage
