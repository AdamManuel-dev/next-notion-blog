import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'

import { formatMdx } from '../lib/mdx-format.mjs'
import { readContentIndex, renderMdx } from '../lib/mdx-content.mjs'
import { remarkBlockDirectives } from '../lib/remark-block-ids.mjs'
import remarkHeadingIds from '../lib/remark-heading-ids.mjs'

const parser = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})
const frontmatter = /^(?:\uFEFF)?---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/
const bodyOf = (source) => source.replace(frontmatter, '')
const semanticTree = (source) =>
  JSON.parse(
    JSON.stringify(parser.parse(bodyOf(source)), (key, value) =>
      key === 'position' || key === 'data' ? undefined : value
    )
  )

function protectedBlocks(source) {
  const body = bodyOf(source)
  function protectedNode(node) {
    return (
      /^(?:code|inlineCode|break|headingId|mdx.*)$/.test(node.type) ||
      node.type.endsWith('Directive') ||
      (node.children ?? []).some(protectedNode)
    )
  }
  return parser
    .parse(body)
    .children.filter(protectedNode)
    .map((node) =>
      body.slice(node.position.start.offset, node.position.end.offset)
    )
}

function assertStable(source, formatted) {
  assert.deepEqual(semanticTree(formatted), semanticTree(source))
  assert.deepEqual(protectedBlocks(formatted), protectedBlocks(source))
  assert.equal(formatMdx(formatted), formatted, 'formatting is idempotent')
}

