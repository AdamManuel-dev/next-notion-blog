import remarkDirective from 'remark-directive'

/** Enable block directives only; a colon in prose keeps Markdown semantics. */
export function remarkBlockDirectives() {
  remarkDirective.call(this)
  const extensions = this.data().micromarkExtensions
  const extension = extensions[extensions.length - 1]
  extensions[extensions.length - 1] = { ...extension, text: {} }
}

/** Render callouts; retired compatibility anchors belong to migration tooling. */
export default function remarkBlockIds() {
  remarkBlockDirectives.call(this)
  return function transform(tree, file) {
    const source = String(file)
    function visit(node) {
      if (node.type.endsWith('Directive')) {
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
        const raw = source.slice(
          node.position.start.offset,
          node.position.end.offset
        )
        const opening = raw.split(/\r?\n/, 1)[0]
        const match = /^:{3,}callout(?:\{#([A-Za-z0-9_-]+)\})?[ \t]*$/.exec(
          opening
        )
        if (!match)
          file.fail(
            'Invalid callout directive: expected :::callout optionally followed by {#id}, with no label; id must contain only letters, digits, _ or -',
            node
          )
        const closing = raw.slice(raw.lastIndexOf('\n') + 1)
        const fence = /^[ \t>]*(:{3,})[ \t]*$/.exec(closing)
        const closingOffset = node.position.end.offset - closing.length
        const lastChild = node.children[node.children.length - 1]
        if (
          !fence ||
          fence[1].length < opening.match(/^:+/)[0].length ||
          (lastChild && lastChild.position.end.offset > closingOffset)
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
      for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
  }
}
