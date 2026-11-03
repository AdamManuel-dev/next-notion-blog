import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { load } from 'cheerio'

import { getLocalPage, readContentIndex } from '../lib/mdx-content.mjs'
import { extractLiveBlocks } from '../lib/live-blocks.mjs'

function fixture(body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'live-block-content-'))
  const directory = path.join(root, 'content')
  fs.mkdirSync(directory)
  fs.writeFileSync(
    path.join(directory, 'index.mdx'),
    `---\ntitle: Live fixture\nslug: live-fixture\ndescription: Fixture\ntype: home\ntags: []\norder: 0\n---\n${body}\n`
  )
  return root
}

const counter = "<Counter id='counter' />"

test('live blocks compile to addressed containers, escaped source and client keys', async () => {
  const root = fixture(counter)
  try {
    const page = await getLocalPage(undefined, { root })
    const $ = load(page.html)
    assert.equal(page.liveBlocks.length, 1)
    assert.equal($('#counter').attr('data-live-block'), page.liveBlocks[0].id)
    assert.equal($('#counter [data-live-mount]').length, 1)
    assert.equal($('#counter [data-live-mount]').text(), '')
    assert.equal(
      $('#counter [data-live-fallback]').text(),
      'Interactive example. Enable JavaScript to run it.'
    )
    assert.equal($('#counter details summary').text(), 'View source')
    assert.equal($('#counter details code').text(), counter + '\n')
    assert.equal($('button').length, 0, 'widget is not executed during SSR')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('formerly executable fences fail static compilation with migration guidance', async () => {
  const root = fixture(
    "```tsx live id=browser-only\nthrow new Error('never execute')\n``` "
  )
  try {
    await assert.rejects(
      () => getLocalPage(undefined, { root }),
      /Executable live fences.*registered component/
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('ordinary fences remain static examples and do not advertise live modules', async () => {
  const code = "throw new Error('Do not execute')"
  const root = fixture('```tsx\n' + code + '\n```')
  try {
    const page = await getLocalPage(undefined, { root })
    const $ = load(page.html)
    assert.deepEqual(page.liveBlocks, [])
    assert.equal($('[data-live-block]').length, 0)
    assert.equal($('pre code').text(), code + '\n')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('historical aliases can target the static live container before mounting', async () => {
  const root = fixture(counter)
  try {
    const id = readContentIndex({ root }).home.id
    fs.writeFileSync(
      path.join(root, 'content', 'fragment-aliases.json'),
      JSON.stringify({
        version: 1,
        pages: { [id]: { counter: ['old-counter'] } }
      })
    )
    const page = await getLocalPage(undefined, { root })
    assert.equal(page.fragmentAliases['old-counter'], 'counter')
    assert.equal(load(page.html)('#counter').length, 1)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('registered JSX renders escaped original source, matching keys, without SSR execution', async () => {
  const source =
    '<Counter id="counter" initialCount={3} />\n\nBetween.\n\n<Diagram active={1} />'
  const root = fixture(source)
  try {
    const page = await getLocalPage(undefined, { root })
    const $ = load(page.html)
    assert.equal(page.liveBlocks.length, 2)
    const file = path.join(root, 'content', 'index.mdx')
    assert.deepEqual(
      page.liveBlocks,
      extractLiveBlocks(fs.readFileSync(file, 'utf8'), {
        pageId: readContentIndex({ root }).home.id,
        file
      }).map(({ id, moduleId, props }) => ({ id, moduleId, props }))
    )
    assert.equal($('#counter').attr('data-live-block'), page.liveBlocks[0].id)
    assert.equal(
      $('#counter details code').text(),
      '<Counter id="counter" initialCount={3} />\n'
    )
    assert.equal($('#counter details code').hasClass('language-jsx'), true)
    assert.equal($('button, svg, script').length, 0)
    assert.equal($('[data-live-mount]').length, 2)
    assert.doesNotMatch(page.html, /import Component/)
    assert.match(page.html, /&lt;Counter/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

for (const quoted of [false, true]) {
  test(`a ${
    quoted ? 'blockquoted' : 'plain'
  } callout can end with registered JSX`, async () => {
    const callout =
      ':::callout{#example}\n\n<Counter id="counter" initialCount={3} />\n:::'
    const root = fixture(
      quoted
        ? callout
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n')
        : callout
    )
    try {
      const page = await getLocalPage(undefined, { root })
      const $ = load(page.html)
      assert.equal(page.liveBlocks.length, 1)
      assert.equal(
        $('#example #counter').attr('data-live-block'),
        page.liveBlocks[0].id
      )
      assert.equal($('#example #counter [data-live-mount]').length, 1)
      assert.match(
        $('#example #counter details code').text(),
        /<Counter id="counter" initialCount=\{3\} \/>/
      )
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
}

for (const [slug, id, moduleId] of [
  ['react-live-counter', 'counter', 'Counter'],
  ['react-live-pipeline-diagram', 'pipeline', 'Diagram']
]) {
  test(`migrated ${slug} retains its interactive registration and permalink`, async () => {
    const page = await getLocalPage(slug)
    assert.ok(page)
    assert.equal(page.liveBlocks.length, 1)
    assert.deepEqual(page.liveBlocks[0], {
      id,
      moduleId,
      props: Object.create(null)
    })
    const $ = load(page.html)
    assert.equal($(`#${id} [data-live-mount]`).length, 1)
    assert.equal(
      $(`#${id} details code`).text(),
      `<${moduleId} id='${id}' />\n`
    )
    assert.equal($('button, svg, script').length, 0)
  })
}