test('ordinary whole blocks receive meaningful Markdown formatting', () => {
  const source = [
    '##   Heading ###',
    '',
    '* one',
    '* two',
    '',
    '| A|B|',
    '|-|-|',
    '|x|y|',
    '',
    'An *emphasis* and [link](<https://example.com>).',
    ''
  ].join('\n')

  const formatted = formatMdx(source)

  assert.match(formatted, /^## Heading\n\n- one\n- two\n/)
  assert.match(formatted, /\| A {3}\| B {3}\|\n\| --- \| --- \|/)
  assert.match(
    formatted,
    /An _emphasis_ and \[link\]\(https:\/\/example.com\)\./
  )
  assertStable(source, formatted)
})

test('frontmatter and newline style stay raw while redundant separators collapse', () => {
  for (const newline of ['\n', '\r\n']) {
    for (const ending of ['', newline]) {
      const header =
        '\uFEFF---\n# untouched\ntitle: "Quoted"  \nextra: [a,b]\n--- \t\n'.replaceAll(
          '\n',
          newline
        )
      const gap = `${newline} \t${newline}${newline}${newline}`
      const source = `${header}${gap}##   Title ###${gap}* one${ending}`

      const formatted = formatMdx(source)

      assert.equal(
        formatted,
        `${header}${newline}## Title${newline}${newline}- one${ending}`
      )
      assertStable(source, formatted)
    }
  }
})

test('ordinary trailing spaces and surplus document-edge blank lines are removed', () => {
  for (const newline of ['\n', '\r\n']) {
    const source =
      '\n \t\n\n##   One ### \n \t\n\n\nParagraph. \n\n\t\n\n## Three\n \t\n\n'.replaceAll(
        '\n',
        newline
      )
    const formatted = formatMdx(source)
    assert.equal(
      formatted,
      '## One\n\nParagraph.\n\n## Three\n'.replaceAll('\n', newline)
    )
    assertStable(source, formatted)
  }
})

test('compaction never removes whitespace inside protected blocks or hard breaks', () => {
  const blocks = [
    '## Pinned {#pinned}',
    '```text\nfirst  \n\n\nlast\n```  ',
    '<Counter\n  id="example"\n  initialCount={3}\n/>',
    ':::callout{#callout}\n\n\nInside.  \n\n\n:::',
    'First    \nsecond.',
    '- Example\n\n  ```text\n  first\n\n\n  last  \n  ```'
  ]
  for (const newline of ['\n', '\r\n']) {
    const source = (
      '\n\n' +
      blocks.join('\n \t\n\n\n') +
      '\n\n \t\n'
    ).replaceAll('\n', newline)
    const formatted = formatMdx(source)
    assert.equal(
      formatted,
      (blocks.join('\n\n') + '\n').replaceAll('\n', newline)
    )
    assertStable(source, formatted)
  }
})

test('separator compaction retains list tightness and contextual Markdown boundaries', () => {
  for (const source of [
    '- First\n\n\n- Second\n',
    '1. First\n\n\n2. Second\n',
    'Paragraph\n\n\n---\n\n\nTail\n',
    '> Quoted\n>\n>\n> Still quoted\n\n\nOutside\n',
    '<section>\n\n\nInner text\n\n\n</section>\n\n\nOutside\n',
    'A paragraph.  \n\n\nAnother paragraph.\n'
  ])
    assertStable(source, formatMdx(source))
})

test('empty frontmatter is also preserved verbatim', () => {
  const source = '---\n--- \t\n\n##   Title ###\n'

  const formatted = formatMdx(source)

  assert.equal(formatted, '---\n--- \t\n\n## Title\n')
  assertStable(source, formatted)
})

test('fences, JSON JSX props, expressions, ESM and complete complex containers stay byte-exact', () => {
  const protectedSources = [
    '  ````json example  \n  {"key": "value"}  \n    indented\t\n  ````  ',
    '~~~js\nconst value = "unchanged";  \n~~~',
    '> Before *emphasis*\n>\n>   ```js\n>   const x = "a";  \n>   ```\n>\n> * unformatted list',
    '* item\n\n  ```json\n  {"key": "value"}  \n  ```\n\n* second',
    '<Widget\n  options={{"label": "strict JSON", "items": [1, 2]}}\n  title="double quotes"\n/>',
    '<section>\n\n##   Inside ###\n\n* raw\n\n</section>',
    'Inline <span title="raw">*text*</span> and {1 + 2}.',
    '{globalThis.__mdxFormatterMustNotRun = true}',
    'export const value = (() => { throw new Error("must not run") })()'
  ]
  for (const newline of ['\n', '\r\n']) {
    for (const protectedSource of protectedSources) {
      const source =
        `##   Outside ###\n\n${protectedSource}\n\n##   Tail ###\n`.replaceAll(
          '\n',
          newline
        )

      const formatted = formatMdx(source)

      assert.equal(
        formatted,
        `## Outside\n\n${protectedSource}\n\n## Tail\n`.replaceAll(
          '\n',
          newline
        )
      )
      assertStable(source, formatted)
    }
  }
  assert.equal(globalThis.__mdxFormatterMustNotRun, undefined)
})

test('nested custom callouts and directive fences are never formatted or transformed', () => {
  const callouts = [
    '::::callout{#outer}',
    '##   Raw heading ###',
    '',
    '> :::callout{#quoted}',
    '> Quoted. {#quote}',
    '> :::',
    '',
    '- :::callout{#listed}',
    '  Listed. {#list}',
    '  :::',
    '',
    ':::callout{#inner}',
    '* raw',
    ':::   ',
    '::::'
  ].join('\n')
  const source = `##   Outside ###\n\n${callouts}\n`

  const formatted = formatMdx(source)

  assert.equal(formatted, `## Outside\n\n${callouts}\n`)
  assertStable(source, formatted)
  // Syntax only: even directives rejected by the renderer remain source data.
  assert.equal(
    formatMdx(':::unknown{#id}\n* raw\n:::\n'),
    ':::unknown{#id}\n* raw\n:::\n'
  )
})

test('IDs, literal code, hard-break bytes and whitespace-sensitive prose stay intact', () => {
  for (const protectedSource of [
    '##   Addressed ### {#Stable_ID-42}',
    'A *paragraph*. {#paragraph}',
    '* Addressed. {#item}\n* raw',
    'A {#middle} marker.',
    'Inline `const value = "raw";`.',
    'First    \nsecond.',
    'First\\\nsecond.',
    '> First   \n> second.\n>\n> * raw',
    'Literal\u00a0space and  repeated spaces.'
  ]) {
    const source = `##   Outside ###\n\n${protectedSource}\n`

    const formatted = formatMdx(source)

    assert.equal(formatted, `## Outside\n\n${protectedSource}\n`)
    assertStable(source, formatted)
  }
})

test('contextual semantics retain list starts, tightness, references and escaped MDX', () => {
  for (const source of [
    '7) seven\n8) eight\n',
    '* loose\n\n* list\n',
    '[Label]: https://example.com "Title"\n\nA [reference][Label].\n',
    '##   Escaped \\{#literal} ###\n',
    '##   Heading ###\n\nProse  with   spaces.\n',
    'Paragraph\n---\n\n* one\n\nTail.',
    '',
    '\n\n'
  ]) {
    const formatted = formatMdx(source)

    assertStable(source, formatted)
  }
  assert.match(formatMdx('7) seven\n8) eight\n'), /^7\. seven/)
})

test('compact invisible comments preserve separate Markdown containers', () => {
  const source =
    '- First\n\n{/* */}\n\n- Second\n\n{/* */}\n\n> First quote\n\n{/* */}\n\n> Second quote\n'
  const formatted = formatMdx(source)
  assert.equal(formatted, source)
  const tree = parser.parse(formatted)
  assert.equal(tree.children.filter((node) => node.type === 'list').length, 2)
  assert.equal(
    tree.children.filter((node) => node.type === 'blockquote').length,
    2
  )
  assertStable(source, formatted)
})

test('parse errors report the supplied file and original frontmatter-adjusted location', () => {
  const source = '---\ntitle: Raw\n---\n\n<Broken value={}>\n'

  assert.throws(
    () => formatMdx(source, { file: 'content/broken/index.mdx' }),
    (error) => {
      assert.ok(error instanceof SyntaxError)
      assert.match(error.message, /^content\/broken\/index\.mdx:5:\d+:/)
      assert.ok(error.cause)
      return true
    }
  )
})

test('the entire real content tree preserves source examples and compiled rendering without content edits', async (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'mdx-format-'))
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }))
  const { pages, contentDir } = readContentIndex()
  const aliasesByPage = JSON.parse(
    fs.readFileSync(path.join(contentDir, 'fragment-aliases.json'), 'utf8')
  ).pages
  assert.ok(pages.length > 0)
  for (const [index, page] of pages.entries()) {
    const source = fs.readFileSync(page.file, 'utf8')
    const formatted = formatMdx(source, { file: page.file })
    assertStable(source, formatted)
    assert.equal(
      frontmatter.exec(formatted)?.[0],
      frontmatter.exec(source)?.[0]
    )
    const temporaryFile = path.join(temporary, `${index}.mdx`)
    fs.writeFileSync(temporaryFile, formatted)

    const aliases = aliasesByPage[page.id] ?? {}
    const before = await renderMdx(page.file, aliases, page.id)
    const after = await renderMdx(temporaryFile, aliases, page.id)

    assert.deepEqual(after, before, page.relativePath)
    assert.equal(
      fs.readFileSync(page.file, 'utf8'),
      source,
      'content was not edited'
    )
  }
})
