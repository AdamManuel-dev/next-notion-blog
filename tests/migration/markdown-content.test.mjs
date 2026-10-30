import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { load } from 'cheerio'
import { getLocalPage } from '../../lib/local-content.ts'

const archive = 'legacy/content'
// HTML serializers insert different whitespace between block/cell boundaries.
// Code whitespace is checked exactly in local-content.test.mjs.
const normalize = (text) => text.replace(/\s+/g, '')

test('migrated Markdown preserves the visible prose and links of every original article', async () => {
  const { pages } = JSON.parse(
    fs.readFileSync(`${archive}/manifest.json`, 'utf8')
  )
  for (const summary of pages) {
    const page = await getLocalPage(summary.slug)
    const before = load(
      fs.readFileSync(`${archive}/pages/${summary.slug}.html`, 'utf8')
    )
    const after = load(page.html)
    // The homepage engineering list is intentionally metadata-driven in the layout.
    before('#engineering-articles').remove()
    assert.equal(
      normalize(after('body').text()),
      normalize(before('body').text()),
      `${summary.slug}: visible text`
    )
    // GFM may autolink a repeated bare URL; preserve the destination set.
    const links = ($) =>
      [
        ...new Set(
          $('a[href]')
            .map((_, element) => $(element).attr('href'))
            .get()
        )
      ].sort()
    assert.deepEqual(
      links(after),
      links(before),
      `${summary.slug}: link targets`
    )
    assert.equal(after('h1').length, 0, `${summary.slug}: duplicate title`)
  }
})
