/** One-time, AST-selected source cleanup; never rewrites code or archives. */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createProcessor } from '@mdx-js/mdx'
import { remarkBlockDirectives } from './remark-legacy-block-ids.mjs'
import remarkGfm from 'remark-gfm'
import remarkHeadingIds from '../../lib/remark-heading-ids.mjs'
import { readContentIndex } from '../../lib/mdx-content.mjs'

const processor = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})
const ID = /^[A-Za-z0-9_-]+$/

function literalId(node) {
  const attributes = node.attributes ?? []
  if (attributes.length !== 1) return null
  const [attribute] = attributes
  return attribute.type === 'mdxJsxAttribute' &&
    attribute.name === 'id' &&
    typeof attribute.value === 'string' &&
    ID.test(attribute.value)
    ? attribute.value
    : null
}

function emptyAnchor(node) {
  if (node.type === 'paragraph' && node.children.length === 1) {
    return emptyAnchor(node.children[0])
  }
  return node.name === 'a' &&
    (node.children ?? []).every(
      (child) => child.type === 'text' && !child.value.trim()
    )
    ? literalId(node)
    : null
}

/** Convert only actual parsed JSX nodes, retaining all surrounding source bytes. */
export function cleanBlockMarkup(source) {
  const header =
    source.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] ?? ''
  const body = source.slice(header.length)
  const tree = processor.parse(body)
  const edits = []
  let anchors = 0
  let paragraphs = 0
  let callouts = 0
  const replace = (start, end, text) => edits.push({ start, end, text })
  function visit(parent) {
    const children = parent.children ?? []
    for (let index = 0; index < children.length; index++) {
      const node = children[index]
      const id = emptyAnchor(node)
      if (id) {
        // Flow directives must occupy their own line. Leave inline HTML alone.
        const start = node.position.start.offset
        const end = node.position.end.offset
        const lineEnd = body.indexOf('\n', end)
        const suffix = body.slice(end, lineEnd === -1 ? body.length : lineEnd)
        const prefix = body.slice(body.lastIndexOf('\n', start - 1) + 1, start)
        if (!/^[\s>\-+*\d.)]*$/.test(prefix) || suffix.trim()) continue
        const next = children[index + 1]
        // Moving to a plain paragraph preserves the exact target without an
        // extra empty element. Keep headings' separate IDs and image lifting.
        const plainParagraph =
          next?.type === 'paragraph' &&
          next.children.every((child) =>
            [
              'text',
              'strong',
              'emphasis',
              'link',
              'inlineCode',
              'delete',
              'break'
            ].includes(child.type)
          ) &&
          !next.children.some((child) => child.type === 'headingId')
        // Restrict removal to unprefixed root blocks: list and quote prefixes
        // belong to their containers and must not disappear with the anchor.
        if (plainParagraph && parent.type === 'root' && !prefix.trim()) {
          replace(start, next.position.start.offset, '')
          replace(
            next.position.end.offset,
            next.position.end.offset,
            ` {#${id}}`
          )
          paragraphs++
        } else {
          replace(start, end, `::anchor{#${id}}`)
        }
        anchors++
        continue
      }
      const sectionId = node.name === 'section' && literalId(node)
      if (sectionId && node.type === 'mdxJsxFlowElement') {
        const start = node.position.start.offset
        const end = node.position.end.offset
        const raw = body.slice(start, end)
        const opening = /^<section\s+id=(?:"[^"]+"|'[^']+')\s*>/.exec(raw)
        const closing = /<\/section\s*>$/.exec(raw)
        if (opening && closing) {
          // Outer fences exceed inner fences, including literal colon lines.
          const longest = Math.max(
            2,
            ...[...raw.matchAll(/(?:^|\n)[ >\t]*(:{3,})/g)].map(
              (match) => match[1].length
            )
          )
          const nestedSections = [...raw.matchAll(/<section\b/g)].length
          const fence = ':'.repeat(longest + nestedSections)
          replace(
            start,
            start + opening[0].length,
            `${fence}callout{#${sectionId}}`
          )
          replace(end - closing[0].length, end, fence)
          callouts++
          visit(node)
          continue
        }
      }
      visit(node)
    }
  }
  visit(tree)
  edits.sort((a, b) => b.start - a.start || b.end - a.end)
  let output = body
  let boundary = body.length
  for (const { start, end, text } of edits) {
    if (end > boundary) throw new Error('Overlapping block-markup edits')
    output = output.slice(0, start) + text + output.slice(end)
    boundary = start
  }
  return { source: header + output, anchors, paragraphs, callouts }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const write = process.argv.includes('--write')
  let files = 0
  let anchors = 0
  let paragraphs = 0
  let callouts = 0
  for (const page of readContentIndex().pages) {
    const before = fs.readFileSync(page.file, 'utf8')
    const result = cleanBlockMarkup(before)
    if (result.source === before) continue
    files++
    anchors += result.anchors
    paragraphs += result.paragraphs
    callouts += result.callouts
    if (write) fs.writeFileSync(page.file, result.source)
  }
  console.log(
    `${
      write ? 'Updated' : 'Would update'
    } ${files} files: ${anchors} anchors (${paragraphs} paragraph IDs), ${callouts} callouts`
  )
}
