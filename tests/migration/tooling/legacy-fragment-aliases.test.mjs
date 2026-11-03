import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { load } from 'cheerio'
import { getLegacyPage as getLocalPage } from '../../../scripts/migrations/legacy-content.mjs'

const pageId = '1234567890abcdef1234567890abcdef'
function fixture(t, body, mapping) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fragment-aliases-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const content = path.join(root, 'articles')
  fs.mkdirSync(content)
  const file = path.join(content, 'index.mdx')
  const saveBody = (value) =>
    fs.writeFileSync(
      file,
      `---
id: ${pageId}
slug: fragments
title: Fragments
description: Fixture
type: home
tags: []
order: 0
---
${value}\n`
    )
  const saveMap = (value) =>
    fs.writeFileSync(
      path.join(content, 'fragment-aliases.json'),
      JSON.stringify(value)
    )
  saveBody(body)
  if (mapping !== undefined)
    saveMap({ version: 1, pages: { [pageId]: mapping } })
  return {
    saveBody,
    saveMap,
    saveRawMap: (value) =>
      fs.writeFileSync(path.join(content, 'fragment-aliases.json'), value),
    render: () => getLocalPage(undefined, { root, contentDir: 'articles' })
  }
}

function assertResolved(page) {
  const $ = load(page.html)
  const ids = $('[id]')
    .map((_, node) => $(node).attr('id'))
    .get()
  assert.equal(new Set(ids).size, ids.length)
  assert.equal($('a[id]:empty:not([href])').length, 0)
  for (const [alias, canonical] of Object.entries(page.fragmentAliases)) {
    assert.ok(ids.includes(canonical), `${alias} resolves to a real block`)
    assert.ok(!ids.includes(alias), `${alias} is not a native anchor`)
    assert.ok(
      !Object.hasOwn(page.fragmentAliases, canonical),
      'no alias chains'
    )
  }
  assert.deepEqual(JSON.parse(JSON.stringify(page)), page)
  return $
}

test('compatibility placeholders flatten to following real blocks, never native anchors', async (t) => {
  const f = fixture(
    t,
    '::anchor{#before}\n\n<a id="second" />\n\n## Title {#title}\n\nParagraph. {#paragraph}\n\n:::callout{#callout}\nInside.\n:::\n\n::anchor{#trailing}',
    {
      before: ['old-heading'],
      second: ['older-heading'],
      paragraph: ['old-paragraph'],
      callout: ['old-section'],
      trailing: ['old-tail']
    }
  )
  const page = await f.render()
  const $ = assertResolved(page)
  assert.deepEqual(page.fragmentAliases, {
    before: 'title',
    second: 'title',
    trailing: 'callout',
    'old-heading': 'title',
    'older-heading': 'title',
    'old-paragraph': 'paragraph',
    'old-section': 'callout',
    'old-tail': 'callout'
  })
  assert.equal($('h2').text(), 'Title')
})

test('authored slugs survive text changes and sidecar edits are read fresh', async (t) => {
  const f = fixture(t, '## Before {#stable}', { stable: ['first'] })
  assert.equal((await f.render()).fragmentAliases.first, 'stable')
  f.saveBody('## Renamed completely {#stable}')
  f.saveMap({ version: 1, pages: { [pageId]: { stable: ['second'] } } })
  const page = await f.render()
  assert.match(page.html, /<h2 id="stable">Renamed completely<\/h2>/)
  assert.deepEqual(page.fragmentAliases, { second: 'stable' })
})

test('generation reserves authored IDs, legacy aliases and layout IDs, but not canonical map keys', async (t) => {
  const f = fixture(
    t,
    '## Repeat\n\n## Repeat\n\n## Explicit {#repeat}\n\nText. {#repeat-2}\n\n## Target {#target}\n\nMain',
    { target: ['repeat-3'], 'repeat-4': ['old-generated'] }
  )
  const page = await f.render()
  const $ = assertResolved(page)
  assert.deepEqual(
    $('h2')
      .map((_, node) => $(node).attr('id'))
      .get(),
    ['repeat-4', 'repeat-5', 'repeat', 'target']
  )
  assert.equal($('p').last().attr('id'), 'main-2')
  assert.deepEqual(page, await f.render())
})

test('automatic IDs address headings, prose, code, lists, quotes, callouts, figures, tables and dividers', async (t) => {
  const f = fixture(
    t,
    '::anchor\n\n## Following **title**\n\n:::callout\nA helpful warning.\n:::\n\nOrdinary `inline` text.\n\n```js\nconst answer = 42\n```\n\n- First\n- Second\n\n> Quoted prose\n\n![Photo](/photo.png)\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n---'
  )
  const page = await f.render()
  const $ = assertResolved(page)
  for (const selector of [
    'h2',
    'p',
    'pre',
    'ul',
    'li',
    'blockquote',
    'section',
    'figure',
    'table',
    'hr'
  ])
    for (const node of $(selector)) assert.ok($(node).attr('id'), selector)
  assert.equal($('h2').attr('id'), 'following-title')
  assert.equal($('p code[id], pre code[id], li > p').length, 0)
  assert.equal($('figure img').attr('loading'), 'lazy')
})

