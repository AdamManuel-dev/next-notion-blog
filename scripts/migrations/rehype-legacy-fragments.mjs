/** Frozen historical placeholder binding/allocation; never imported by production. */
import { createFragmentSlugger } from '../../lib/fragment-slugs.mjs'

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const jsx = (node) =>
  node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement'
const tag = (node) =>
  node.type === 'element' ? node.tagName : jsx(node) ? node.name : null
const heading = (node) => /^h[1-6]$/.test(tag(node) ?? '')
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

function idOf(node) {
  if (!jsx(node)) return node.properties?.id
  const ids = (node.attributes ?? []).filter((attr) => attr.name === 'id')
  if (ids.length > 1)
    throw new Error('Duplicate id attributes on fragment target')
  if (!ids.length) return undefined
  if (typeof ids[0].value !== 'string')
    throw new Error('Fragment id must be a literal string')
  return ids[0].value
}

function setId(node, id) {
  if (jsx(node)) {
    node.attributes ??= []
    node.attributes.push({ type: 'mdxJsxAttribute', name: 'id', value: id })
  } else node.properties = { ...node.properties, id }
}

function textOf(node) {
  if (node.type === 'text') return node.value
  if (tag(node) === 'img')
    return (
      node.properties?.alt ??
      node.attributes?.find((attr) => attr.name === 'alt')?.value ??
      ''
    )
  return (node.children ?? []).map(textOf).join(' ')
}

/** Only compatibility placeholders qualify; authored links are never consumed. */
function placeholder(node) {
  if (tag(node) === 'p') {
    if (idOf(node) !== undefined) return false
    const children = (node.children ?? []).filter(
      (child) => child.type !== 'text' || child.value.trim()
    )
    return children.length === 1 && placeholder(children[0])
  }
  if (tag(node) !== 'a') return false
  const attributes = jsx(node)
    ? (node.attributes ?? []).map((attr) => attr.name)
    : Object.keys(node.properties ?? {})
  return (
    attributes.every((name) => name === 'id') &&
    (node.children ?? []).every(
      (child) => child.type === 'text' && !child.value.trim()
    )
  )
}

function placeholderId(node) {
  return tag(node) === 'p'
    ? placeholderId(node.children.find(placeholder))
    : idOf(node)
}

/** Validate the complete sidecar even when rendering a page without aliases. */
export function validateFragmentAliases(data) {
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
  return data
}

/** Allocate real block targets, then flatten compatibility names without DOM anchors. */
export default function rehypeFragmentAliases({ aliases = {} } = {}) {
  return function transform(tree, file) {
    const targets = new Map()
    const placeholders = new Map()
    const entries = []
    function collect(node, ancestors = []) {
      if (placeholder(node)) {
        const id = placeholderId(node)
        if (id) {
          if (targets.has(id) || placeholders.has(id))
            throw new Error(`Duplicate fragment id "${id}"`)
          placeholders.set(id, node)
        }
        return
      }
      const id = idOf(node)
      if (id !== undefined && id !== '') {
        if (typeof id !== 'string' || !id.trim())
          throw new Error('Invalid fragment id')
        if (targets.has(id) || placeholders.has(id))
          throw new Error(`Duplicate fragment id "${id}"`)
        targets.set(id, node)
      }
      entries.push({ node, ancestors })
      for (const child of node.children ?? [])
        collect(child, [...ancestors, node])
    }
    collect(tree)
    const legacy = Object.values(aliases).flat()
    for (const id of legacy) {
      if (targets.has(id) || placeholders.has(id))
        throw new Error(
          `Legacy fragment alias "${id}" collides with an authored id`
        )
    }
    const generated = entries.filter(
      ({ node, ancestors }) =>
        idOf(node) === undefined &&
        (heading(node) || blocks.has(tag(node))) &&
        !ancestors.some(
          (parent) => heading(parent) || phrasing.has(tag(parent))
        )
    )
    const authored = new Map(targets)
    const bindings = new Map()
    const addressable = new Set([
      ...targets.values(),
      ...generated.map(({ node }) => node)
    ])
    const addressed = (candidate) => {
      if (!candidate || placeholder(candidate)) return null
      if (addressable.has(candidate)) return candidate
      return (candidate.children ?? []).map(addressed).find(Boolean)
    }
    function bind(parent) {
      const children = parent.children ?? []
      for (let index = 0; index < children.length; index++) {
        const node = children[index]
        if (!placeholder(node)) {
          bind(node)
          continue
        }
        const neighbor =
          children.slice(index + 1).find((child) => addressed(child)) ??
          children
            .slice(0, index)
            .reverse()
            .find((child) => addressed(child))
        const target =
          addressed(neighbor) ?? (addressable.has(parent) ? parent : null)
        if (!target)
          throw new Error(
            `Cannot attach fragment placeholder "${
              placeholderId(node) ?? ''
            }" to an actual block`
          )
        bindings.set(node, target)
      }
    }
    bind(tree)
    // A placeholder matching its own generated target needs no redirect. Other
    // placeholder names become reserved aliases. Repeat until allocation and
    // reservations agree, so removing the placeholders cannot change IDs.
    const reserved = new Set([
      'top',
      'main',
      'all-pages',
      'engineering-articles',
      ...authored.keys(),
      ...legacy
    ])
    let changed
    do {
      const allocate = createFragmentSlugger(reserved)
      targets.clear()
      for (const [id, node] of authored) targets.set(id, node)
      for (const { node } of generated) {
        if (jsx(node))
          node.attributes = (node.attributes ?? []).filter(
            (attr) => attr.name !== 'id'
          )
        const name = tag(node)
        const id = allocate(
          textOf(node).trim() || (name === 'hr' ? 'divider' : name)
        )
        setId(node, id)
        targets.set(id, node)
      }
      changed = false
      for (const [node, target] of bindings) {
        const id = placeholderId(node)
        if (id && id !== idOf(target) && !reserved.has(id)) {
          reserved.add(id)
          changed = true
        }
      }
    } while (changed)
    const redirects = new Map()
    function consume(parent) {
      const children = parent.children
      if (!children) return
      for (let index = 0; index < children.length; index++) {
        const node = children[index]
        if (!placeholder(node)) {
          consume(node)
          continue
        }
        const canonical = idOf(bindings.get(node))
        if (!canonical || !targets.has(canonical))
          throw new Error(
            `Cannot attach fragment placeholder "${
              placeholderId(node) ?? ''
            }" to an actual block`
          )
        const id = placeholderId(node)
        if (id && id !== canonical) redirects.set(id, canonical)
      }
      parent.children = children.filter((child) => !placeholder(child))
    }
    consume(tree)
    for (const [canonical, ids] of Object.entries(aliases)) {
      const destination = redirects.get(canonical) ?? canonical
      if (!targets.has(destination))
        throw new Error(`Dangling canonical fragment target "${canonical}"`)
      for (const id of ids) redirects.set(id, destination)
    }
    const result = {}
    for (const [id, destination] of redirects) {
      if (targets.has(id))
        throw new Error(`Fragment alias "${id}" collides with an actual id`)
      if (!targets.has(destination))
        throw new Error(`Dangling fragment alias "${id}"`)
      Object.defineProperty(result, id, {
        value: destination,
        enumerable: true
      })
    }
    file.data.fragmentAliases = result
  }
}
