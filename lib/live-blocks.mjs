import { createHash } from 'node:crypto'

import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'

import {
  isUnsafeLiveProperty,
  liveComponents,
  matchesLiveProp
} from './live-components.mjs'
import remarkBlockIds from './remark-block-ids.mjs'
import remarkHeadingIds from './remark-heading-ids.mjs'

const ID_PATTERN = /^[a-z][a-z0-9-]{0,79}$/
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/

function hash(code) {
  return createHash('sha256').update(code).digest('hex').slice(0, 12)
}

function fail(file, line, message) {
  return new Error(`${file || '<mdx>'}:${line}: ${message}`)
}

// JSON is data, never executable JavaScript. The reviver validates nested values too.
export function parseLiveLiteral(value) {
  try {
    return JSON.parse(value, (name, literal) => {
      if (
        isUnsafeLiveProperty(name) ||
        (typeof literal === 'number' && !Number.isFinite(literal))
      )
        throw new Error('Unsafe JSON value')
      return literal
    })
  } catch {
    throw new Error(
      'Live props require static finite JSON literals; use double-quoted object keys and strings, without expressions, comments or trailing commas'
    )
  }
}

function registeredProps(node, registration, file, line) {
  const error = (message) => {
    throw fail(file, line, message)
  }
  if (
    node.children?.some((child) => child.type !== 'text' || child.value.trim())
  )
    error(
      `Live component <${node.name}> does not support children; use a self-closing tag`
    )
  const props = Object.create(null)
  const names = new Set()
  let explicitId
  for (const attribute of node.attributes) {
    if (attribute.type !== 'mdxJsxAttribute')
      error('Spread props are not supported in live components')
    const { name } = attribute
    if (names.has(name)) error(`Duplicate live prop: ${name}`)
    names.add(name)
    if (
      ['key', 'ref', 'dangerouslySetInnerHTML'].includes(name) ||
      isUnsafeLiveProperty(name)
    )
      error(`Reserved live prop: ${name}`)
    let value = attribute.value
    if (value === null) value = true
    else if (typeof value !== 'string') {
      try {
        value = parseLiveLiteral(value.value)
      } catch (cause) {
        error(cause.message)
      }
    }
    if (name === 'id') {
      if (typeof value !== 'string' || !ID_PATTERN.test(value))
        error(`Invalid live id: ${String(value)}`)
      explicitId = value
      continue
    }
    const schema = Object.hasOwn(registration.props, name)
      ? registration.props[name]
      : undefined
    if (!schema)
      error(
        `Unknown prop "${name}" for <${
          node.name
        }>; supported props: ${Object.keys(registration.props).join(', ')}`
      )
    if (!matchesLiveProp(value, schema)) {
      error(
        `Invalid prop "${name}" for <${node.name}>; expected ${
          schema.integer
            ? 'an integer'
            : schema.type === 'number'
            ? 'a finite number'
            : `a value of type ${schema.type}`
        }${
          schema.min !== undefined ? ` from ${schema.min} to ${schema.max}` : ''
        }`
      )
    }
    props[name] = value
  }
  return {
    explicitId,
    props
  }
}

// Clean Architecture: shared pure discovery/validation stays separate from filesystem generation.
function discover(tree, { file, lineOffset = 0, source = '' }) {
  const found = []
  const ids = new Set()
  const occurrences = new Map()
  function visit(node) {
    if (node.type === 'code') {
      const tokens = (node.meta || '').trim().split(/\s+/).filter(Boolean)
      if (!tokens.includes('live')) return
      const line = (node.position?.start.line || 1) + lineOffset
      throw fail(
        file,
        line,
        'Executable live fences are no longer supported. Move the interactive example into a registered component and use its tag (for example, <Counter id="counter" />). Remove the live marker for a static code example.'
      )
    }
    if (
      node.type === 'mdxJsxFlowElement' ||
      node.type === 'mdxJsxTextElement'
    ) {
      const line = (node.position?.start.line || 1) + lineOffset
      const registration = Object.hasOwn(liveComponents, node.name)
        ? liveComponents[node.name]
        : undefined
      if (!registration && /^[A-Z]/.test(node.name || '')) {
        throw fail(
          file,
          line,
          `Unknown live component <${
            node.name
          }>; registered components: ${Object.keys(liveComponents).join(', ')}`
        )
      }
      if (registration) {
        if (node.type === 'mdxJsxTextElement')
          throw fail(
            file,
            line,
            `Put <${node.name}> on its own line, separated from paragraphs by blank lines`
          )
        const { props, explicitId } = registeredProps(
          node,
          registration,
          file,
          line
        )
        const originalSource = source.slice(
          node.position.start.offset,
          node.position.end.offset
        )
        if (!originalSource)
          throw fail(
            file,
            line,
            'Original MDX source is required for registered live components'
          )
        const digest = hash(originalSource)
        const occurrence = (occurrences.get(digest) || 0) + 1
        if (explicitId === undefined) occurrences.set(digest, occurrence)
        const id =
          explicitId ??
          `live-${digest}${occurrence > 1 ? `-${occurrence}` : ''}`
        if (ids.has(id)) throw fail(file, line, `Duplicate live id: ${id}`)
        ids.add(id)
        found.push({
          node,
          record: {
            moduleId: node.name,
            props,
            file,
            id,
            lang: 'tsx',
            line,
            source: originalSource
          }
        })
        return
      }
    }
    for (const child of node.children || []) visit(child)
  }
  visit(tree)
  return found
}

export function extractLiveBlocks(fullSource, { pageId, file }) {
  // Keep every frontmatter newline so AST positions still refer to the MDX file.
  const source = fullSource.replace(FRONTMATTER, (match) =>
    match.replace(/[^\r\n]/g, ' ')
  )
  let tree
  try {
    tree = createProcessor({
      remarkPlugins: [remarkGfm, remarkBlockIds, remarkHeadingIds]
    }).parse({ value: source, path: file })
  } catch (error) {
    throw fail(
      file,
      error.line || 1,
      `Invalid MDX: ${error.reason || error.message}`
    )
  }
  return discover(tree, { pageId, file, source }).map(({ record }) => record)
}

function element(name, attributes, children) {
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(attributes).map(([name, value]) => ({
      type: 'mdxJsxAttribute',
      name,
      value
    })),
    children
  }
}

export function remarkLiveBlocks(options) {
  return (tree, file) => {
    const blocks = discover(tree, {
      ...options,
      source: String(file.value || options.source || '')
    })
    file.data.liveBlocks = blocks.map(
      ({ record: { id, moduleId, props } }) => ({
        id,
        moduleId,
        props
      })
    )
    for (const { node, record } of blocks) {
      const original = {
        type: 'code',
        lang: 'jsx',
        meta: null,
        value: record.source,
        position: node.position
      }
      const replacement = element(
        'div',
        {
          id: record.id,
          className: 'live-block',
          'data-live-block': record.id
        },
        [
          element('div', { 'data-live-mount': '' }, []),
          element('p', { 'data-live-fallback': '' }, [
            {
              type: 'text',
              value: 'Interactive example. Enable JavaScript to run it.'
            }
          ]),
          element('details', { 'data-live-source': '' }, [
            element('summary', {}, [{ type: 'text', value: 'View source' }]),
            original
          ])
        ]
      )
      for (const key of Object.keys(node)) delete node[key]
      Object.assign(node, replacement, { position: original.position })
    }
  }
}

export default remarkLiveBlocks
