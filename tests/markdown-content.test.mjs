import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { pageToMarkdown } from '../scripts/generate-markdown.mjs'

const metadata = {
  title: 'A title: "quotes" & punctuation',
  id: 'example',
  slug: 'example',
  sourceUrl: 'https://example.com/source',
  extractedAt: '2026-01-01T00:00:00.000Z',
  cover: null
}

test('Markdown includes safely quoted metadata and a readable page title', () => {
  const markdown = pageToMarkdown(metadata, '<p>Body text.</p>')
  assert.ok(markdown.startsWith('---\n'))
  assert.ok(markdown.includes(`title: ${JSON.stringify(metadata.title)}\n`))
  assert.ok(markdown.includes(`source_url: "${metadata.sourceUrl}"`))
  assert.ok(markdown.includes('# A title: "quotes" & punctuation'))
  assert.ok(markdown.endsWith('Body text.\n'))
})

test('headings, anchors, links, images and emphasis survive conversion', () => {
  const markdown = pageToMarkdown(
    metadata,
    '<section id="block-id"><h2><strong><strong>Heading</strong></strong></h2>' +
      '<p>A <strong><strong>bold</strong></strong> and <em>italic</em> note.</p>' +
      '<p><a href="/other#anchor">Read more</a></p>' +
      '<img src="/content-assets/example.png" alt="Example diagram"></section>'
  )
  assert.ok(markdown.includes('<a id="block-id"></a>\n\n## Heading'))
  assert.ok(markdown.includes('**bold** and *italic*'))
  assert.ok(markdown.includes('[Read more](/other#anchor)'))
  assert.ok(
    markdown.includes('![Example diagram](/content-assets/example.png)')
  )
  assert.ok(!markdown.includes('****'))
})

test('code blocks preserve whitespace and use safe fences for embedded backticks', () => {
  const code = 'const value = `<tag>`;\n\n\n  ```\n  indented\n'
  const escaped = code.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  const markdown = pageToMarkdown(
    metadata,
    `<pre><code>${escaped}</code></pre>`
  )
  assert.ok(markdown.includes('````\n' + code + '````'))
})

test('ordered lists retain starting numbers and nested lists', () => {
  const markdown = pageToMarkdown(
    metadata,
    '<ol start="7"><li>Seventh<ul><li>Nested</li></ul></li><li>Eighth</li></ol>'
  )
  assert.match(markdown, /7\. Seventh\n\s+- Nested/)
  assert.ok(markdown.includes('8. Eighth'))
})

test('tables and disclosure content are retained rather than discarded', () => {
  const table = '<table><tr><td>Cell without a header</td></tr></table>'
  const details =
    '<details open><summary>More</summary><p>Hidden content</p></details>'
  const markdown = pageToMarkdown(metadata, table + details)
  assert.match(markdown, /<table><tbody><tr><td>Cell without a header<\/td>/)
  assert.match(
    markdown,
    /<details open=""><summary>More<\/summary><p>Hidden content<\/p><\/details>/
  )
  const headed = pageToMarkdown(
    metadata,
    '<table><thead><tr><th>Column</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>'
  )
  assert.ok(headed.includes('| Column |'))
  assert.ok(headed.includes('| Value |'))
})

test('every manifest page has an up-to-date Markdown counterpart', () => {
  const { pages } = JSON.parse(fs.readFileSync('content/manifest.json', 'utf8'))
  for (const entry of pages) {
    const filename = `content/pages/${entry.slug}`
    const stored = JSON.parse(fs.readFileSync(`${filename}.json`, 'utf8'))
    const html = fs.readFileSync(`${filename}.html`, 'utf8')
    const actual = fs.readFileSync(`${filename}.md`, 'utf8')
    assert.equal(
      actual,
      pageToMarkdown({ ...stored, ...entry }, html),
      entry.slug
    )
  }
})