test('placeholders prefer code, lists and quotes over later prose and stay in their container', async (t) => {
  const f = fixture(
    t,
    '::anchor{#code-old}\n\n```js\nanswer()\n```\n\n::anchor{#list-old}\n\n- Item\n\n::anchor{#quote-old}\n\n> Quote\n>\n> ::anchor{#quote-tail}\n\n:::callout{#box}\n::anchor{#box-old}\n\nBox paragraph.\n:::\n\n- ::anchor{#empty-item}\n\nLater prose.'
  )
  const page = await f.render()
  const $ = assertResolved(page)
  for (const [alias, selector] of [
    ['code-old', 'pre'],
    ['list-old', 'ul:first'],
    ['quote-old', 'blockquote'],
    ['quote-tail', 'blockquote p'],
    ['box-old', 'section p'],
    ['empty-item', 'li:last']
  ])
    assert.equal(
      page.fragmentAliases[alias],
      $(selector).last().attr('id'),
      alias
    )
})

test('prototype-shaped historical IDs remain own serializable properties', async (t) => {
  const f = fixture(t, '## Title {#title}', {
    title: ['__proto__', 'constructor', 'toString']
  })
  const page = await f.render()
  assertResolved(page)
  for (const alias of ['__proto__', 'constructor', 'toString']) {
    assert.ok(Object.hasOwn(page.fragmentAliases, alias))
    assert.equal(page.fragmentAliases[alias], 'title')
  }
  assert.equal(Object.getPrototypeOf(page.fragmentAliases), Object.prototype)
})

test('placeholder names that would collide with nested automatic targets stay stable after removal', async (t) => {
  const f = fixture(t, '::anchor{#same}\n\n::anchor{#same-2}\n\n> Same', {
    same: ['old'],
    'same-2': ['older']
  })
  const before = await f.render()
  assertResolved(before)
  assert.equal(before.fragmentAliases['same-2'], 'same')
  f.saveBody('> Same')
  f.saveMap({
    version: 1,
    pages: { [pageId]: { same: ['old', 'older', 'same-2'] } }
  })
  const after = await f.render()
  assert.equal(after.html, before.html)
  assert.deepEqual(after.fragmentAliases, before.fragmentAliases)
})

for (const [name, body, mapping, pattern] of [
  [
    'duplicate canonical IDs',
    '## One {#same}\n\nText {#same}',
    {},
    /Duplicate fragment id/
  ],
  [
    'native JSX duplicates',
    '<p id="same">Text</p>\n\n## Title {#same}',
    {},
    /Duplicate fragment id/
  ],
  ['dangling canonical', '## Title', { absent: ['old'] }, /Dangling canonical/],
  [
    'authored alias collision',
    '## Title {#title}\n\nText {#old}',
    { title: ['old'] },
    /collides with an authored/
  ],
  ['self alias', '## Title {#title}', { title: ['title'] }, /self alias/],
  [
    'shared alias',
    '## Title {#title}\n\n## Next {#next}',
    { title: ['old'], next: ['old'] },
    /duplicate, colliding/
  ],
  [
    'canonical alias collision',
    '## Title {#title}\n\n## Next {#next}',
    { title: ['next'], next: [] },
    /duplicate, colliding/
  ],
  [
    'non-array value',
    '## Title',
    { title: 'old' },
    /invalid canonical target or aliases/
  ],
  ['non-string alias', '## Title', { title: [42] }, /invalid legacy alias/],
  ['empty alias', '## Title', { title: [''] }, /invalid legacy alias/],
  ['invalid canonical', '## Title', { 'Bad ID': [] }, /invalid canonical/],
  [
    'unattached placeholder',
    '::anchor{#alone}',
    {},
    /Cannot attach fragment placeholder/
  ]
])
  test(`rejects ${name}`, async (t) => {
    await assert.rejects(fixture(t, body, mapping).render(), pattern)
  })

test('malformed JSON and schema fail with sidecar context', async (t) => {
  const f = fixture(t, '## Title')
  f.saveMap({ version: 2, pages: {} })
  await assert.rejects(f.render(), /fragment-aliases.json.*expected/)
  f.saveMap({ version: 1, pages: { [pageId]: [] } })
  await assert.rejects(f.render(), /invalid page mapping/)
  f.saveRawMap('{')
  await assert.rejects(f.render(), /fragment-aliases.json.*failed to read/)
})
