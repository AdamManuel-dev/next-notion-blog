import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { load } from 'cheerio'
import { getLocalPage } from '../../../lib/mdx-content.mjs'
import { getLegacyPage } from '../../../scripts/migrations/legacy-content.mjs'
import {
  migrateStandaloneAnchors,
  removeStandaloneAnchors
} from '../../../scripts/migrations/remove-standalone-anchors.mjs'

const id = '1234567890abcdef1234567890abcdef'
const header = `---
id: ${id}
slug: migration
title: Migration
description: Fixture
type: home
tags: []
order: 0
---
`
function fixture(t, body, mapping = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-migration-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const directory = path.join(root, 'content')
  fs.mkdirSync(directory)
  const file = path.join(directory, 'index.mdx')
  const sidecar = path.join(directory, 'fragment-aliases.json')
  fs.writeFileSync(file, header + body)
  fs.writeFileSync(
    sidecar,
    JSON.stringify({ version: 1, pages: { [id]: mapping } })
  )
  return { root, file, sidecar }
}

test('AST removal leaves literal examples, code bytes and quote/list prefixes untouched', () => {
  const source =
    header +
    [
      '> ::anchor{#quote}',
      '>',
      '> Text.',
      '',
      '- ::anchor{#list}',
      '  ',
      '  List prose.',
      '',
      '```md',
      '::anchor{#example}',
      '```',
      '',
      'Inline `::anchor{#inline}` remains.',
      '',
      ':::callout{#explicit}',
      'Callout.',
      ':::',
      ''
    ].join('\n')
  const result = removeStandaloneAnchors(source)
  assert.equal(result.count, 2)
  assert.ok(result.source.includes('> \n>\n> Text.'))
  assert.ok(result.source.includes('- {/* */}\n  \n  List prose.'))
  assert.ok(result.source.includes(':::callout{#explicit}'))
  assert.deepEqual(removeStandaloneAnchors(result.source).code, result.code)
  assert.equal(removeStandaloneAnchors(result.source).count, 0)
})

test('migration preserves aliases, real IDs, code and Markdown container boundaries; repeat is byte-identical', async (t) => {
  const f = fixture(
    t,
    [
      '::anchor{#heading-start}',
      '',
      '## Heading {#heading}',
      '',
      '::anchor{#code-start}',
      '',
      '```js',
      'const exact = "::anchor{#sample}"',
      '```',
      '',
      '::anchor{#list-first}',
      '',
      '- First list',
      '',
      '::anchor{#list-second}',
      '',
      '- ::anchor{#list-paragraph}',
      '  ',
      '  Second list',
      '',
      '::anchor{#quote-start}',
      '',
      '> Quoted prose',
      '>',
      '> ::anchor{#quote-tail}',
      '',
      '- ::anchor{#empty-item}',
      '',
      'Final prose. {#final}',
      '',
      '::anchor{#tail}',
      ''
    ].join('\n'),
    {
      'heading-start': ['old-heading'],
      'code-start': ['old-code'],
      'list-paragraph': ['old-list'],
      tail: ['old-tail']
    }
  )
  const original = fs.readFileSync(f.file, 'utf8')
  const originalSidecar = fs.readFileSync(f.sidecar, 'utf8')
  const before = await getLegacyPage(undefined, { root: f.root })
  assert.deepEqual(await migrateStandaloneAnchors({ root: f.root }), {
    files: 1,
    anchors: 9
  })
  assert.equal(fs.readFileSync(f.file, 'utf8'), original)
  assert.equal(fs.readFileSync(f.sidecar, 'utf8'), originalSidecar)
  await migrateStandaloneAnchors({ root: f.root, write: true })
  const after = await getLocalPage(undefined, { root: f.root })
  const $ = load(after.html)
  assert.deepEqual(after.fragmentAliases, before.fragmentAliases)
  assert.equal($('a[id]:empty:not([href])').length, 0)
  assert.equal(
    $('body > ul').length,
    3,
    'formerly separated lists do not merge'
  )
  const emptyItem = $(`[id="${after.fragmentAliases['empty-item']}"]`)
  assert.equal(emptyItem.prop('tagName'), 'LI')
  assert.equal(emptyItem.text().trim(), '')
  assert.equal(emptyItem.children().length, 0)
  for (const target of Object.values(after.fragmentAliases))
    assert.equal($(`[id="${target}"]`).length, 1)
  const migrated = fs.readFileSync(f.file, 'utf8')
  const migratedSidecar = fs.readFileSync(f.sidecar, 'utf8')
  assert.deepEqual(
    removeStandaloneAnchors(migrated).code,
    removeStandaloneAnchors(original).code
  )
  assert.deepEqual(
    await migrateStandaloneAnchors({ root: f.root, write: true }),
    { files: 0, anchors: 0 }
  )
  assert.equal(fs.readFileSync(f.file, 'utf8'), migrated)
  assert.equal(fs.readFileSync(f.sidecar, 'utf8'), migratedSidecar)
})

test('failed validation never writes a half-migrated source tree', async (t) => {
  const f = fixture(t, '::anchor{#start}\n\n## Heading\n', { missing: ['old'] })
  const source = fs.readFileSync(f.file, 'utf8')
  const mapping = fs.readFileSync(f.sidecar, 'utf8')
  await assert.rejects(
    migrateStandaloneAnchors({ root: f.root, write: true }),
    /Dangling canonical/
  )
  assert.equal(fs.readFileSync(f.file, 'utf8'), source)
  assert.equal(fs.readFileSync(f.sidecar, 'utf8'), mapping)
})
