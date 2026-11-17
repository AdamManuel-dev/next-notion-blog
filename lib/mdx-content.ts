/**
 * Filesystem content pipeline: discovers `content/**\/index.mdx`, validates the
 * frontmatter contract, and renders a page's MDX to static HTML.
 *
 * Server-only, build-time only. The MDX lives in this repository and is
 * therefore trusted: `evaluate()` executes it in the Node build process, never
 * in the browser, and no MDX compiler is shipped to the client. The rendered
 * HTML string is handed to the existing article layout unchanged, so the
 * outline, table of contents and reader features keep working.
 *
 * Clean Architecture: filesystem and MDX adapters share one typed content contract.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { evaluate } from '@mdx-js/mdx'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as jsxRuntime from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'
import { parse as parseYaml } from 'yaml'

import { remarkLiveBlocks } from './live-blocks.ts'

import rehypeFragmentAliases, {
  validateFragmentAliases,
  type FragmentAliasMapping
} from './rehype-fragment-aliases.ts'
import remarkBlockIds from './remark-block-ids.ts'
import remarkHeadingIds from './remark-heading-ids.ts'

import type { LiveBlockInstance } from './live-block-types.ts'
import type { Nodes, PhrasingContent, Root as MdastRoot } from 'mdast'
import type { Nodes as HastNodes, Root as HastRoot } from 'hast'
import type { Plugin } from 'unified'
import type {} from 'mdast-util-mdx-jsx'

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
  fragmentAliases: Record<string, string>
  /** Instances reference shared component definitions and carry literal props. */
  liveBlocks: LiveBlockInstance[]
  sourceUrl: string | null
  cover: string | null
  icon: string | null
  coverPosition: number
}

type MdastNodes = Nodes | PhrasingContent

/** Slugs become filesystem-free URL segments, so keep them boring. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// These filenames belong to the Pages Router/static export, not content.
const RESERVED_SLUGS = new Set(['index', '404', '500'])
/** Notion-compatible page id: 32 lowercase hex characters. */
const ID_PATTERN = /^[0-9a-f]{32}$/
const UUID_SHAPE = /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const CONTENT_FILENAME = 'index.mdx'
const DEFAULT_COVER_POSITION = 0.5

function fail(file: string, message: string) {
  return new Error(`${file}: ${message}`)
}

/** Every page keeps a stable id; new pages derive one from their slug. */
function deriveId(slug: string) {
  return createHash('sha256').update(slug).digest('hex').slice(0, 32)
}

function toUuid(id: string) {
  return id.replace(UUID_SHAPE, '$1-$2-$3-$4-$5')
}

function readString(data: Record<string, unknown>, key: string, file: string) {
  const value = data[key]
  if (value === undefined || value === null)
    throw fail(file, `frontmatter "${key}" is required`)
  if (typeof value !== 'string' || !value.trim())
    throw fail(file, `frontmatter "${key}" must be a non-empty string`)
  return value
}

function readOptionalString(
  data: Record<string, unknown>,
  key: string,
  file: string
) {
  const value = data[key]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string')
    throw fail(file, `frontmatter "${key}" must be a non-empty string`)
  return value
}

