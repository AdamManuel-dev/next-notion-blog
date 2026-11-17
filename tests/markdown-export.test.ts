import { required } from './helpers.ts'
import type {
  LocalPageSummary,
  LocalPageEntry,
  LocalPageType
} from '../lib/mdx-content.ts'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  generateMarkdownExports,
  renderLlmsTxt,
  renderMarkdownPage
} from '../lib/markdown-export.ts'
import { readContentIndex } from '../lib/mdx-content.ts'

const origin = 'https://example.test'
const page: LocalPageSummary = {
  id: '1234567890abcdef1234567890abcdef',
  tags: [],
  order: 0,
  slug: 'sample',
  type: 'post',
  title: 'Sample title',
  description: 'A useful description.'
}
const render = (source: string, entry = page) =>
  renderMarkdownPage({ source, page: entry, origin })
const fixture = (t: test.TestContext) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-export-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'public'))
  const entry = (
    slug: string,
    type: LocalPageType = 'post',
    body = 'Readable body.'
  ): LocalPageEntry => {
    const file = path.join(root, `${slug}.mdx`)
    fs.writeFileSync(file, `---\ntitle: ignored\n---\n${body}\n`)
    return {
      ...page,
      slug,
      type,
      file,
      relativePath: `${slug}.mdx`,
      sourceUrl: null,
      cover: null,
      icon: null,
      coverPosition: 50
    }
  }
  const run = (pages: LocalPageEntry[]) =>
    generateMarkdownExports({
      root,
      pages,
      origin,
      name: 'Example',
      description: 'Example site.'
    })
  const read = (name: string) =>
    fs.readFileSync(path.join(root, 'public', name), 'utf8')
  return { root, entry, run, read }
}

