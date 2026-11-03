import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { test } from 'node:test'
import { load } from 'cheerio'
import {
  getLocalPage,
  getLocalPages,
  getLocalPaths
} from '../../lib/local-content.ts'
import { prepareLocalArticle } from '../../lib/local-article-outline.ts'

const archive = 'legacy/content'
const manifest = JSON.parse(fs.readFileSync(`${archive}/manifest.json`, 'utf8'))
const pages = getLocalPages()
// Compile each canonical document once; alias lookup is checked independently.
const compiled = new Map(
  await Promise.all(
    pages.map(async ({ slug }) => [slug, await getLocalPage(slug)])
  )
)

// Compare actual emphasized code characters, not whether emphasis wraps code
// or sits inside it. Both DOM orders are produced by equivalent Markdown.
function emphasizedInlineCode($) {
  return $('code')
    .filter(
      (_, element) => $(element).parents('pre,h1,h2,h3,h4,h5,h6').length === 0
    )
    .filter(
      (_, element) =>
        $(element).find('strong,b,em,i').length ||
        $(element).parents('strong,b,em,i').length
    )
    .map((_, element) => {
      const runs = []
      function visit(node, bold, italic) {
        if (node.type === 'text') {
          const previous = runs.at(-1)
          if (previous?.bold === bold && previous?.italic === italic)
            previous.text += node.data
          else runs.push({ text: node.data, bold, italic })
          return
        }
        const nextBold = bold || ['strong', 'b'].includes(node.tagName)
        const nextItalic = italic || ['em', 'i'].includes(node.tagName)
        for (const child of node.children ?? [])
          visit(child, nextBold, nextItalic)
      }
      visit(
        element,
        $(element).parents('strong,b').length > 0,
        $(element).parents('em,i').length > 0
      )
      return { text: $(element).text(), runs }
    })
    .get()
}

test('inline-code emphasis comparison preserves character coverage across Markdown nesting', () => {
  const fingerprint = (html) => emphasizedInlineCode(load(html))
  assert.deepEqual(
    fingerprint('<code><strong>value</strong></code>'),
    fingerprint('<strong><code>value</code></strong>')
  )
  assert.deepEqual(
    fingerprint('<code><em>value</em></code>'),
    fingerprint('<em><code>value</code></em>')
  )
  assert.notDeepEqual(
    fingerprint('<code><strong>value</strong></code>'),
    fingerprint('<code>va<strong>lue</strong></code>')
  )
  assert.notDeepEqual(
    fingerprint('<code><strong>value</strong></code>'),
    fingerprint('<code>value</code>')
  )
})

test('all 82 original pages and stable public identifiers survive migration', async () => {
  assert.ok(pages.length >= 82)
  assert.equal(new Set(pages.map((page) => page.slug)).size, pages.length)
  assert.equal(new Set(pages.map((page) => page.id)).size, pages.length)
  assert.equal((await getLocalPage()).id, manifest.rootId)
  const routes = new Set(getLocalPaths())
  assert.equal(routes.size, getLocalPaths().length)
  for (const original of manifest.pages) {
    const page = compiled.get(original.slug)
    assert.equal(page.id, original.id)
    assert.equal(page.title, original.title)
    assert.ok(page.html.trim(), original.slug)
    const uuid = original.id.replace(
      /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/,
      '$1-$2-$3-$4-$5'
    )
    for (const alias of [original.id, uuid, `${original.slug}-${original.id}`])
      assert.ok(routes.has(alias), alias)
    if (original.id !== manifest.rootId) assert.ok(routes.has(original.slug))
  }
  const crawl = JSON.parse(
    fs.readFileSync(`${archive}/notion-source/crawl.json`, 'utf8')
  )
  assert.equal(crawl.pages.length, 52)
  for (const original of manifest.pages.filter(
    (page) => page.source !== 'blog-draft'
  )) {
    const source = JSON.parse(
      gunzipSync(
        fs.readFileSync(`${archive}/notion-source/${original.id}.json.gz`)
      )
    )
    assert.equal(source.id, original.id)
  }
})

test('unknown pages and traversal attempts return null', async () => {
  for (const identifier of [
    'missing',
    '../package.json',
    '/etc/passwd',
    '..'
  ]) {
    assert.equal(await getLocalPage(identifier), null)
  }
})

