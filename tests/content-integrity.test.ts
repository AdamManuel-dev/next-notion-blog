import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { load } from 'cheerio'
import { getLocalPage, getLocalPages } from '../lib/local-content.ts'
import { prepareLocalArticle } from '../lib/local-article-outline.ts'

const maintenance = JSON.parse(
  fs.readFileSync(
    new URL('../content/link-maintenance.json', import.meta.url),
    'utf8'
  )
)
const retiredUrls = new Set(
  maintenance.retired.map(({ url }: { url: string }) => url)
)
const warningCitations = new Map([
  [
    'additional-distributed-systems-papers',
    ['software-transactional-memory', 'Software Transactional Memory']
  ],
  [
    'knowledge-graph-tools',
    ['memex-domain-specific-search', 'Memex (Domain-Specific Search']
  ]
])
const brokenLinkTooltip = 'This link might be broken.'

test('current MDX content has working internal routes, fragments and local assets', async () => {
  const summaries = getLocalPages()
  const compiled = await Promise.all(
    summaries.map((page) => getLocalPage(page.slug))
  )
  const routes = new Map()
  const targets = new Map()
  for (const page of compiled) {
    assert.ok(page)
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
    const aliases = page.fragmentAliases ?? {}
    for (const [legacy, canonical] of Object.entries(aliases)) {
      assert.ok(
        ids.includes(canonical),
        `${page.slug}: dangling alias ${legacy}`
      )
      assert.ok(
        !ids.includes(legacy),
        `${page.slug}: redundant alias element ${legacy}`
      )
    }
    assert.equal(
      $('a[id]:not([href])').length,
      0,
      `${page.slug}: standalone anchor tags`
    )
    targets.set(
      page.slug,
      new Set(['top', 'main', ...ids, ...Object.keys(aliases)])
    )
    if (page.type === 'home')
      targets.get(page.slug).add('engineering-articles').add('all-pages')
  }
  let warningCount = 0
  for (const page of compiled) {
    assert.ok(page)
    // Inspect raw markup before the HTML parser repairs invalid nesting.
    assert.doesNotMatch(
      page.html,
      /<(?:p|h[1-6]|em|strong|span|code)\b[^>]*>\s*<p\b/i,
      `${page.slug}: nested paragraphs`
    )
    const $ = load(page.html)
    const warnings = $('.link-warning')
    const expectedCitation = warningCitations.get(page.slug)
    assert.equal(warnings.length, expectedCitation ? 1 : 0, page.slug)
    warningCount += warnings.length
    if (expectedCitation) {
      const [id, label] = expectedCitation
      const citation = $(`[id="${id}"]`)
      assert.equal(citation.length, 1, `${page.slug}: preserved citation ID`)
      assert.ok(citation.text().includes(label))
      assert.ok(citation.text().includes('original link unavailable'))
      assert.equal(
        citation.find('a').length,
        0,
        'citation must remain unlinked'
      )
      assert.equal(citation.closest('a').length, 0)
      assert.equal(citation.find('.link-warning').length, 1)
      assert.equal(warnings.prop('tagName'), 'SPAN')
      assert.equal(warnings.attr('tabindex'), '0')
      assert.equal(warnings.attr('role'), 'img')
      assert.equal(warnings.attr('aria-label'), brokenLinkTooltip)
      assert.equal(warnings.attr('data-tooltip'), brokenLinkTooltip)
      assert.equal(warnings.attr('title'), undefined)
      assert.equal(warnings.text(), '⚠')
      assert.equal(warnings.closest('a').length, 0)
    }
    assert.equal(
      $('a .link-warning, a.link-warning').length,
      0,
      `${page.slug}: working, repaired and archived links must stay unmarked`
    )
    assert.equal($('script, iframe, object, embed, style').length, 0, page.slug)
    for (const element of $('a[href]').toArray()) {
      const href = $(element).attr('href')
      assert.ok(href)
      const url = new URL(
        href,
        `https://blog.manuel.dev/${page.type === 'home' ? '' : page.slug}`
      )
      assert.doesNotMatch(
        decodeURIComponent(url.pathname),
        /(?:^|\/)(?:null|undefined)(?:\/|$)/i,
        `${page.slug}: placeholder link ${href}`
      )
      const destination = new URL(url)
      destination.hash = ''
      assert.ok(
        !retiredUrls.has(destination.href),
        `${page.slug}: retired link ${href}`
      )
      if (url.hostname === 'web.archive.org')
        assert.match(
          $(element).text(),
          /archived/i,
          `${page.slug}: archive link must be labelled ${href}`
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
  assert.equal(warningCount, 2, 'exactly two retired-citation warning icons')
})

test('Express tutorial table of contents navigates to its twelve section headings', async () => {
  const page = await getLocalPage('my-favorite-express-architecture')
  assert.ok(page)
  const $ = load(prepareLocalArticle(page.html).html)
  const links = $('#table-of-contents').next('ol').find('a[href]')
  assert.equal(links.length, 12)
  for (const element of links.toArray()) {
    const href = $(element).attr('href')
    assert.ok(href)
    assert.match(href, /^#[\w-]+$/)
    const target = $(`[id="${href.slice(1)}"]`)
    assert.equal(target.length, 1, `missing TOC destination ${href}`)
    assert.equal(
      target.prop('tagName'),
      'H3',
      `TOC must target a section: ${href}`
    )
  }
})
