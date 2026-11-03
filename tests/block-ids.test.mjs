import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { load } from 'cheerio'

import { getLocalPage } from '../lib/mdx-content.mjs'
import remarkHeadingIds from '../lib/remark-heading-ids.mjs'

async function render(t, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'block-ids-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'content'))
  fs.writeFileSync(
    path.join(root, 'content/index.mdx'),
    `---
slug: block-ids
title: Block IDs
description: Fixture
type: home
tags: []
order: 0
---
${body}\n`
  )
  return (await getLocalPage(undefined, { root })).html
}

test('paragraph IDs preserve phrasing, literal case, and independent heading targets', async (t) => {
  const html = await render(
    t,
    'A **bold** paragraph with `code` and {1 + 2}. {#Stable_ID-42}\n\n## Heading {#different}'
  )
  const $ = load(html)
  assert.equal($('#Stable_ID-42').prop('tagName'), 'P')
  assert.equal($('#Stable_ID-42').text(), 'A bold paragraph with code and 3.')
  assert.equal($('#Stable_ID-42 strong').text(), 'bold')
  assert.doesNotMatch(html, /<a id="compat"/)
  assert.equal($('#different').prop('tagName'), 'H2')
  assert.equal($('#compat').length, 0)
})

test('nested callouts, blockquotes and tight lists retain sections and paragraph IDs', async (t) => {
  const html = await render(
    t,
    [
      '::::callout{#outer}',
      'Outside. {#outside}',
      '',
      '> :::callout{#quoted}',
      '> Quote. {#quote}',
      '> :::',
      '',
      '- :::callout{#listed}',
      '  List callout. {#list-callout}',
      '  :::',
      '',
      ':::callout{#inner}',
      'Inside. {#inside}',
      ':::',
      '::::',
      '',
      '- Tight item. {#tight}',
      '- Ordinary item.'
    ].join('\n')
  )
  const $ = load(html)
  assert.equal($('section#outer section#inner p#inside').text(), 'Inside.')
  assert.equal(
    $('section#outer blockquote section#quoted p#quote').text(),
    'Quote.'
  )
  assert.equal(
    $('section#outer li section#listed p#list-callout').text(),
    'List callout.'
  )
  assert.equal($('li p#tight').text(), 'Tight item.')
  assert.equal($('section').length, 4)
})

