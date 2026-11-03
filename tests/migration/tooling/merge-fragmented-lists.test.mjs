import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { load } from 'cheerio'
import { getLocalPage } from '../../../lib/mdx-content.mjs'
import {
  mergeFragmentedLists,
  migrateFragmentedLists
} from '../../../scripts/migrations/merge-fragmented-lists.mjs'

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
function fixture(t, body, mapping = {}, contentDir = 'content') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-lists-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const directory = path.join(root, contentDir)
  fs.mkdirSync(directory)
  const file = path.join(directory, 'index.mdx')
  const sidecar = path.join(directory, 'fragment-aliases.json')
  fs.writeFileSync(file, header + body)
  fs.writeFileSync(
    sidecar,
    JSON.stringify({ version: 1, pages: { [id]: mapping } })
  )
  return { root, file, sidecar, contentDir }
}
const read = (file) => fs.readFileSync(file, 'utf8')
const destination = (page, name) => {
  const $ = load(page.html)
  return $(`[id="${page.fragmentAliases[name] ?? name}"]`)
}

for (const marker of ['-', '1.']) {
  test(`${marker} chains repair grouping and preserve each duplicate item's public/historical destination`, async (t) => {
    const f = fixture(
      t,
      `## Unrelated\n\n${marker} Same\n\n{/* */}\n\n${marker} Same\n\n{/* */}\n\n${marker} Last {#last-paragraph}\n\nSame\n`
    )
    let before = await getLocalPage(undefined, f)
    const $ = load(before.html)
    const listTag = marker === '-' ? 'ul' : 'ol'
    const listIds = $(`body > ${listTag}`)
      .map((_, node) => $(node).attr('id'))
      .get()
    const itemIds = $(`body > ${listTag} > li`)
      .map((_, node) => $(node).attr('id'))
      .get()
    const mapping = Object.fromEntries(
      listIds.map((name, i) => [name, [`historical-${i}`]])
    )
    fs.writeFileSync(
      f.sidecar,
      JSON.stringify({ version: 1, pages: { [id]: mapping } })
    )
    before = await getLocalPage(undefined, f)
    const source = read(f.file)
    const sidecar = read(f.sidecar)

    assert.deepEqual(await migrateFragmentedLists(f), {
      files: 1,
      chains: 1,
      separators: 2
    })
    assert.equal(read(f.file), source)
    assert.equal(read(f.sidecar), sidecar)
    await migrateFragmentedLists({ ...f, write: true })
    const after = await getLocalPage(undefined, f)
    const next = load(after.html)
    assert.equal(next(`body > ${listTag}`).length, 1)
    assert.equal(next(`body > ${listTag} > li`).length, 3)
    assert.equal(next('a[id]:empty').length, 0)
    assert.equal(destination(after, 'last-paragraph').prop('tagName'), 'P')
    for (let i = 0; i < 3; i++) {
      const item = next(`body > ${listTag} > li`).eq(i)
      for (const name of [listIds[i], itemIds[i], `historical-${i}`]) {
        assert.equal(destination(after, name).attr('id'), item.attr('id'))
        assert.equal(destination(after, name).prop('tagName'), 'LI')
      }
    }
    assert.equal(destination(after, 'unrelated').prop('tagName'), 'H2')
    assert.equal(next('h2').attr('id'), 'unrelated')
    assert.equal(after.fragmentAliases.unrelated, undefined)
    // The unrelated duplicate paragraph must not inherit a former list/item name.
    const oldParagraph = $('body > p').attr('id')
    assert.equal(destination(after, oldParagraph).prop('tagName'), 'P')
    assert.equal(destination(after, oldParagraph).text(), 'Same')
    assert.ok(read(f.file).includes('{#last-paragraph}'))
    const migrated = read(f.file)
    const aliases = read(f.sidecar)
    assert.equal(mergeFragmentedLists(migrated).source, migrated)
    assert.deepEqual(await migrateFragmentedLists({ ...f, write: true }), {
      files: 0,
      chains: 0,
      separators: 0
    })
    assert.equal(read(f.file), migrated)
    assert.equal(read(f.sidecar), aliases)
  })
}

test('nested chains maintain ownership, retain quote/item-leading comments and exact code source', async (t) => {
  const body = [
    '- Parent',
    '',
    '  - Child `exact  code`',
    '',
    '  {/* */}',
    '',
    '  - Child',
    '',
    '{/* */}',
    '',
    '- Second',
    '',
    '> Quote one',
    '',
    '{/* */}',
    '',
    '> Quote two',
    '',
    '- {/* */}',
    '',
    '  Item-leading comment stays.',
    '',
    '```md',
    '- literal',
    '',
    '{/* */}',
    '',
    '- literal',
    '```',
    '',
    'Inline `{/* */}` remains.',
    ''
  ].join('\n')
  const f = fixture(t, body, {}, 'articles')
  const before = await getLocalPage(undefined, f)
  assert.deepEqual(await migrateFragmentedLists({ ...f, write: true }), {
    files: 1,
    chains: 2,
    separators: 2
  })
  const after = await getLocalPage(undefined, f)
  const $ = load(after.html)
  assert.equal($('body > ul').length, 2)
  assert.equal($('body > ul').first().children('li').length, 2)
  assert.equal(
    $('body > ul').first().children('li').first().find('ul > li').length,
    2
  )
  assert.equal($('blockquote').length, 2)
  assert.ok(read(f.file).includes('> Quote one\n\n{/* */}\n\n> Quote two'))
  assert.ok(read(f.file).includes('- {/* */}\n\n  Item-leading comment stays.'))
  assert.ok(read(f.file).endsWith(body.slice(body.indexOf('```md'))))
  assert.deepEqual(after.liveBlocks, before.liveBlocks)
})

