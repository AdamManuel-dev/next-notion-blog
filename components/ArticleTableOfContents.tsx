import * as React from 'react'
import { Block, ExtendedRecordMap, PageBlock } from 'notion-types'
import {
  getArticleTableOfContents,
  ArticleTocEntry
} from 'lib/article-table-of-contents'
import { ArticleOutline } from './ArticleOutline'

/**
 * Collapsed, keyboard-native outline for the current article.
 *
 * Desktop keeps react-notion-x's sticky aside; this fills the gap on narrow
 * screens where the aside is hidden. Heading data comes from the record map,
 * so anchors match the rendered headings without touching the DOM. Rendering
 * is delegated to `ArticleOutline`, which the static local reader also uses.
 */
export function ArticleTableOfContents({
  block,
  recordMap
}: {
  block: Block
  recordMap: ExtendedRecordMap
}) {
  const entries: ArticleTocEntry[] = React.useMemo(
    () => getArticleTableOfContents(block as PageBlock, recordMap),
    [block, recordMap]
  )

  return <ArticleOutline entries={entries} />
}
