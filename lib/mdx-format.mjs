import { createProcessor } from '@mdx-js/mdx'
import prettier from 'prettier'
import remarkGfm from 'remark-gfm'

import { remarkBlockDirectives } from './remark-block-ids.mjs'
import remarkHeadingIds from './remark-heading-ids.mjs'

// Clean Architecture: the source-to-source core parses syntax only; rendering
// and filesystem access stay outside this boundary. Unknown schema stays raw.
const ordinary = new Set([
  'heading',
  'paragraph',
  'blockquote',
  'list',
  'listItem',
  'thematicBreak',
  'table',
  'tableRow',
  'tableCell',
  'text',
  'emphasis',
  'strong',
  'delete',
  'link',
  'linkReference',
  'definition',
  'image',
  'imageReference'
])

function isOrdinary(node) {
  return ordinary.has(node.type) && (node.children ?? []).every(isOrdinary)
}

// Literal whitespace is intentionally significant here, including text, code,
// expressions and IDs. Only parser bookkeeping is excluded from comparison.
function semantics(tree) {
  return JSON.stringify(tree, (key, value) =>
    key === 'position' || key === 'data' ? undefined : value
  )
}

/** Format whole safe Markdown blocks without evaluating or rewriting MDX. */
export function formatMdx(source, { file = '<mdx>' } = {}) {
  const frontmatter =
    /^(?:\uFEFF)?---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/.exec(
      source
    )?.[0] ?? ''
  const body = source.slice(frontmatter.length)
  const processor = createProcessor({
    remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
  })
  let tree
  try {
    // parse(), not run(): register the ID grammar without folding IDs into data.
    tree = processor.parse(body)
  } catch (cause) {
    const line = (cause.line ?? 1) + (frontmatter.match(/\n/g)?.length ?? 0)
    throw new SyntaxError(
      `${file}:${line}:${cause.column ?? 1}: ${cause.reason ?? cause.message}`,
      { cause }
    )
  }
  const expected = semantics(tree)
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  let result = body
  // Reverse order keeps original offsets valid. Never patch container children.
  for (const node of tree.children.toReversed()) {
    if (!isOrdinary(node)) continue
    const start = body.lastIndexOf('\n', node.position.start.offset - 1) + 1
    const nextLine = body.indexOf('\n', node.position.end.offset)
    const end =
      nextLine === -1
        ? body.length
        : nextLine - (body[nextLine - 1] === '\r' ? 1 : 0)
    if (
      !/^[ \t]*$/.test(body.slice(start, node.position.start.offset)) ||
      !/^[ \t]*$/.test(body.slice(node.position.end.offset, end))
    )
      continue
    const block = body.slice(start, end)
    try {
      const formatted = prettier
        .format(block, {
          parser: 'markdown',
          embeddedLanguageFormatting: 'off',
          proseWrap: 'preserve',
          singleQuote: true,
          jsxSingleQuote: true,
          semi: false,
          useTabs: false,
          tabWidth: 2,
          bracketSpacing: true,
          bracketSameLine: false,
          arrowParens: 'always',
          trailingComma: 'none',
          endOfLine: newline === '\r\n' ? 'crlf' : 'lf'
        })
        .replace(/\r?\n$/, '')
      if (formatted === block) continue
      const proposal = result.slice(0, start) + formatted + result.slice(end)
      // Whole-document comparison catches contextual changes (references, list
      // boundaries, setext headings), not just isolated block equivalence.
      if (semantics(processor.parse(proposal)) === expected) result = proposal
    } catch {
      // Valid MDX need not be representable by Prettier's Markdown parser.
    }
  }
  // Only compact whitespace between complete root blocks. Never enter code,
  // JSX, directives, lists or other containers to remove their blank lines.
  const blocks = processor.parse(result).children
  const gaps = []
  if (blocks.length) {
    gaps.push({ start: 0, end: blocks[0].position.start.offset, edge: 'start' })
    for (let index = 1; index < blocks.length; index++)
      gaps.push({
        start: blocks[index - 1].position.end.offset,
        end: blocks[index].position.start.offset
      })
    gaps.push({
      start: blocks.at(-1).position.end.offset,
      end: result.length,
      edge: 'end'
    })
  }
  for (const { start, end, edge } of gaps.toReversed()) {
    const gap = result.slice(start, end)
    if (!/^[ \t\r\n]*$/.test(gap) || !gap.includes('\n')) continue
    const lines = gap.split(/\r?\n/)
    // Keep whitespace attached to the preceding block and indentation before
    // the following block; only whitespace-only separator lines are removed.
    const compact =
      edge === 'start'
        ? (frontmatter ? newline : '') + lines.at(-1)
        : edge === 'end'
        ? lines[0] + newline
        : lines.length > 2
        ? lines[0] + newline + newline + lines.at(-1)
        : gap
    if (gap === compact) continue
    const proposal = result.slice(0, start) + compact + result.slice(end)
    try {
      if (semantics(processor.parse(proposal)) === expected) result = proposal
    } catch {
      // A separator is only redundant if the complete document agrees.
    }
  }
  return frontmatter + result
}
