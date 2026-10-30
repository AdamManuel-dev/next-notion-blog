/** Types for the build-time MDX content pipeline (`lib/mdx-content.mjs`). */

export type LocalPageType = 'home' | 'post' | 'note'

export interface ContentOptions {
  /** Defaults to `process.cwd()`. */
  root?: string
  /** Content directory, relative to `root`. Defaults to `content`. */
  contentDir?: string
}

export interface LocalPageSummary {
  id: string
  slug: string
  title: string
  description: string
  type: LocalPageType
  tags: string[]
  order: number
}

export interface LocalPageEntry extends LocalPageSummary {
  sourceUrl: string | null
  cover: string | null
  icon: string | null
  coverPosition: number
  /** Absolute path of the page's `index.mdx`. */
  file: string
  relativePath: string
}

export interface ContentIndex {
  contentDir: string
  pages: LocalPageEntry[]
  home: LocalPageEntry
  aliases: Map<string, LocalPageEntry>
}

export interface LocalPageContent extends LocalPageSummary {
  html: string
  sourceUrl: string | null
  cover: string | null
  icon: string | null
  coverPosition: number
}

export function readContentIndex(options?: ContentOptions): ContentIndex
export function getLocalPages(options?: ContentOptions): LocalPageSummary[]
export function getLocalPaths(options?: ContentOptions): string[]
export function getLocalPage(
  identifier?: string,
  options?: ContentOptions
): Promise<LocalPageContent | null>
