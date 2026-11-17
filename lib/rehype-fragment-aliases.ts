import { createFragmentSlugger } from './fragment-slugs.ts'
import type { Nodes, Root } from 'hast'
import type {
  MdxJsxFlowElementHast as HastMdxJsxFlowElement,
  MdxJsxTextElementHast as HastMdxJsxTextElement,
  MdxJsxAttribute
} from 'mdast-util-mdx-jsx'
import type { Plugin } from 'unified'

// AST adapter: MDX JSX survives the Markdown-to-HAST boundary until compilation.
type JsxNode = HastMdxJsxFlowElement | HastMdxJsxTextElement
type FragmentNode = Nodes
export type FragmentAliasMapping = Record<string, string[]>
export interface FragmentAliases {
  version: 1
  pages: Record<string, FragmentAliasMapping>
}
export interface FragmentAliasOptions {
  aliases?: FragmentAliasMapping
}

declare module 'vfile' {
  interface DataMap {
    fragmentAliases: Record<string, string>
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const jsx = (node: FragmentNode): node is JsxNode =>
  node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement'
const tag = (node: FragmentNode) =>
  node.type === 'element' ? node.tagName : jsx(node) ? node.name : null
const heading = (node: FragmentNode) => /^h[1-6]$/.test(tag(node) ?? '')
const blocks = new Set([
  'p',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'section',
  'figure',
  'table',
  'hr'
])
const phrasing = new Set([
  'p',
  'a',
  'span',
  'em',
  'strong',
  'code',
  'pre',
  'summary',
  'figcaption',
  'td',
  'th',
  'button',
  'label',
  'b',
  'i',
  'small',
  's',
  'cite',
  'q',
  'dfn',
  'abbr',
  'var',
  'samp',
  'kbd',
  'sub',
  'sup',
  'u',
  'mark',
  'time',
  'legend'
])

function idOf(node: FragmentNode) {
  if (!jsx(node))
    return node.type === 'element' ? node.properties?.id : undefined
  const ids = (node.attributes ?? []).filter(
    (attr): attr is MdxJsxAttribute =>
      attr.type === 'mdxJsxAttribute' && attr.name === 'id'
  )
  if (ids.length > 1)
    throw new Error('Duplicate id attributes on fragment target')
  if (!ids.length) return undefined
  if (typeof ids[0].value !== 'string')
    throw new Error('Fragment id must be a literal string')
  return ids[0].value
}

function setId(node: FragmentNode, id: string) {
  if (jsx(node)) {
    node.attributes ??= []
    node.attributes.push({ type: 'mdxJsxAttribute', name: 'id', value: id })
  } else if (node.type === 'element')
    node.properties = { ...node.properties, id }
}

function textOf(node: FragmentNode): string {
  if (node.type === 'text') return node.value
  if (tag(node) === 'img') {
    const alt =
      node.type === 'element'
        ? node.properties?.alt
        : jsx(node)
        ? node.attributes?.find(
            (attr): attr is MdxJsxAttribute =>
              attr.type === 'mdxJsxAttribute' && attr.name === 'alt'
          )?.value
        : undefined
    return String(alt ?? '')
  }
  return ('children' in node ? node.children : []).map(textOf).join(' ')
}

/** Validate the complete sidecar even when rendering a page without aliases. */
function assertFragmentAliases(data: unknown): asserts data is FragmentAliases {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.pages)) {
    throw new Error(
      'fragment-aliases.json: expected {version: 1, pages: {...}}'
    )
  }
  for (const [pageId, mapping] of Object.entries(data.pages)) {
    if (!/^[0-9a-f]{32}$/.test(pageId) || !isRecord(mapping))
      throw new Error(`fragment-aliases.json: invalid page mapping "${pageId}"`)
    const claimed = new Set(Object.keys(mapping))
    for (const [canonical, aliases] of Object.entries(mapping)) {
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(canonical) ||
        !Array.isArray(aliases)
      )
        throw new Error(
          `fragment-aliases.json: invalid canonical target or aliases "${canonical}"`
        )
      for (const alias of aliases) {
        if (typeof alias !== 'string' || !/^[A-Za-z0-9_-]+$/.test(alias))
          throw new Error(
            `fragment-aliases.json: invalid legacy alias for "${canonical}"`
          )
        if (claimed.has(alias))
          throw new Error(
            `fragment-aliases.json: duplicate, colliding or self alias "${alias}"`
          )
        claimed.add(alias)
      }
    }
  }
}

export function validateFragmentAliases(data: unknown): FragmentAliases {
  assertFragmentAliases(data)
  return data
}

/** Allocate real block targets, then flatten compatibility names without DOM anchors. */
const rehypeFragmentAliases: Plugin<[FragmentAliasOptions?], Root> = function ({
  aliases = {}
} = {}) {
  return function transform(tree, file) {
    const targets = new Map<string, FragmentNode>()
    const candidates: FragmentNode[] = []
    function collect(node: FragmentNode, insideHeadingOrPhrasing = false) {
      const id = idOf(node)
      if (id !== undefined && id !== '') {
        if (typeof id !== 'string' || !id.trim())
          throw new Error('Invalid fragment id')
        if (targets.has(id)) throw new Error(`Duplicate fragment id "${id}"`)
        targets.set(id, node)
      }
      if (
        id === undefined &&
        !insideHeadingOrPhrasing &&
        (heading(node) || blocks.has(tag(node) ?? ''))
      )
        candidates.push(node)
      const suppressChildren =
        insideHeadingOrPhrasing ||
        heading(node) ||
        phrasing.has(tag(node) ?? '')
      if ('children' in node)
        for (const child of node.children) collect(child, suppressChildren)
    }
    collect(tree)
    // Validate direct plugin callers as well as sidecar readers.
    validateFragmentAliases({
      version: 1,
      pages: { ['0'.repeat(32)]: aliases }
    })
    const legacy = Object.values(aliases).flat()
    for (const id of legacy) {
      if (targets.has(id))
        throw new Error(
          `Legacy fragment alias "${id}" collides with an authored id`
        )
    }
    const allocate = createFragmentSlugger([
      'top',
      'main',
      'all-pages',
      'engineering-articles',
      ...targets.keys(),
      ...legacy
    ])
    // Collect and validate all authored targets before allocating generated IDs.
    for (const node of candidates) {
      const name = tag(node)
      const id = allocate(
        textOf(node).trim() || (name === 'hr' ? 'divider' : name)
      )
      setId(node, id)
      targets.set(id, node)
    }
    const result: Record<string, string> = {}
    for (const [canonical, ids] of Object.entries(aliases)) {
      if (!targets.has(canonical))
        throw new Error(`Dangling canonical fragment target "${canonical}"`)
      for (const id of ids)
        Object.defineProperty(result, id, {
          value: canonical,
          enumerable: true
        })
    }
    file.data.fragmentAliases = result
  }
}

export default rehypeFragmentAliases
