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
 * Plain `.mjs` so the sitemap script, the unit tests and the TypeScript facade
 * (`lib/local-content.ts`) all share one implementation.
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

/** Slugs become filesystem-free URL segments, so keep them boring. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// These filenames belong to the Pages Router/static export, not content.
const RESERVED_SLUGS = new Set(['index', '404', '500'])
/** Notion-compatible page id: 32 lowercase hex characters. */
const ID_PATTERN = /^[0-9a-f]{32}$/
const UUID_SHAPE = /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const PAGE_TYPES = new Set(['home', 'post', 'note'])
const CONTENT_FILENAME = 'index.mdx'
const DEFAULT_COVER_POSITION = 0.5

function fail(file, message) {
  return new Error(`${file}: ${message}`)
}

/** Every page keeps a stable id; new pages derive one from their slug. */
function deriveId(slug) {
  return createHash('sha256').update(slug).digest('hex').slice(0, 32)
}

function toUuid(id) {
  return id.replace(UUID_SHAPE, '$1-$2-$3-$4-$5')
}

function readString(data, key, file, { required = true } = {}) {
  const value = data[key]
  if (value === undefined || value === null) {
    if (required) throw fail(file, `frontmatter "${key}" is required`)
    return null
  }
  if (typeof value !== 'string' || (required && !value.trim())) {
    throw fail(file, `frontmatter "${key}" must be a non-empty string`)
  }
  return value
}

function readFrontmatter(source, file) {
  const match = FRONTMATTER.exec(source)
  if (!match) throw fail(file, 'missing YAML frontmatter block')
  let data
  try {
    data = parseYaml(match[1])
  } catch (error) {
    throw fail(file, `invalid YAML frontmatter: ${error.message}`)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw fail(file, 'frontmatter must be a YAML mapping')
  }
  return { data, body: source.slice(match[0].length) }
}

function readEntry(file, contentDir) {
  const { data } = readFrontmatter(fs.readFileSync(file, 'utf8'), file)

  const slug = readString(data, 'slug', file)
  if (!SLUG_PATTERN.test(slug)) {
    throw fail(file, `frontmatter "slug" is not URL safe: ${slug}`)
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw fail(file, `frontmatter "slug" is reserved by static export: ${slug}`)
  }

  const type = readString(data, 'type', file)
  if (!PAGE_TYPES.has(type)) {
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
    data.tags.some((tag) => !tag || typeof tag !== 'string')
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
    sourceUrl: readString(data, 'sourceUrl', file, { required: false }),
    cover: readString(data, 'cover', file, { required: false }),
    icon: readString(data, 'icon', file, { required: false }),
    coverPosition,
    file,
    /** Only used in error messages; routes never depend on the location. */
    relativePath: path.relative(contentDir, file)
  }
}

function discover(directory, found = []) {
  let listing
  try {
    listing = fs.readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') {
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
function aliasesOf(page) {
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
} = {}) {
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

  const aliases = new Map()
  const claim = (alias, page) => {
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

const SUMMARY_KEYS = [
  'id',
  'slug',
  'title',
  'description',
  'type',
  'tags',
  'order'
]

function toSummary(page) {
  return Object.fromEntries(SUMMARY_KEYS.map((key) => [key, page[key]]))
}

/** Static index shipped with every page: search, related reading, homepage. */
export function getLocalPages(options) {
  return readContentIndex(options).pages.map(toSummary)
}

/** Every pre-rendered route. The home page is served at `/`, not at its slug. */
export function getLocalPaths(options) {
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
  return function transform(tree) {
    function visit(node) {
      if (!Array.isArray(node.children)) return
      if (
        (node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement') &&
        inlineHosts.has(node.name)
      ) {
        node.children = node.children.flatMap((child) =>
          child.type === 'paragraph'
            ? [...child.children, { type: 'text', value: '\n' }]
            : [child]
        )
      }
      for (const child of node.children) visit(child)
    }
    visit(tree)
  }
}

/**
 * Renders one MDX file to HTML. The compile happens here, on demand, so only
 * the requested page pays for it and edits are always picked up.
 */
async function renderMdx(file) {
  // MDX never sees the YAML block: it is metadata, not document content.
  const { body } = readFrontmatter(fs.readFileSync(file, 'utf8'), file)
  let MDXContent
  try {
    ;({ default: MDXContent } = await evaluate(body, {
      ...jsxRuntime,
      baseUrl: pathToFileURL(file),
      remarkPlugins: [remarkGfm, normalizeHtmlParagraphs]
    }))
  } catch (error) {
    throw fail(file, `failed to compile MDX: ${error.message}`)
  }
  try {
    return renderToStaticMarkup(createElement(MDXContent))
  } catch (error) {
    throw fail(file, `failed to render MDX: ${error.message}`)
  }
}

/** Resolves a route (or the home page when omitted) and renders its HTML. */
export async function getLocalPage(identifier, options) {
  const index = readContentIndex(options)
  const page = identifier ? index.aliases.get(identifier) : index.home
  if (!page) return null
  return {
    ...toSummary(page),
    html: await renderMdx(page.file),
    cover: page.cover,
    icon: page.icon,
    coverPosition: page.coverPosition,
    sourceUrl: page.sourceUrl
  }
}
