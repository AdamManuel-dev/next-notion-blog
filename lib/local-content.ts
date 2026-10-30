/**
 * TypeScript facade over the build-time MDX pipeline.
 *
 * Pages and tests import from here; the implementation lives in
 * `lib/mdx-content.mjs` so the sitemap script can share it without a
 * TypeScript loader. Everything here runs at build time only.
 */

import {
  getLocalPage as getMdxPage,
  getLocalPages as getMdxPages,
  getLocalPaths as getMdxPaths
} from './mdx-content.mjs'

import type { LocalPageContent, LocalPageSummary } from './mdx-content.mjs'

export type {
  LocalPageContent,
  LocalPageSummary,
  LocalPageType
} from './mdx-content.mjs'

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
