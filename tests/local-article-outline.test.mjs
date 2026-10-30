import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareLocalArticle } from '../lib/local-article-outline.ts'

test('local outline leaves non-heading markup unchanged and hides short outlines', () => {
  const html = '<p>Hello <strong>world</strong>.</p>'
  assert.deepEqual(prepareLocalArticle(html), { html, entries: [] })
  const short = prepareLocalArticle('<h2>One</h2><h3>Two</h3>')
  assert.deepEqual(short.entries, [])
  assert.ok(short.html.includes('id="local-heading-1"'))
})

test('local outline adds deterministic anchors without altering article body text', () => {
  const result = prepareLocalArticle(
    '<h2>One</h2><p>Body</p><h3>Two</h3><h2>Three</h2>'
  )
  assert.deepEqual(
    result.entries.map(({ id, href, text, indentLevel }) => [
      id,
      href,
      text,
      indentLevel
    ]),
    [
      ['local-heading-1', '#local-heading-1', 'One', 0],
      ['local-heading-2', '#local-heading-2', 'Two', 1],
      ['local-heading-3', '#local-heading-3', 'Three', 0]
    ]
  )
  assert.equal(
    result.html,
    '<h2 id="local-heading-1">One</h2><p>Body</p><h3 id="local-heading-2">Two</h3><h2 id="local-heading-3">Three</h2>'
  )
  assert.deepEqual(prepareLocalArticle(result.html), result)
})

test('local outline preserves existing IDs and avoids IDs already used elsewhere', () => {
  const html =
    '<div id="local-heading-1"></div><h2 id="intro">Intro</h2><h3>Next</h3><h3>Last</h3>'
  const result = prepareLocalArticle(html)
  assert.deepEqual(
    result.entries.map((entry) => entry.href),
    ['#intro', '#local-heading-2', '#local-heading-3']
  )
  assert.ok(result.html.includes('<h2 id="intro">Intro</h2>'))
})

test('data attributes are not mistaken for heading IDs', () => {
  const result = prepareLocalArticle(
    '<h2 data-id="source">One</h2><h2>Two</h2><h2>Three</h2>'
  )
  assert.ok(result.html.includes('<h2 data-id="source" id="local-heading-1">'))
  assert.equal(result.entries[0].href, '#local-heading-1')
})

test('local outline extracts readable rich-text labels and skips blank headings', () => {
  const result = prepareLocalArticle(
    '<h2><strong>A &amp; B</strong></h2><h3>&nbsp;</h3><h4>It&#39;s &#x1F680;</h4><h2>Last &lt;item&gt;</h2>'
  )
  assert.deepEqual(
    result.entries.map((entry) => entry.text),
    ['A & B', "It's 🚀", 'Last <item>']
  )
  assert.deepEqual(
    result.entries.map((entry) => entry.indentLevel),
    [0, 1, 0]
  )
  assert.ok(result.html.includes('It&#39;s &#x1F680;'))
})

test('escaped heading examples in code never become outline entries', () => {
  const html =
    '<pre><code>&lt;h2&gt;Example&lt;/h2&gt;</code></pre><h2>One</h2><h2>Two</h2>'
  assert.deepEqual(prepareLocalArticle(html).entries, [])
})