test('tight lists do not acquire paragraphs from prefix IDs', async (t) => {
  const f = fixture(t, '- Alpha\n\n{/* */}\n\n- Beta\n')
  await migrateFragmentedLists({ ...f, write: true })
  const $ = load((await getLocalPage(undefined, f)).html)
  assert.equal($('ul > li').length, 2)
  assert.equal($('ul > li > p').length, 0)
})

test('multi-paragraph items remain loose and preserve explicit paragraph/inline JSX targets', async (t) => {
  const f = fixture(
    t,
    '- Alpha <span id="inline-id">inline</span> {#alpha-p}\n\n  More prose.\n\n{/* */}\n\n- Beta\n'
  )
  await migrateFragmentedLists({ ...f, write: true })
  const page = await getLocalPage(undefined, f)
  const $ = load(page.html)
  assert.equal($('body > ul').length, 1)
  assert.equal(destination(page, 'alpha-p').text(), 'Alpha inline')
  assert.equal(destination(page, 'inline-id').prop('tagName'), 'SPAN')
  assert.equal($('ul > li').first().children('p').length, 2)
})

test('non-default ordered starts and unrelated separators stay byte-identical', async (t) => {
  const body =
    '2. Two\n\n{/* */}\n\n1. One\n\n{/* */}\n\n- Different type\n\n{/* meaning */}\n\n- Other\n'
  const f = fixture(t, body)
  assert.equal(mergeFragmentedLists(header + body).source, header + body)
  assert.deepEqual(await migrateFragmentedLists({ ...f, write: true }), {
    files: 0,
    chains: 0,
    separators: 0
  })
  assert.equal(read(f.file), header + body)
})

test('unsupported candidates fail instead of deleting ambiguous content', () => {
  for (const body of [
    '- One\n- Two\n\n{/* */}\n\n- Three\n',
    '- {/* */}\n\n{/* */}\n\n- Text\n'
  ])
    assert.throws(
      () => mergeFragmentedLists(body),
      /non-singleton|must have a first paragraph/
    )
})

test('all staged pages validate before writing any source or sidecar', async (t) => {
  const f = fixture(t, '- Alpha\n\n{/* */}\n\n- Beta\n')
  const directory = path.join(f.root, 'content', 'broken')
  fs.mkdirSync(directory)
  const broken = path.join(directory, 'index.mdx')
  fs.writeFileSync(
    broken,
    header
      .replace(id, 'a'.repeat(32))
      .replace('slug: migration', 'slug: broken')
      .replace('type: home', 'type: post') +
      '## Broken {#duplicate}\n\nText {#duplicate}\n'
  )
  const source = read(f.file)
  const badSource = read(broken)
  const mapping = read(f.sidecar)
  await assert.rejects(
    migrateFragmentedLists({ ...f, write: true }),
    /Duplicate (fragment|IDs)/
  )
  assert.equal(read(f.file), source)
  assert.equal(read(broken), badSource)
  assert.equal(read(f.sidecar), mapping)
})

test('historical suffix reservations cannot steal a different surviving block', async (t) => {
  const f = fixture(t, '- Echo\n\n{/* */}\n\n- Echo\n\nEcho\n\nEcho\n', {
    echo: ['echo-2', 'old-list'],
    'echo-3': ['old-item']
  })
  const before = await getLocalPage(undefined, f)
  const $ = load(before.html)
  const oldParagraphs = $('body > p')
    .map((_, node) => $(node).attr('id'))
    .get()
  await migrateFragmentedLists({ ...f, write: true })
  const after = await getLocalPage(undefined, f)
  for (const name of ['old-list', 'echo', 'echo-2', 'old-item', 'echo-3'])
    assert.equal(destination(after, name).prop('tagName'), 'LI')
  const next = load(after.html)
  assert.equal(
    destination(after, 'old-list').attr('id'),
    next('ul > li').first().attr('id')
  )
  assert.equal(
    destination(after, 'old-item').attr('id'),
    next('ul > li').first().attr('id')
  )
  for (let i = 0; i < oldParagraphs.length; i++)
    assert.equal(
      destination(after, oldParagraphs[i]).attr('id'),
      next('body > p').eq(i).attr('id')
    )
})

test('participating items keep leading comments before their pinned first paragraphs', async (t) => {
  const body = '- {/* */}\n\n  First\n\n{/* */}\n\n- {/* */}\n\n  Second\n'
  const f = fixture(t, body)
  const before = load((await getLocalPage(undefined, f)).html)
  const oldLists = before('body > ul')
    .map((_, node) => before(node).attr('id'))
    .get()
  assert.deepEqual(await migrateFragmentedLists({ ...f, write: true }), {
    files: 1,
    chains: 1,
    separators: 1
  })
  const source = read(f.file)
  assert.equal(source.match(/\{\/\* \*\/\}/g).length, 2)
  assert.ok(source.includes('- {/* */}\n\n  {#'))
  const after = await getLocalPage(undefined, f)
  const $ = load(after.html)
  assert.equal($('body > ul').length, 1)
  for (let i = 0; i < oldLists.length; i++) {
    assert.equal(
      destination(after, oldLists[i]).attr('id'),
      $('ul > li').eq(i).attr('id')
    )
  }
})

test('different Markdown bullet spellings cannot silently remain separate containers', async (t) => {
  const f = fixture(t, '- Alpha\n\n{/* */}\n\n* Beta\n')
  const source = read(f.file)
  const aliases = read(f.sidecar)
  await assert.rejects(
    migrateFragmentedLists({ ...f, write: true }),
    /did not merge ordinary lists/
  )
  assert.equal(read(f.file), source)
  assert.equal(read(f.sidecar), aliases)
})
