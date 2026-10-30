import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { load } from 'cheerio'
import { getLocalPage, getLocalPages } from '../lib/local-content.ts'
import { prepareLocalArticle } from '../lib/local-article-outline.ts'

test('current MDX content has working internal routes, fragments and local assets', async () => {
  const summaries = getLocalPages()
  const compiled = await Promise.all(
    summaries.map((page) => getLocalPage(page.slug))
  )
  const routes = new Map()
  const targets = new Map()
  for (const page of compiled) {
    const uuid = page.id.replace(
      /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/,
      '$1-$2-$3-$4-$5'
    )
    for (const route of [page.id, uuid, `${page.slug}-${page.id}`])
      routes.set(route, page.slug)
    if (page.type !== 'home') routes.set(page.slug, page.slug)
    else routes.set('', page.slug)
    const $ = load(
      page.type === 'home' ? page.html : prepareLocalArticle(page.html).html
    )
    const ids = $('[id]')
      .map((_, element) => $(element).attr('id'))
      .get()
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${page.slug}: duplicate HTML IDs`
    )
    targets.set(page.slug, new Set(['top', 'main', ...ids]))
    if (page.type === 'home')
      targets.get(page.slug).add('engineering-articles').add('all-pages')
  }
  for (const page of compiled) {
    const $ = load(page.html)
    assert.equal($('script, iframe, object, embed, style').length, 0, page.slug)
    for (const element of $('a[href]').toArray()) {
      const href = $(element).attr('href')
      const url = new URL(
        href,
        `https://blog.manuel.dev/${page.type === 'home' ? '' : page.slug}`
      )
      if (url.origin !== 'https://blog.manuel.dev') continue
      const pathname = decodeURIComponent(url.pathname).replace(
        /^\/+|\/+$/g,
        ''
      )
      if (pathname.startsWith('content-assets/')) {
        assert.ok(
          fs.existsSync(path.join('public', pathname)),
          `${page.slug}: ${href}`
        )
        continue
      }
      const target = routes.get(pathname)
      assert.ok(target, `${page.slug}: missing route ${href}`)
      if (url.hash)
        assert.ok(
          targets.get(target).has(decodeURIComponent(url.hash.slice(1))),
          `${page.slug}: missing fragment ${href}`
        )
    }
    const sources = $('img[src]')
      .map((_, element) => $(element).attr('src'))
      .get()
    if (page.cover) sources.push(page.cover)
    if (page.icon?.startsWith('/')) sources.push(page.icon)
    for (const source of sources) {
      assert.ok(
        source.startsWith('/content-assets/'),
        `${page.slug}: ${source}`
      )
      assert.ok(
        fs.existsSync(path.join('public', source)),
        `${page.slug}: ${source}`
      )
    }
  }
})