function readFrontmatter(source: string, file: string) {
  const match = FRONTMATTER.exec(source)
  if (!match) throw fail(file, 'missing YAML frontmatter block')
  let data: unknown
  try {
    data = parseYaml(match[1])
  } catch (error) {
    throw fail(
      file,
      `invalid YAML frontmatter: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw fail(file, 'frontmatter must be a YAML mapping')
  }
  return {
    data: data as Record<string, unknown>,
    body: source.slice(match[0].length)
  }
}

function readEntry(file: string, contentDir: string): LocalPageEntry {
  const { data } = readFrontmatter(fs.readFileSync(file, 'utf8'), file)

  const slug = readString(data, 'slug', file)
  if (!SLUG_PATTERN.test(slug)) {
    throw fail(file, `frontmatter "slug" is not URL safe: ${slug}`)
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw fail(file, `frontmatter "slug" is reserved by static export: ${slug}`)
  }

  const type = readString(data, 'type', file)
  if (type !== 'home' && type !== 'post' && type !== 'note') {
    throw fail(file, `frontmatter "type" must be home, post or note: ${type}`)
  }

  // Migrated pages keep their Notion id; new pages may omit it.
  let id = deriveId(slug)
  if (data.id !== undefined && data.id !== null) {
    if (typeof data.id !== 'string') {
      throw fail(file, 'frontmatter "id" must be a string')
    }
    id = data.id.replaceAll('-', '').toLowerCase()
    if (!ID_PATTERN.test(id)) {
      throw fail(file, `frontmatter "id" must be 32 hex characters: ${data.id}`)
    }
  }

  if (
    !Array.isArray(data.tags) ||
    !data.tags.every(
      (tag): tag is string => typeof tag === 'string' && Boolean(tag)
    )
  ) {
    throw fail(file, 'frontmatter "tags" must be an array of strings')
  }

  if (typeof data.order !== 'number' || !Number.isFinite(data.order)) {
    throw fail(file, 'frontmatter "order" must be a finite number')
  }

  const coverPosition =
    data.coverPosition === undefined || data.coverPosition === null
      ? DEFAULT_COVER_POSITION
      : data.coverPosition
  if (
    typeof coverPosition !== 'number' ||
    !Number.isFinite(coverPosition) ||
    coverPosition < 0 ||
    coverPosition > 1
  ) {
    throw fail(
      file,
      'frontmatter "coverPosition" must be a number between 0 and 1'
    )
  }

  return {
    id,
    slug,
    title: readString(data, 'title', file),
    description: readString(data, 'description', file),
    type,
    tags: [...data.tags],
    order: data.order,
    sourceUrl: readOptionalString(data, 'sourceUrl', file),
    cover: readOptionalString(data, 'cover', file),
    icon: readOptionalString(data, 'icon', file),
    coverPosition,
    file,
    /** Only used in error messages; routes never depend on the location. */
    relativePath: path.relative(contentDir, file)
  }
}

function discover(directory: string, found: string[] = []) {
  let listing
  try {
    listing = fs.readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    if (isMissingFile(error)) {
      throw new Error(`Content directory not found: ${directory}`)
    }
    throw error
  }
  for (const item of listing.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const target = path.join(directory, item.name)
    if (item.isDirectory()) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue
      discover(target, found)
    } else if (item.name === CONTENT_FILENAME) {
      found.push(target)
    }
  }
  return found
}

/** Legacy URLs: the bare id, its dashed uuid form, and `slug-id`. */
function aliasesOf(page: LocalPageSummary) {
  return [page.id, toUuid(page.id), `${page.slug}-${page.id}`]
}

/**
 * Reads and validates the whole content tree.
 *
 * Nothing is cached: discovery is cheap, and a module-global cache would serve
 * stale HTML after a content edit during `next dev`.
 */
export function readContentIndex({
  root = process.cwd(),
  contentDir = 'content'
}: ContentOptions = {}): ContentIndex {
  const directory = path.resolve(root, contentDir)
  const pages = discover(directory).map((file) => readEntry(file, directory))

  const homePages = pages.filter((page) => page.type === 'home')
  if (homePages.length !== 1) {
    throw new Error(
      `Expected exactly one page with type "home" in ${directory}, found ${
        homePages.length
      }${
        homePages.length
          ? `: ${homePages.map((p) => p.relativePath).join(', ')}`
          : ''
      }`
    )
  }
  const home = homePages[0]

  // Order first, slug as the tie-breaker, so builds are deterministic.
  pages.sort(
    (a, b) =>
      a.order - b.order || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
  )

  const aliases = new Map<string, LocalPageEntry>()
  const claim = (alias: string, page: LocalPageEntry) => {
    const owner = aliases.get(alias)
    if (owner) {
      throw new Error(
        `Duplicate route "${alias}" claimed by ${owner.relativePath} and ${page.relativePath}`
      )
    }
    aliases.set(alias, page)
  }
  for (const page of pages) {
    claim(page.slug, page)
    for (const alias of aliasesOf(page)) claim(alias, page)
  }

  return { contentDir: directory, pages, home, aliases }
}

function toSummary({
  id,
  slug,
  title,
  description,
  type,
  tags,
  order
}: LocalPageEntry): LocalPageSummary {
  return { id, slug, title, description, type, tags, order }
}

/** Static index shipped with every page: search, related reading, homepage. */
export function getLocalPages(options?: ContentOptions) {
  return readContentIndex(options).pages.map(toSummary)
}

/** Every pre-rendered route. The home page is served at `/`, not at its slug. */
export function getLocalPaths(options?: ContentOptions) {
  const { pages, home } = readContentIndex(options)
  return pages.flatMap((page) =>
    page === home ? aliasesOf(page) : [page.slug, ...aliasesOf(page)]
  )
}

/**
 * Native phrasing containers cannot contain paragraphs; retained HTML list
 * items also need tight inline text. MDX can wrap multiline children in an
 * implicit Markdown paragraph, creating invalid nesting or unwanted margins.
 * Unwrap only that implicit layer: ordinary Markdown containers and explicitly
 * authored HTML paragraphs remain intact.
 */
function normalizeHtmlParagraphs() {
  const inlineHosts = new Set([
    'p',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'em',
    'strong',
    'span',
    'b',
    'i',
    'small',
    's',
    'cite',
    'q',
    'dfn',
    'abbr',
    'code',
    'var',
    'samp',
    'kbd',
    'sub',
    'sup',
    'u',
    'mark',
    'time',
    'label',
    'button',
    'summary',
    'legend'
  ])
  return function transform(tree: MdastRoot) {
    function visit(node: MdastNodes) {
      if (!('children' in node)) return
      if (
        (node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement') &&
        inlineHosts.has(node.name ?? '')
      ) {
        node.children = (node.children as MdastNodes[]).flatMap(
          (child): MdastNodes[] => {
            if (child.type !== 'paragraph') return [child]
            if (child.data?.hProperties?.id) {
              // Phrasing hosts cannot contain <p>; retain its target on a span.
              child.data = { ...child.data, hName: 'span' }
              return [child]
            }
            return [...child.children, { type: 'text', value: '\n' }]
          }
        ) as typeof node.children
      }
      for (const child of node.children as MdastNodes[]) visit(child)
    }
    visit(tree)
  }
}

/** Markdown separates blocks with whitespace-only text nodes; ignore those. */
function isBlank(node: HastNodes) {
  return node.type === 'text' && !node.value.trim()
}

/**
 * Returns the `<img>` a paragraph exists solely to carry, or `null`.
 *
 * Only HAST `element` nodes qualify: authored JSX stays `mdxJsx*Element`, so
 * native `<p>` hosts and native `<img>` tags (including `loading="eager"`)
 * never match. A paragraph mixing the image with text or a link keeps its
 * inline semantics and is left alone.
 */
function standaloneImage(node: HastNodes) {
  if (node.type !== 'element' || node.tagName !== 'p') return null
  // An explicitly addressed paragraph must keep its host and target intact.
  if (node.properties?.id) return null
  const children = node.children.filter((child) => !isBlank(child))
  const [only] = children
  return children.length === 1 &&
    only.type === 'element' &&
    only.tagName === 'img'
    ? only
    : null
}

function isFigure(node: HastNodes) {
  if (node.type === 'element') return node.tagName === 'figure'
  return (
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    node.name === 'figure'
  )
}

/**
 * Lets content write plain `![alt](src "title")` and still get the block
 * figure the migrated pages used to spell out by hand.
 *
 * A paragraph holding nothing but an image becomes that `<figure>`, so the
 * image keeps its own margins instead of inheriting paragraph spacing, and the
 * image opts into lazy loading unless it already declares a strategy. Inside a
 * figure the author already provided the wrapper — and usually a caption — so
 * the paragraph collapses to the bare image rather than nesting a second one.
 */
function liftStandaloneImages() {
  return function transform(tree: HastRoot) {
    visit(tree, false)
  }
  function visit(node: HastNodes, insideFigure: boolean) {
    if (!('children' in node)) return
    const children = node.children
    if (!Array.isArray(children)) return
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index]
      const image = standaloneImage(child)
      if (!image) {
        visit(child, isFigure(child))
        continue
      }
      image.properties = { ...image.properties }
      image.properties.loading ??= 'lazy'
      if (insideFigure) {
        children[index] = image
        continue
      }
      if (child.type !== 'element') continue
      child.tagName = 'figure'
      child.properties = {}
      child.children = [image]
    }
  }
}

/**
 * Renders one MDX file to HTML. The compile happens here, on demand, so only
 * the requested page pays for it and edits are always picked up.
 */
export async function renderMdx(
  file: string,
  aliases: FragmentAliasMapping,
  pageId: string,
  {
    blockIds = remarkBlockIds,
    fragments = rehypeFragmentAliases
  }: {
    blockIds?: Plugin<[], MdastRoot>
    fragments?: typeof rehypeFragmentAliases
  } = {}
) {
  // MDX never sees the YAML block: it is metadata, not document content.
  const source = fs.readFileSync(file, 'utf8')
  const { body } = readFrontmatter(source, file)
  const lineOffset =
    source.slice(0, source.length - body.length).split('\n').length - 1
  let MDXContent
  let fragmentAliases: Record<string, string> = {}
  let liveBlocks: LiveBlockInstance[] = []
  const captureAliases: Plugin<[], HastRoot> = () => (_tree, file) => {
    fragmentAliases = file.data.fragmentAliases ?? {}
    liveBlocks = file.data.liveBlocks ?? []
  }
  try {
    ;({ default: MDXContent } = await evaluate(body, {
      ...jsxRuntime,
      baseUrl: pathToFileURL(file),
      remarkPlugins: [
        remarkGfm,
        [remarkLiveBlocks, { pageId, file, lineOffset }],
        blockIds,
        remarkHeadingIds,
        normalizeHtmlParagraphs
      ],
      rehypePlugins: [
        liftStandaloneImages,
        [fragments, { aliases }],
        captureAliases
      ]
    }))
  } catch (error) {
    throw fail(
      file,
      `failed to compile MDX: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
  try {
    return {
      html: renderToStaticMarkup(createElement(MDXContent)),
      fragmentAliases,
      liveBlocks
    }
  } catch (error) {
    throw fail(
      file,
      `failed to render MDX: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

/** Resolves a route (or the home page when omitted) and renders its HTML. */
export async function getLocalPage(
  identifier?: string,
  options?: ContentOptions
): Promise<LocalPageContent | null> {
  const index = readContentIndex(options)
  const page = identifier ? index.aliases.get(identifier) : index.home
  if (!page) return null
  const aliasFile = path.join(index.contentDir, 'fragment-aliases.json')
  let aliases = {}
  try {
    const data = validateFragmentAliases(
      JSON.parse(fs.readFileSync(aliasFile, 'utf8'))
    )
    aliases = data.pages[page.id] ?? {}
  } catch (error) {
    if (!isMissingFile(error)) {
      throw fail(
        aliasFile,
        `failed to read fragment aliases: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }
  return {
    ...toSummary(page),
    ...(await renderMdx(page.file, aliases, page.id)),
    cover: page.cover,
    icon: page.icon,
    coverPosition: page.coverPosition,
    sourceUrl: page.sourceUrl
  }
}

function isMissingFile(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