test('exports metadata and readable body without YAML frontmatter', () => {
  const markdown = render('---\nsecret: hidden\n---\nHello **world**.')
  assert.match(markdown, /^# Sample title\n/)
  assert.match(markdown, /Canonical URL:.*https:\/\/example.test\/sample/)
  assert.match(markdown, /A useful description\./)
  assert.match(markdown, /Hello \*\*world\*\*\./)
  assert.doesNotMatch(markdown, /secret|hidden/)
})

test('home canonical URL is the origin root', () => {
  assert.match(
    render('Home.', { ...page, type: 'home' }),
    /Canonical URL:.*https:\/\/example.test\//
  )
  assert.doesNotMatch(
    render('Home.', { ...page, type: 'home' }),
    /example.test\/sample/
  )
})

test('removes heading and block IDs but preserves literal code', () => {
  const markdown = render(
    '## Heading {#heading}\n\nParagraph {#paragraph}\n\n- {#item} Item\n\n`{#literal}`\n\n```md\n{#fenced}\n```'
  )
  assert.doesNotMatch(markdown, /\{#(?:heading|paragraph|item)\}/)
  assert.match(markdown, /`\{#literal\}`/)
  assert.match(markdown, /\{#fenced\}/)
  assert.match(markdown, /Item/)
})

test('preserves nested callouts as blockquotes', () => {
  const markdown = render(
    '::::callout{#outer}\nOuter **message**.\n\n:::callout\nInner message.\n:::\n::::'
  )
  assert.match(markdown, /> Outer \*\*message\*\*\./)
  assert.match(markdown, /> > Inner message\./)
  assert.doesNotMatch(markdown, /callout|#outer/)
})

test('drops JavaScript imports and expressions without executing them', () => {
  const markdown = render(
    'import missing from "does-not-exist"\n\nexport const value = (() => { throw new Error("never") })()\n\nSafe {(() => { throw new Error("never") })()} text.\n\n{globalThis.__markdownExportExecuted = true}'
  )
  assert.match(markdown, /Safe\s+text\./)
  assert.doesNotMatch(markdown, /does-not-exist|throw|globalThis|export const/)
  assert.equal(Reflect.get(globalThis, '__markdownExportExecuted'), undefined)
})

test('components retain nested content and canonical fallback links', () => {
  const markdown = render(
    '<Panel secret={(() => { throw new Error("never") })()}>\n\n## Nested heading\n\nText **inside** [link](/other).\n\n<Counter />\n\n</Panel>'
  )
  assert.match(markdown, /## Nested heading/)
  assert.match(markdown, /Text \*\*inside\*\*/)
  assert.match(markdown, /Counter component.*https:\/\/example.test\/sample/)
  assert.match(markdown, /Panel component.*https:\/\/example.test\/sample/)
  assert.doesNotMatch(markdown, /throw|secret=/)
})

test('inline components and JSX fragments preserve surrounding prose', () => {
  const markdown = render(
    'Before <Badge>**nested**</Badge> after.\n\n<>\n\nFragment content.\n\n</>'
  )
  assert.match(markdown, /Before \*\*nested\*\*/)
  assert.match(markdown, /Badge component/)
  assert.match(markdown, /after\./)
  assert.match(markdown, /Fragment content\./)
})

test('native JSX details, emphasis, anchors and images have readable Markdown', () => {
  const markdown = render(
    '<details open={true}>\n<summary>Source</summary>\n\n<strong>Important</strong> <a href="/source">reference</a>.\n\n<img src="/images/example.png" alt="Example image" />\n\n</details>'
  )
  assert.match(markdown, /Source/)
  assert.match(markdown, /\*\*Important\*\*/)
  assert.match(markdown, /\[reference\]\(https:\/\/example.test\/source\)/)
  assert.match(
    markdown,
    /!\[Example image\]\(https:\/\/example.test\/images\/example.png\)/
  )
  assert.doesNotMatch(markdown, /details|open=|component/)
})

test('resolves relative, root, fragment, reference and protocol-relative URLs', () => {
  const markdown = render(
    '[relative](./other?q=1#part) [root](/notes) [fragment](#heading) [external](//cdn.test/file)\n\n![image](images/picture.png)\n\n[reference][ref]\n\n[ref]: ../target "Title"'
  )
  for (const url of [
    'https://example.test/other?q=1#part',
    'https://example.test/notes',
    'https://example.test/sample#heading',
    'https://cdn.test/file',
    'https://example.test/images/picture.png',
    'https://example.test/target'
  ])
    assert.ok(markdown.includes(url), url)
  assert.match(markdown, /"Title"/)
})

test('preserves external, mail and telephone links and neutralizes unsafe URLs', () => {
  const markdown = render(
    '[external](https://other.test/path) [mail](mailto:a@example.test) [phone](tel:123) [bad](javascript:alert)\n\n<script>dangerous()</script>'
  )
  assert.match(markdown, /https:\/\/other.test\/path/)
  assert.match(markdown, /mailto:a@example.test/)
  assert.match(markdown, /tel:123/)
  assert.doesNotMatch(markdown, /javascript:|dangerous/)
})

test('preserves fenced code, images, tables, task lists, and strikethrough', () => {
  const markdown = render(
    '```tsx\nconst x = <Counter value={1} />\n```\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n- [x] Done\n- [ ] Pending\n\n~~Old~~\n\n![Alt](/photo.png "Photo")'
  )
  assert.match(markdown, /```tsx\nconst x = <Counter value=\{1\} \/>/)
  assert.match(markdown, /\| Name\s*\| Value/)
  assert.match(markdown, /- \[x\] Done/)
  assert.match(markdown, /~~Old~~/)
  assert.match(
    markdown,
    /!\[Alt\]\(https:\/\/example.test\/photo.png "Photo"\)/
  )
})

test('llms.txt groups deterministically and links absolute Markdown URLs', () => {
  const pages: LocalPageSummary[] = [
    { ...page, type: 'note', slug: 'z-note' },
    { ...page, type: 'home', slug: 'home' },
    { ...page, slug: 'z-post' },
    { ...page, slug: 'a-post' }
  ]
  const options = {
    pages,
    origin,
    name: 'Example',
    description: 'Description.'
  }
  const markdown = renderLlmsTxt(options)
  assert.equal(
    markdown,
    renderLlmsTxt({ ...options, pages: [...pages].reverse() })
  )
  assert.ok(markdown.indexOf('## Home') < markdown.indexOf('## Posts'))
  assert.ok(markdown.indexOf('## Posts') < markdown.indexOf('## Notes'))
  assert.ok(markdown.indexOf('/a-post.md') < markdown.indexOf('/z-post.md'))
  assert.match(markdown, /https:\/\/example.test\/index.md/)
  assert.match(markdown, /https:\/\/example.test\/z-note.md/)
})

test('writes home, pages, llms.txt and private ownership manifest idempotently', (t) => {
  const { root, entry, run, read } = fixture(t)
  const pages = [entry('welcome', 'home'), entry('post'), entry('note', 'note')]
  run(pages)
  const first = read('post.md')
  run(pages)
  assert.equal(read('post.md'), first)
  assert.match(read('index.md'), /Readable body/)
  assert.match(read('note.md'), /Readable body/)
  assert.match(read('llms.txt'), /https:\/\/example.test\/post.md/)
  assert.ok(
    fs.existsSync(path.join(root, '.generated', 'markdown-export.json'))
  )
  assert.equal(
    fs.existsSync(path.join(root, 'public', 'markdown-export.json')),
    false
  )
})

test('removes only stale owned unmodified exports, leaving unrelated assets', (t) => {
  const { root, entry, run, read } = fixture(t)
  const home = entry('home', 'home')
  run([home, entry('old')])
  fs.writeFileSync(
    path.join(root, 'public', 'unrelated.md'),
    'User-owned Markdown'
  )
  fs.writeFileSync(path.join(root, 'public', 'asset.png'), 'Image')
  run([home, entry('new')])
  assert.equal(fs.existsSync(path.join(root, 'public', 'old.md')), false)
  assert.equal(read('unrelated.md'), 'User-owned Markdown')
  assert.equal(read('asset.png'), 'Image')
})

test('retains modified stale exports and refuses active unowned or modified collisions', (t) => {
  const { root, entry, run, read } = fixture(t)
  const home = entry('home', 'home')
  run([home, entry('stale')])
  fs.writeFileSync(path.join(root, 'public', 'stale.md'), 'User edit')
  run([home])
  assert.equal(read('stale.md'), 'User edit')
  assert.throws(() => run([home, entry('stale')]), /Refusing to overwrite/)
  fs.writeFileSync(
    path.join(root, 'public', 'index.md'),
    'Modified active export'
  )
  assert.throws(() => run([home]), /Refusing to overwrite/)
  assert.equal(read('index.md'), 'Modified active export')
})

test('rejects malicious manifests and unsafe or duplicate output slugs', (t) => {
  const { root, entry, run } = fixture(t)
  fs.mkdirSync(path.join(root, '.generated'))
  const manifest = path.join(root, '.generated', 'markdown-export.json')
  fs.writeFileSync(
    manifest,
    JSON.stringify({ version: 1, files: { '../outside.md': 'a'.repeat(64) } })
  )
  assert.throws(
    () => run([entry('valid')]),
    /Invalid Markdown export ownership manifest/
  )
  fs.unlinkSync(manifest)
  const valid = entry('valid')
  assert.throws(
    () => run([{ ...valid, slug: '../outside' }]),
    /Invalid export page/
  )
  assert.throws(() => run([valid, valid]), /Duplicate Markdown export/)
})

test('refuses symlink destinations and does not alter their targets', (t) => {
  const { root, entry, run } = fixture(t)
  const outside = path.join(root, 'outside.md')
  fs.writeFileSync(outside, 'Keep me')
  fs.symlinkSync(outside, path.join(root, 'public', 'post.md'))
  assert.throws(() => run([entry('post')]), /non-regular|unowned/)
  assert.equal(fs.readFileSync(outside, 'utf8'), 'Keep me')
})

test('refuses unowned destinations, symlink directories and manifest files', (t) => {
  const { root, entry, run, read } = fixture(t)
  const post = entry('post')
  fs.writeFileSync(path.join(root, 'public', 'llms.txt'), 'User-owned catalog')
  assert.throws(() => run([post]), /Refusing to overwrite/)
  assert.equal(read('llms.txt'), 'User-owned catalog')
  assert.equal(fs.existsSync(path.join(root, 'public', 'post.md')), false)
  fs.unlinkSync(path.join(root, 'public', 'llms.txt'))
  const outside = path.join(root, 'outside')
  fs.mkdirSync(outside)
  fs.symlinkSync(outside, path.join(root, '.generated'))
  assert.throws(() => run([post]), /Refusing non-directory/)
  fs.unlinkSync(path.join(root, '.generated'))
  fs.mkdirSync(path.join(root, '.generated'))
  const target = path.join(outside, 'manifest.json')
  fs.writeFileSync(target, '{}')
  fs.symlinkSync(target, path.join(root, '.generated', 'markdown-export.json'))
  assert.throws(() => run([post]), /Refusing non-regular/)
  assert.equal(fs.readFileSync(target, 'utf8'), '{}')
})

test('metadata script generates sitemap, robots and Markdown together', (t) => {
  const { root, read } = fixture(t)
  const repository = fileURLToPath(new URL('..', import.meta.url))
  const { pages, home } = readContentIndex({ root: repository })
  const post = required(pages.find((entry) => entry.type === 'post'))
  for (const entry of [home, post]) {
    const directory = path.join(root, 'content', entry.slug)
    fs.mkdirSync(directory, { recursive: true })
    fs.copyFileSync(entry.file, path.join(directory, 'index.mdx'))
  }
  const script = fileURLToPath(
    new URL('../scripts/generate-static-metadata.ts', import.meta.url)
  )
  const result = spawnSync(
    process.execPath,
    ['--import', import.meta.resolve('tsx'), script],
    {
      cwd: root,
      encoding: 'utf8'
    }
  )
  assert.equal(result.status, 0, result.stderr)
  assert.match(read('sitemap.xml'), /<urlset/)
  assert.match(read('robots.txt'), /Sitemap: https:/)
  assert.ok(read('index.md').includes(home.description))
  assert.ok(read(`${post.slug}.md`).includes(post.description))
  assert.ok(read('llms.txt').includes(`/${post.slug}.md`))
})

test('every real content page exports with canonical metadata and no MDX constructs', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const { pages } = readContentIndex({ root })
  assert.ok(pages.length > 20)
  for (const entry of pages) {
    const markdown = renderMarkdownPage({
      source: fs.readFileSync(entry.file, 'utf8'),
      page: entry,
      origin
    })
    assert.ok(markdown.includes(entry.description), entry.slug)
    assert.ok(
      markdown.includes(
        `${origin}${entry.type === 'home' ? '/' : `/${entry.slug}`}`
      ),
      entry.slug
    )
    assert.doesNotMatch(
      markdown,
      /:::callout|<Counter\b|<Diagram\b/,
      entry.slug
    )
  }
})
