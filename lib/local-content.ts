/**
 * Page-facing facade over the shared, typed build-time MDX pipeline.
 * Everything here runs at build time only.
 */

import {
  getLocalPage as getMdxPage,
  getLocalPages as getMdxPages,
  getLocalPaths as getMdxPaths
} from './mdx-content.ts'

import type { LocalPageContent, LocalPageSummary } from './mdx-content.ts'

export type {
  LocalPageContent,
  LocalPageSummary,
  LocalPageType
} from './mdx-content.ts'

/** Static index of every page, sorted by `order` then `slug`. */
export function getLocalPages(): LocalPageSummary[] {
  return getMdxPages()
}

/** Every pre-rendered route, including the legacy Notion id aliases. */
export function getLocalPaths(): string[] {
  return getMdxPaths()
}

/** Renders one page. Omit the identifier to get the `type: home` page. */
export function getLocalPage(
  identifier?: string
): Promise<LocalPageContent | null> {
  return getMdxPage(identifier)
}
