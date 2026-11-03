import Head from 'next/head'
import Link from 'next/link'
import * as React from 'react'

import type { LiveBlockInstance } from 'lib/live-block-types'
import { prepareLocalArticle } from 'lib/local-article-outline'
import { selectRelatedPages } from 'lib/related-pages'
import { useDarkMode } from 'lib/use-dark-mode'
import { ArticleOutline } from './ArticleOutline'
import { Footer } from './Footer'
import { FootnotePreview } from './FootnotePreview'
import { ImageReveal } from './ImageReveal'
import { LocalReaderHeader } from './LocalReaderHeader'
import { LiveBlocks } from './LiveBlocks'
import { ReaderDelight } from './ReaderDelight'
import { ReadingResume } from './ReadingResume'
import { RelatedArticles } from './RelatedArticles'
import { useLegacyFragments } from './useLegacyFragments'
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
/**
 * Pre-metadata fallback: the slug the page served at `/` used to have, before
 * the content pipeline declared `type: home` in frontmatter. Only consulted
 * for index entries that carry no `type`.
 */
const LEGACY_ROOT_SLUG = 'adam-manuel-s-dev-blog'
/** The original site uses the lightning bolt as its default page icon. */
const DEFAULT_PAGE_ICON = '⚡'
const SITE_ORIGIN = 'https://blog.manuel.dev'
const SITE_DESCRIPTION = 'Notes and articles by Adam Manuel.'
const MAX_DESCRIPTION_LENGTH = 180

/**
 * One entry of the static index shipped with every page.
 *
 * The metadata fields come from MDX frontmatter and stay optional here so the
 * layout keeps rendering for fixtures (and content) that predate them.
 */
export interface LocalPageIndexEntry {
  id: string
  slug: string
  title: string
  /** Frontmatter description; drives the meta description when present. */
  description?: string
  /** Frontmatter page kind. Exactly one page is the `home` page. */
  type?: 'home' | 'post' | 'note'
  tags?: string[]
  /** Frontmatter sort key; lower sorts first. */
  order?: number
}

export interface LocalPageData extends LocalPageIndexEntry {
  /** MDX compiled to static HTML at build time. */
  html: string
  /** Legacy fragment IDs mapped to canonical IDs on actual article blocks. */
  fragmentAliases?: Record<string, string>
  /** Component definitions and literal props for this article's live instances. */
  liveBlocks?: LiveBlockInstance[]
  cover: string | null
  /** Original Notion URL, when the page was migrated from one. */
  sourceUrl?: string | null
  /** Recovered page icon: an emoji, or a local asset path starting with `/`. */
  icon?: string | null
  /** Normalized 0..1 vertical focal point for the cover image. */
  coverPosition?: number
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

/** Plain-text fallback description, used when frontmatter declares none. */
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

const escapePattern = /[&<>"']/g
const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

function escapeHtml(value: string): string {
  return value.replace(escapePattern, (character) => htmlEscapes[character])
}

/** The home page is the one page whose frontmatter declares `type: home`. */
function isHomeEntry(entry: LocalPageIndexEntry): boolean {
  return entry.type ? entry.type === 'home' : entry.slug === LEGACY_ROOT_SLUG
}

/** Articles listed on the homepage, in frontmatter order (slug breaks ties). */
export function selectEngineeringArticles(
  pages: LocalPageIndexEntry[] | undefined
): LocalPageIndexEntry[] {
  return (pages ?? [])
    .filter((entry) => entry.type === 'post')
    .sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
    )
}

/**
 * The homepage's "Engineering articles" list. It used to be hand-maintained
 * markup inside the homepage body; it now comes from page metadata and keeps
 * the same structure (`section > h2 + ul > li > a`), so the existing content
 * styles apply unchanged. Titles and slugs are escaped on the way in.
 */
export function renderEngineeringArticles(
  articles: LocalPageIndexEntry[]
): string {
  if (!articles.length) return ''

  const items = articles
    .map(
      (entry) =>
        `<li><a href="/${escapeHtml(entry.slug)}">${escapeHtml(
          entry.title
        )}</a></li>`
    )
    .join('')

  return `<section id="engineering-articles"><h2>Engineering articles</h2><ul>${items}</ul></section>`
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
  // Frontmatter wins everywhere; the text fallback keeps pre-metadata pages
  // (and fixtures) describable.
  const description =
    page.description?.trim() ||
    (isHome ? SITE_DESCRIPTION : getDescription(html, title))

  const indexEntries = isHome && pages?.length ? pages : null

  // The home page identifies itself through its metadata, not a hardcoded slug.
  const rootPageId = isHome ? page.id : pages?.find(isHomeEntry)?.id

  // Homepage index of articles, rebuilt from metadata on every build.
  const engineeringArticlesHtml = React.useMemo(
    () =>
      isHome ? renderEngineeringArticles(selectEngineeringArticles(pages)) : '',
    [isHome, pages]
  )

  // Related reading is title-similarity only, over the same static index.
  const relatedPages = React.useMemo(
    () =>
      isHome
        ? []
        : selectRelatedPages(
            { id: page.id, title },
            (pages ?? [])
              .filter((entry) => !isHomeEntry(entry))
              .map((entry) => ({
                id: entry.id,
                title: entry.title,
                href: `/${entry.slug}`
              }))
          ),
    [isHome, page.id, title, pages]
  )

  // Read compiler-owned heading anchors; the homepage has no outline.
  const article = React.useMemo(
    () => (isHome ? { html, entries: [] } : prepareLocalArticle(html)),
    [html, isHome]
  )

  const bodyHtml = engineeringArticlesHtml + article.html
  const articleRef = React.useRef<HTMLElement>(null)
  useLegacyFragments(articleRef, page.id, bodyHtml, page.fragmentAliases)

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

            {isHome ? null : (
              <ReadingResume
                pageId={page.id}
                articleRef={articleRef}
                fragmentAliases={page.fragmentAliases}
              />
            )}

            {isHome ? null : <ArticleOutline entries={article.entries} />}

            {/* The body is MDX compiled to static HTML at build time from
                trusted in-repo sources — never user input, and never sanitized
                checked-in HTML. The articles index is prepended as markup (not
                as JSX children) so the body stays a direct child of the
                article element and the content styles cascade unchanged. */}
            <article
              ref={articleRef}
              className={`${styles.content} lr-article`}
              // pi-lens-ignore: dangerously-set-inner-html -- build-time MDX
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
            <LiveBlocks
              articleRef={articleRef}
              pageId={page.id}
              bodyHtml={bodyHtml}
              blocks={page.liveBlocks || []}
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
