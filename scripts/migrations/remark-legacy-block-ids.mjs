import remarkDirective from 'remark-directive'

/** Enable block directives only; a colon in prose must keep Markdown semantics. */
export function remarkBlockDirectives() {
  remarkDirective.call(this)
  const extensions = this.data().micromarkExtensions
  const extension = extensions[extensions.length - 1]
  extensions[extensions.length - 1] = { ...extension, text: {} }
}

/** Render the two deliberately small block directives without losing content. */
export default function remarkBlockIds() {
  remarkBlockDirectives.call(this)
  return function transform(tree, file) {
    const source = String(file)

    function visit(node) {
      if (node.type.endsWith('Directive')) {
        const anchor = node.name === 'anchor' && node.type === 'leafDirective'
        const callout =
          node.name === 'callout' && node.type === 'containerDirective'
        if (!anchor && !callout) {
          file.fail(
            `Unsupported directive: ${node.name} (${node.type}); use ::anchor{#id} or :::callout{#id}`,
            node
          )
        }

        // Inspect the spelling too: the parser collapses duplicate attributes.
        // Labels are intentionally unsupported, rather than silently discarded.
        const raw = source.slice(
          node.position.start.offset,
          node.position.end.offset
        )
        const opening = raw.split(/\r?\n/, 1)[0]
        const pattern = anchor
          ? /^::anchor(?:\{#([A-Za-z0-9_-]+)\})?[ \t]*$/
          : /^:{3,}callout(?:\{#([A-Za-z0-9_-]+)\})?[ \t]*$/
        const match = pattern.exec(opening)
        if (!match || (anchor && node.children.length)) {
          file.fail(
            `Invalid ${node.name} directive: expected ${
              anchor
                ? '::anchor optionally followed by {#id}, with no label or content'
                : ':::callout optionally followed by {#id}, with no label'
            }; id must contain only letters, digits, _ or -`,
            node
          )
        }

        if (callout) {
          const closing = raw.slice(raw.lastIndexOf('\n') + 1)
          const fence = /^[ \t>]*(:{3,})[ \t]*$/.exec(closing)
          const closingOffset = node.position.end.offset - closing.length
          const lastChild = node.children[node.children.length - 1]
          if (
            !fence ||
            fence[1].length < opening.match(/^:+/)[0].length ||
            (lastChild && lastChild.position.end.offset > closingOffset)
          ) {
            file.fail(
              'Unclosed callout directive: add a matching ::: fence',
              node
            )
          }
        }

        node.data = {
          ...node.data,
          hName: anchor ? 'a' : 'section',
          hProperties: match[1] ? { id: match[1] } : {}
        }
      }
      for (const child of node.children ?? []) visit(child)
    }

    visit(tree)
  }
}