test('code, escaped and non-terminal markers remain literal; expressions still execute', async (t) => {
  const html = await render(
    t,
    [
      'Inline `{#code}` and \\{#escaped} and {#middle} text {2 + 3}.',
      '',
      'Only `{#terminal-code}`',
      '',
      'Only \\{#terminal-escaped}',
      '',
      '![Alt {#alt}](/image.png)',
      '',
      '```md',
      '::anchor{#fenced}',
      ':::callout{#fenced-callout}',
      'Paragraph {#fenced-paragraph}',
      '```',
      '',
      '<span>{"{#expression}"}</span>',
      '',
      '## Heading {#heading}'
    ].join('\n')
  )
  const $ = load(html)
  assert.equal(
    $('p').first().text(),
    'Inline {#code} and {#escaped} and {#middle} text 5.'
  )
  assert.equal($('p[id]').length, 3)
  assert.equal(
    $('#code, #escaped, #middle, #terminal-code, #terminal-escaped').length,
    0
  )
  assert.equal($('figure img').attr('alt'), 'Alt {#alt}')
  assert.match($('pre').text(), /::anchor\{#fenced\}/)
  assert.equal($('span').text(), '{#expression}')
  assert.equal($('#heading').text(), 'Heading')
})

test('prefix IDs address tight unordered, ordered and nested list items without wrappers', async (t) => {
  const html = await render(
    t,
    [
      '- {#Stable_Item-42} A **bold** item.',
      '  - {#nested-item} Nested `code`.',
      '- {#second-item} Second item.',
      '',
      '1. {#ordered-item} Ordered item.',
      '2. {#ordered-second} Another item.'
    ].join('\n')
  )
  const $ = load(html)
  for (const [id, text] of [
    ['Stable_Item-42', 'A bold item.'],
    ['nested-item', 'Nested code.'],
    ['second-item', 'Second item.'],
    ['ordered-item', 'Ordered item.'],
    ['ordered-second', 'Another item.']
  ]) {
    assert.equal($(`li#${id}`).length, 1)
    assert.ok($(`li#${id}`).text().includes(text))
  }
  assert.equal($('ul > li#Stable_Item-42 > ul > li#nested-item').length, 1)
  assert.equal($('ol > li#ordered-item').length, 1)
  assert.equal($('#Stable_Item-42 > strong').text(), 'bold')
  assert.equal($('#nested-item > code').text(), 'code')
  assert.equal($('li').length, 5)
  assert.equal($('li p, li a[id]').length, 0)
  assert.doesNotMatch(html, /\{#/)
})

test('prefix item IDs coexist with trailing paragraph IDs and retain their real p host', async (t) => {
  const html = await render(
    t,
    '- {#item-id} Addressed **paragraph**. {#paragraph-id}\n- {#plain-item} Plain item.'
  )
  const $ = load(html)
  assert.equal($('li#item-id > p#paragraph-id').text(), 'Addressed paragraph.')
  assert.equal($('#paragraph-id strong').text(), 'paragraph')
  assert.equal($('#item-id').length, 1)
  assert.equal($('#paragraph-id').length, 1)
  assert.equal($('#plain-item').text().trim(), 'Plain item.')
  assert.equal($('li').length, 2)
  assert.equal($('li p p, li a[id]').length, 0)
})

test('prefix IDs accept the first paragraph after a retained MDX empty comment', async (t) => {
  const html = await render(
    t,
    '- {/* */}\n  {#after-comment} Readable **item**.\n- Neighbor.'
  )
  const $ = load(html)
  assert.equal($('li#after-comment').text().trim(), 'Readable item.')
  assert.equal($('#after-comment > strong').text(), 'item')
  assert.equal($('li p, li a[id]').length, 0)
  assert.equal($('li').length, 2)
})

test('non-list, non-leading, unseparated, escaped and code prefix markers stay literal', async (t) => {
  const html = await render(
    t,
    [
      '{#outside} Ordinary paragraph.',
      '',
      '- Before {#middle-item} text.',
      '- {#unseparated}Text.',
      '- `{#code-item}` Code.',
      '- \\{#escaped-item} Escaped.',
      '- **{#nested-marker}** Not leading.',
      '',
      '```md',
      '- {#fenced-item} Fenced.',
      '```'
    ].join('\n')
  )
  const $ = load(html)
  assert.equal($('p').first().text(), '{#outside} Ordinary paragraph.')
  assert.deepEqual(
    $('li')
      .map((_, item) => $(item).text())
      .get(),
    [
      'Before {#middle-item} text.',
      '{#unseparated}Text.',
      '{#code-item} Code.',
      '{#escaped-item} Escaped.',
      '{#nested-marker} Not leading.'
    ]
  )
  assert.equal($('li p, li a[id]').length, 0)
  assert.equal(
    $(
      '#outside, #middle-item, #unseparated, #code-item, #escaped-item, #nested-marker, #fenced-item'
    ).length,
    0
  )
  assert.match($('pre').text(), /- \{#fenced-item\} Fenced\./)
})

test('marker-only items retain their li IDs and ordinary flow expressions still execute', async (t) => {
  const html = await render(t, '- {#empty-item}\n- Neighbor.\n\n{2 + 3}')
  const $ = load(html)
  assert.equal($('li#empty-item').length, 1)
  assert.equal($('#empty-item').text(), '')
  assert.equal($('li').length, 2)
  assert.equal($('li p, li a[id]').length, 0)
  assert.ok($.root().text().includes('5'))
})

test('prefix item transformation preserves data and removes only one separating space', () => {
  const transform = remarkHeadingIds.call({ data: () => ({}) })
  const marker = (id) => ({ type: 'headingId', id, value: `{#${id}}` })
  const item = {
    type: 'listItem',
    data: { retained: true, hProperties: { className: ['retained'] } },
    children: [
      { type: 'mdxFlowExpression', value: '/* comment */' },
      {
        type: 'paragraph',
        children: [marker('Stable_ID'), { type: 'text', value: '  Text' }]
      }
    ]
  }
  const empty = {
    type: 'listItem',
    children: [{ type: 'paragraph', children: [marker('empty')] }]
  }
  const phrasing = {
    type: 'listItem',
    children: [
      {
        type: 'paragraph',
        children: [
          marker('phrasing'),
          { type: 'text', value: ' ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'Bold' }]
          }
        ]
      }
    ]
  }

  transform({ type: 'root', children: [item, empty, phrasing] })

  assert.deepEqual(item.data, {
    retained: true,
    hProperties: { className: ['retained'], id: 'Stable_ID' }
  })
  assert.deepEqual(item.children[1].children, [
    { type: 'text', value: ' Text' }
  ])
  assert.equal(item.spread, undefined)
  assert.equal(empty.data.hProperties.id, 'empty')
  assert.deepEqual(empty.children[0].children, [])
  assert.equal(phrasing.children[0].children[0].type, 'strong')
  assert.equal(phrasing.children[0].children.length, 1)
})

test('addressed image paragraphs keep their p host', async (t) => {
  const html = await render(
    t,
    '![Addressed](/image.png) {#image-block}\n\n## Unaddressed heading'
  )
  const $ = load(html)
  assert.equal($('p#image-block img').attr('alt'), 'Addressed')
  assert.equal($('a#standalone').length, 0)
  assert.equal($('h2').attr('id'), 'unaddressed-heading')
})

test('legacy HTML anchors, paragraphs and sections retain their semantics', async (t) => {
  const html = await render(
    t,
    '<a id="legacy"></a>\n\n## Legacy\n\n<a id="old-target"></a>\n\n## New {#new-target}\n\n<section id="native"><p id="native-p">Retained</p></section>'
  )
  const $ = load(html)
  assert.equal($('a#legacy').length, 1)
  assert.equal($('h2#legacy-2').text(), 'Legacy')
  assert.equal($('a#old-target').length, 1)
  assert.equal($('h2#new-target').text(), 'New')
  assert.equal($('section#native p#native-p').text(), 'Retained')
})

test('ordinary colon prose and unknown inline directives remain literal', async (t) => {
  const text = 'At 12:00 ask :Martin about :note[labels]{#example}.'
  const html = await render(t, text)
  const $ = load(html)
  assert.equal($('p').text(), text)
  assert.equal($('p[id]').length, 1)
})

test('colon prose preserves Markdown links and multiline quote prefixes', async (t) => {
  const html = await render(
    t,
    [
      'Read RFC:HTTP[spec](https://example.com).',
      '',
      '> Ask :note[one',
      '> two].',
      '',
      ':anchor[Label] is ordinary inline text.'
    ].join('\n')
  )
  const $ = load(html)
  assert.equal($('a').attr('href'), 'https://example.com')
  assert.equal($('a').text(), 'spec')
  assert.equal($('blockquote p').text(), 'Ask :note[one\ntwo].')
  assert.equal($('p').last().text(), ':anchor[Label] is ordinary inline text.')
})

test('paragraph targets survive normalization inside native phrasing hosts', async (t) => {
  const html = await render(
    t,
    [
      '<li>',
      '',
      'Text {#list-target}',
      '',
      '</li>',
      '',
      '<span>',
      '',
      'Inline text {#span-target}',
      '',
      '</span>'
    ].join('\n')
  )
  const $ = load(html)
  assert.equal($('li span#list-target').text(), 'Text')
  assert.equal($('span span#span-target').text(), 'Inline text')
  assert.equal($('li p, span p').length, 0)
})

const malformed = [
  ['::anchor{#target}', /Retired anchor directive/],
  ['::anchor', /Retired anchor directive/],
  ['::anchor[label]{#target}', /Retired anchor directive/],
  ['::anchor[]{#target}', /Retired anchor directive/],
  ['::anchor{#one #two}', /Retired anchor directive/],
  ['::anchor{#target .class}', /Retired anchor directive/],
  ['::anchor{#bad.id}', /Retired anchor directive/],
  [':::callout[label]{#target}\nText\n:::', /Invalid callout directive/],
  [':::callout{#target title="extra"}\nText\n:::', /Invalid callout directive/],
  [':::callout{#target}\nText', /Unclosed callout directive/],
  [
    '::::callout{#outer}\n:::callout{#inner}\nText\n:::',
    /Unclosed callout directive/
  ],
  [':::anchor{#target}\nText\n:::', /Retired anchor directive/],
  ['::callout{#target}', /Unsupported directive/],
  ['::unknown[Do not discard]{#target}', /Unsupported directive/]
]

for (const [body, error] of malformed) {
  test(`rejects malformed directive: ${body.split('\n')[0]}`, async (t) => {
    await assert.rejects(render(t, body), error)
  })
}
