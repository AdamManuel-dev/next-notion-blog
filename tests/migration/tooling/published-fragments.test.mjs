import assert from 'node:assert/strict'
import { test } from 'node:test'
import { load } from 'cheerio'
import { fileURLToPath } from 'node:url'
import { getLocalPage, readContentIndex } from '../../../lib/mdx-content.mjs'
import { getLegacyPage } from '../../../scripts/migrations/legacy-content.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))

test('completed content migration preserves every published target and alias with the one-pass compiler', async () => {
  const options = { root }
  const ids = (html) => {
    const $ = load(html)
    assert.equal($('a[id]:empty:not([href])').length, 0)
    return $('[id]')
      .map((_, node) => $(node).attr('id'))
      .get()
  }
  for (const entry of readContentIndex(options).pages) {
    const before = await getLegacyPage(entry.slug, options)
    const after = await getLocalPage(entry.slug, options)
    const targets = ids(after.html)
    assert.deepEqual(targets, ids(before.html), entry.slug)
    assert.equal(new Set(targets).size, targets.length, entry.slug)
    assert.deepEqual(after.fragmentAliases, before.fragmentAliases, entry.slug)
    for (const target of Object.values(after.fragmentAliases))
      assert.ok(targets.includes(target), `${entry.slug}: ${target}`)
  }
})
