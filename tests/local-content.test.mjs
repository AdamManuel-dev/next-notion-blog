import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { test } from 'node:test'
import {
  getLocalPage,
  getLocalPages,
  getLocalPaths
} from '../lib/local-content.ts'

const manifest = JSON.parse(fs.readFileSync('content/manifest.json', 'utf8'))

test('every archived page is available from the filesystem', () => {
  const summaries = getLocalPages()
  const crawl = JSON.parse(
    fs.readFileSync('content/notion-source/crawl.json', 'utf8')
  )
  const archivedPages = summaries.filter((page) => page.source !== 'blog-draft')
  assert.equal(archivedPages.length, crawl.pages.length)
  assert.equal(new Set(summaries.map((p) => p.slug)).size, summaries.length)
  assert.equal(new Set(summaries.map((p) => p.id)).size, summaries.length)
  for (const summary of summaries) {
    const page = getLocalPage(summary.slug)
    assert.equal(page.id, summary.id)
    assert.equal(page.title, summary.title)
    assert.ok(page.html.trim(), `${summary.slug} has content`)
    if (summary.source !== 'blog-draft') {
      const source = JSON.parse(
        gunzipSync(
          fs.readFileSync(`content/notion-source/${summary.id}.json.gz`)
        )
      )
      assert.equal(source.id, summary.id)
    }
  }
})

test('homepage and legacy identifiers resolve without a network connection', () => {
  assert.equal(getLocalPage().id, manifest.rootId)
  for (const identifier of getLocalPaths()) {
    assert.ok(getLocalPage(identifier), `${identifier} resolves`)
  }
  assert.equal(new Set(getLocalPaths()).size, getLocalPaths().length)
})

test('unknown pages and traversal attempts return null', () => {
  for (const identifier of [
    'missing',
    '../package.json',
    '/etc/passwd',
    '..'
  ]) {
    assert.equal(getLocalPage(identifier), null)
  }
})

test('imported HTML contains no scripts, event handlers or remote images', () => {
  const slugs = new Set(getLocalPages().map((page) => `/${page.slug}`))
  for (const { slug } of getLocalPages()) {
    const { html, cover } = getLocalPage(slug)
    assert.doesNotMatch(html, /<(script|iframe|object|embed|style)\b/i, slug)
    assert.doesNotMatch(html, /\son\w+=|(?:href|src)="javascript:/i, slug)
    const sources = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(
      (match) => match[1]
    )
    if (cover) sources.push(cover)
    for (const source of sources) {
      assert.ok(source.startsWith('/content-assets/'), `${slug}: ${source}`)
      assert.ok(fs.existsSync(path.join('public', source)), source)
    }
    for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
      const pathname = href.split('#')[0]
      assert.ok(pathname === '/' || slugs.has(pathname), `${slug}: ${href}`)
    }
  }
})

test('migration gaps remain visible in metadata rather than silently disappearing', () => {
  assert.ok(Array.isArray(manifest.failures))
  assert.ok(Array.isArray(manifest.assetFailures))
  for (const { slug } of getLocalPages()) {
    const metadata = JSON.parse(
      fs.readFileSync(`content/pages/${slug}.json`, 'utf8')
    )
    assert.ok(Array.isArray(metadata.warnings))
    for (const warning of metadata.warnings) {
      assert.ok(getLocalPage(slug).html.includes(warning.id), warning.id)
    }
  }
})
