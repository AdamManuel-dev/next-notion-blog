/**
 * Builds the in-article table of contents from Notion record map data.
 *
 * Heading discovery is delegated to `notion-utils`' `getPageTableOfContents`,
 * so anchors, indent levels and child-page exclusion match exactly what
 * react-notion-x renders. This module only adds the "is it worth showing?"
 * threshold and the rendered anchor/href shape.
 */
import { getPageTableOfContents, uuidToId } from 'notion-utils'
import type { ExtendedRecordMap, PageBlock } from 'notion-types'

export type ArticleTocEntry = {
  /** Notion block uuid of the heading. */
  id: string
  /** `uuidToId` form of the block id, matching the rendered anchor target. */
  anchor: string
  /** Ready-to-use fragment link, e.g. `#1a2b…`. */
  href: string
  text: string
  type: string
  /** Normalised nesting depth, starting at 0. */
  indentLevel: number
}

export type ArticleTocOptions = {
  /** Below this many headings the table of contents is not worth showing. */
  minHeadings?: number
}

/** Fewer than three headings reads as noise rather than navigation. */
export const DEFAULT_MIN_TOC_HEADINGS = 3

/**
 * Returns the article table of contents, or an empty list when the page is
 * missing or has too few headings for navigation to be useful.
 */
export function getArticleTableOfContents(
  page: PageBlock | undefined | null,
  recordMap: ExtendedRecordMap | undefined | null,
  options: ArticleTocOptions = {}
): ArticleTocEntry[] {
  const minHeadings = Math.max(
    0,
    options.minHeadings ?? DEFAULT_MIN_TOC_HEADINGS
  )
  if (!page || !recordMap?.block) return []

  const toc = getPageTableOfContents(page, recordMap).filter((entry) =>
    entry.text?.trim()
  )
  if (toc.length < minHeadings) return []

  return toc.map((entry) => {
    const anchor = uuidToId(entry.id)
    return {
      id: entry.id,
      anchor,
      href: `#${anchor}`,
      text: entry.text,
      type: entry.type,
      indentLevel: entry.indentLevel
    }
  })
}
