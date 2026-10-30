import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { publishDrafts, renderDraft } from '../scripts/publish-drafts.mjs'
import { getLocalPage, getLocalPages } from '../lib/local-content.ts'

const source = (body) =>
  `---\ntitle: Example\ndescription: An example\ntags: [testing]\nstatus: draft\n---\n\n# Example\n\n${body}`

test('draft conversion preserves tables, code and deep-dive anchors without duplicate titles', () => {
  const { html, metadata } = renderDraft(
    source(
      '[Jump](#technical-deep-dive)\n\n## Technical deep dive\n\n```ts\nconst html = "<button>"\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n## Technical deep dive'
    )
  )
  assert.equal(metadata.title, 'Example')
  assert.doesNotMatch(html, /<h1/)
  assert.ok(html.includes('href="#technical-deep-dive"'))
  assert.ok(html.includes('id="technical-deep-dive"'))
  assert.ok(html.includes('id="technical-deep-dive-1"'))
  assert.ok(html.includes('<table>'))
  assert.ok(html.includes('class="language-ts"'))
  assert.ok(html.includes('&lt;button&gt;'))
})

test('publication rejects missing metadata and strips unsafe raw HTML', () => {
  assert.throws(() => renderDraft('No frontmatter'), /frontmatter/)
  assert.throws(() => renderDraft('---\nstatus: draft\n---\nBody'), /title/)
  const { html } = renderDraft(
    source(
      '<script>alert(1)</script>\n\n<a href="javascript:alert(1)" onclick="bad()">Link</a>'
    )
  )
  assert.doesNotMatch(html, /<script|javascript:|onclick=/)
  assert.ok(html.includes('Link'))
})

test('every active draft is published, linked from home and retains its original source', () => {
  const files = fs
    .readdirSync('blog-drafts')
    .filter(
      (name) =>
        name.endsWith('.md') &&
        !['README.md', 'EDITORIAL-NOTES.md'].includes(name)
    )
  const published = getLocalPages().filter(
    (entry) => entry.source === 'blog-draft'
  )
  assert.equal(published.length, files.length)
  const home = getLocalPage().html
  for (const filename of files) {
    const slug = path.basename(filename, '.md')
    const page = getLocalPage(slug)
    const original = fs.readFileSync(`blog-drafts/${filename}`, 'utf8')
    const rendered = renderDraft(original)
    assert.equal(page.html, rendered.html)
    assert.ok(home.includes(`href="/${slug}"`))
    assert.equal(page.title, rendered.metadata.title)
    const metadata = JSON.parse(
      fs.readFileSync(`content/pages/${slug}.json`, 'utf8')
    )
    assert.equal(metadata.sourceFile, `blog-drafts/${filename}`)
    assert.equal(metadata.status, 'published')
    assert.deepEqual(metadata.tags, rendered.metadata.tags)
    assert.ok(fs.existsSync(`content/pages/${slug}.md`))
  }
  assert.equal(getLocalPage('editorial-notes'), null)
  assert.ok(!published.some((entry) => entry.slug.startsWith('archive/')))
})

test('publishing is repeatable and leaves archived/support files excluded', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-drafts-'))
  try {
    fs.mkdirSync(path.join(root, 'content/pages'), { recursive: true })
    fs.mkdirSync(path.join(root, 'blog-drafts/archive'), { recursive: true })
    fs.writeFileSync(
      path.join(root, 'content/manifest.json'),
      JSON.stringify({
        rootId: 'home',
        pages: [{ id: 'home', slug: 'home', title: 'Home' }]
      })
    )
    fs.writeFileSync(
      path.join(root, 'content/pages/home.html'),
      '<p>Original homepage</p>\n'
    )
    fs.writeFileSync(
      path.join(root, 'blog-drafts/README.md'),
      '# Editorial ranking'
    )
    fs.writeFileSync(
      path.join(root, 'blog-drafts/EDITORIAL-NOTES.md'),
      'Do not publish'
    )
    fs.writeFileSync(
      path.join(root, 'blog-drafts/example.md'),
      source('Example body')
    )
    fs.writeFileSync(
      path.join(root, 'blog-drafts/archive/excluded.md'),
      source('Excluded')
    )
    assert.equal(publishDrafts(root), 1)
    const manifest = fs.readFileSync(
      path.join(root, 'content/manifest.json'),
      'utf8'
    )
    const home = fs.readFileSync(
      path.join(root, 'content/pages/home.html'),
      'utf8'
    )
    assert.equal(publishDrafts(root), 1)
    assert.equal(
      fs.readFileSync(path.join(root, 'content/manifest.json'), 'utf8'),
      manifest
    )
    assert.equal(
      fs.readFileSync(path.join(root, 'content/pages/home.html'), 'utf8'),
      home
    )
    assert.ok(home.endsWith('<p>Original homepage</p>\n'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
