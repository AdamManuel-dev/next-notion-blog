import type {} from 'remark-parse'
import type { Nodes, Root } from 'mdast'
import type {} from 'mdast-util-directive'
import type { Plugin } from 'unified'

import remarkDirective from 'remark-directive'

/** Enable block directives only; a colon in prose keeps Markdown semantics. */
export const remarkBlockDirectives: Plugin<[], Root> = function () {
  remarkDirective.call(this)
  const extensions = this.data().micromarkExtensions
  if (!extensions?.length) return
  const extension = extensions[extensions.length - 1]
  extensions[extensions.length - 1] = { ...extension, text: {} }
}

/** Render callouts; old fragments resolve through aliases on real blocks. */
const remarkBlockIds: Plugin<[], Root> = function () {
  remarkBlockDirectives.call(this)
  return function transform(tree, file) {
    const source = String(file)
    function visit(node: Nodes) {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (node.name === 'anchor')
          file.fail(
            'Retired anchor directive: migrate to a block ID and fragment aliases',
            node
          )
        if (node.name !== 'callout' || node.type !== 'containerDirective')
          file.fail(
            `Unsupported directive: ${node.name} (${node.type}); use :::callout{#id}`,
            node
          )
        // Inspect spelling: the parser collapses duplicate attributes.
        const position = node.position
        if (
          !position ||
          position.start.offset === undefined ||
          position.end.offset === undefined
        )
          return file.fail('Callout directive requires source positions', node)
        const raw = source.slice(position.start.offset, position.end.offset)
        const opening = raw.split(/\r?\n/, 1)[0]
        const match = /^:{3,}callout(?:\{#([A-Za-z0-9_-]+)\})?[ \t]*$/.exec(
          opening
        )
        if (!match)
          return file.fail(
            'Invalid callout directive: expected :::callout optionally followed by {#id}, with no label; id must contain only letters, digits, _ or -',
            node
          )
        const closing = raw.slice(raw.lastIndexOf('\n') + 1)
        const fence = /^[ \t>]*(:{3,})[ \t]*$/.exec(closing)
        const closingOffset = position.end.offset - closing.length
        const lastChild = node.children[node.children.length - 1]
        if (
          !fence ||
          fence[1].length < (opening.match(/^:+/)?.[0].length ?? 0) ||
          (lastChild && (lastChild.position?.end.offset ?? 0) > closingOffset)
        )
          file.fail(
            'Unclosed callout directive: add a matching ::: fence',
            node
          )
        node.data = {
          ...node.data,
          hName: 'section',
          hProperties: match[1] ? { id: match[1] } : {}
        }
      }
      if ('children' in node) for (const child of node.children) visit(child)
    }
    visit(tree)
  }
}

export default remarkBlockIds
