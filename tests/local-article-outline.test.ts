import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareLocalArticle } from '../lib/local-article-outline.ts'

test('local outline leaves non-heading markup unchanged and hides short outlines', () => {
  const html = '<p>Hello <strong>world</strong>.</p>'
  assert.deepEqual(prepareLocalArticle(html), { html, entries: [] })
  const short = '<h2 id="one">One</h2><h3 id="two">Two</h3>'
  assert.deepEqual(prepareLocalArticle(short), { html: short, entries: [] })
})

test('local outline reads canonical anchors without changing HTML', () => {
  const html =
    '<h2 id="one">One</h2><p>Body</p><h3 id="two">Two</h3><h2 id="three">Three</h2>'
  const result = prepareLocalArticle(html)
  assert.deepEqual(
    result.entries.map(({ id, href, text, indentLevel }) => [
      id,
      href,
      text,
      indentLevel
    ]),
    [
      ['one', '#one', 'One', 0],
      ['two', '#two', 'Two', 1],
      ['three', '#three', 'Three', 0]
    ]
  )
  assert.equal(result.html, html)
  assert.deepEqual(prepareLocalArticle(result.html), result)
})

test('local outline skips missing and empty IDs without affecting hierarchy', () => {
  const html =
    '<h2>Missing</h2><h2 id="intro">Intro</h2><h3 id="">Empty</h3><h4 id="next">Next</h4><h2 id="last">Last</h2>'
  const result = prepareLocalArticle(html)
  assert.deepEqual(
    result.entries.map(({ href, indentLevel }) => [href, indentLevel]),
    [
      ['#intro', 0],
      ['#next', 1],
      ['#last', 0]
    ]
  )
  assert.equal(result.html, html)
})

test('data attributes are not mistaken for heading IDs or counted toward the minimum', () => {
  const html =
    '<h2 data-id="source">One</h2><h2 id="two">Two</h2><h2 id="three">Three</h2>'
  assert.deepEqual(prepareLocalArticle(html), { html, entries: [] })
})

test('local outline extracts readable rich-text labels and skips blank headings', () => {
  const html =
    '<h2 id="a-b"><strong>A &amp; B</strong></h2><h3 id="blank">&nbsp;</h3><h4 id="rocket">It&#39;s &#x1F680;</h4><h2 id="last-item">Last &lt;item&gt;</h2>'
  const result = prepareLocalArticle(html)
  assert.deepEqual(
    result.entries.map((entry) => entry.text),
    ['A & B', "It's 🚀", 'Last <item>']
  )
  assert.deepEqual(
    result.entries.map((entry) => entry.indentLevel),
    [0, 1, 0]
  )
  assert.equal(result.html, html)
})

test('escaped heading examples in code never become outline entries', () => {
  const html =
    '<pre><code>&lt;h2 id="example"&gt;Example&lt;/h2&gt;</code></pre><h2 id="one">One</h2><h2 id="two">Two</h2>'
  assert.deepEqual(prepareLocalArticle(html), { html, entries: [] })
})