test('all internal routes, fragments and local images resolve', () => {
  const targets = new Map()
  for (const [slug, page] of compiled) {
    const $ = load(prepareLocalArticle(page.html).html)
    targets.set(
      slug,
      new Set([
        'top',
        'main',
        ...$('[id]')
          .map((_, element) => $(element).attr('id'))
          .get(),
        ...Object.keys(page.fragmentAliases ?? {})
      ])
    )
  }
  const byRoute = new Map()
  for (const page of pages) {
    const uuid = page.id.replace(
      /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/,
      '$1-$2-$3-$4-$5'
    )
    for (const route of [page.slug, page.id, uuid, `${page.slug}-${page.id}`])
      byRoute.set(route, page.slug)
  }
  byRoute.set('', pages.find((page) => page.id === manifest.rootId).slug)
  // These anchors belong to the layout, generated from metadata rather than body MDX.
  targets.get(byRoute.get('')).add('engineering-articles').add('all-pages')
  for (const [slug, page] of compiled) {
    const $ = load(page.html)
    assert.equal($('script, iframe, object, embed, style').length, 0, slug)
    for (const element of $('a[href]').toArray()) {
      const href = $(element).attr('href')
      const url = new URL(href, `https://blog.manuel.dev/${slug}`)
      if (url.origin !== 'https://blog.manuel.dev') continue
      const pathname = decodeURIComponent(url.pathname).replace(
        /^\/+|\/+$/g,
        ''
      )
      if (pathname.startsWith('content-assets/')) {
        assert.ok(
          fs.existsSync(path.join('public', pathname)),
          `${slug}: ${href}`
        )
        continue
      }
      const target = byRoute.get(pathname)
      assert.ok(target, `${slug}: missing route ${href}`)
      if (url.hash)
        assert.ok(
          targets.get(target).has(decodeURIComponent(url.hash.slice(1))),
          `${slug}: missing fragment ${href}`
        )
    }
    const sources = $('img[src]')
      .map((_, element) => $(element).attr('src'))
      .get()
    if (page.cover) sources.push(page.cover)
    if (page.icon?.startsWith('/')) sources.push(page.icon)
    for (const source of sources) {
      assert.ok(source.startsWith('/content-assets/'), `${slug}: ${source}`)
      assert.ok(fs.existsSync(path.join('public', source)), source)
    }
  }
})

test('legacy fragments resolve to real blocks while code, tables and disclosures remain present', () => {
  for (const original of manifest.pages) {
    if (original.id === manifest.rootId) continue // Homepage engineering list is now metadata-driven.
    const before = load(
      prepareLocalArticle(
        fs.readFileSync(`${archive}/pages/${original.slug}.html`, 'utf8')
      ).html
    )
    const after = load(
      prepareLocalArticle(compiled.get(original.slug).html).html
    )
    const ids = new Set(
      after('[id]')
        .map((_, element) => after(element).attr('id'))
        .get()
    )
    for (const id of before('[id]')
      .map((_, element) => before(element).attr('id'))
      .get()) {
      const canonical = compiled.get(original.slug).fragmentAliases?.[id] ?? id
      assert.ok(ids.has(canonical), `${original.slug}: lost fragment ${id}`)
    }
    for (const selector of [
      'table',
      'details',
      'img',
      'pre',
      'figure',
      'img[loading="lazy"]',
      'blockquote:has(section)',
      '.table-scroll'
    ]) {
      assert.equal(
        after(selector).length,
        before(selector).length,
        `${original.slug}: ${selector} count`
      )
    }
    // Heading bold wrappers intentionally inherit the heading's weight.
    assert.deepEqual(
      emphasizedInlineCode(after),
      emphasizedInlineCode(before),
      `${original.slug}: inline-code text and per-character emphasis`
    )
    const codes = ($) =>
      $('pre')
        .map((_, element) => $(element).text().replace(/\n$/, ''))
        .get()
    assert.deepEqual(
      codes(after),
      codes(before),
      `${original.slug}: code content`
    )
    const texts = ($, selector) =>
      $(selector)
        .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
        .get()
    assert.deepEqual(
      texts(after, 'th, td'),
      texts(before, 'th, td'),
      `${original.slug}: table content`
    )
    assert.deepEqual(
      texts(after, 'summary'),
      texts(before, 'summary'),
      `${original.slug}: disclosure labels`
    )
  }
})

test('migration warnings and original provenance remain visible', () => {
  assert.ok(Array.isArray(manifest.failures))
  assert.ok(Array.isArray(manifest.assetFailures))
  for (const { slug } of manifest.pages) {
    const metadata = JSON.parse(
      fs.readFileSync(`${archive}/pages/${slug}.json`, 'utf8')
    )
    const page = compiled.get(slug)
    assert.equal(page.sourceUrl, metadata.sourceUrl)
    for (const warning of metadata.warnings) {
      const canonical = page.fragmentAliases?.[warning.id]
      assert.ok(
        page.html.includes(warning.id) ||
          (canonical && page.html.includes(`id="${canonical}"`)),
        warning.id
      )
    }
  }
})
