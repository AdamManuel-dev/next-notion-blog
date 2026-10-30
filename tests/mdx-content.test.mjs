import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import {
  getLocalPage,
  getLocalPages,
  getLocalPaths,
  readContentIndex
} from '../lib/mdx-content.mjs'
import { prepareLocalArticle } from '../lib/local-article-outline.ts'

/** Builds a throwaway content tree: `{ 'notes/deep': { frontmatter, body } }`. */
function makeContent(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdx-content-'))
  for (const [location, source] of Object.entries(files)) {
    const directory = path.join(root, 'content', location)
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, 'index.mdx'), source)
  }
  return { root }
}

const frontmatter = (fields) =>
  `---\n${Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n')}\n---\n`

const page = (fields, body = '\nHello.\n') =>
  frontmatter({
    title: 'Title',
    description: 'Description',
    type: 'post',
    tags: ['one'],
    order: 10,
    ...fields
  }) + body

const home = (fields = {}) =>
  page({
    title: 'Dev Blog',
    slug: 'dev-blog',
    type: 'home',
    order: 0,
    ...fields
  })

test('non-finite cover positions fail validation before props serialization', () => {
  for (const value of ['.nan', '.inf', '-.inf']) {
    const { root } = makeContent({
      '': home(),
      invalid: page({ slug: 'invalid' }).replace(
        'order: 10',
        `order: 10\ncoverPosition: ${value}`
      )
    })
    try {
      assert.throws(() => readContentIndex({ root }), /coverPosition/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }
})

test('content cannot overwrite static-export reserved routes', () => {
  for (const slug of ['index', '404', '500']) {
    const { root } = makeContent({ '': home(), invalid: page({ slug }) })
    try {
      assert.throws(
        () => readContentIndex({ root }),
        /reserved by static export/
      )
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }
})

test('metadata is validated and defaulted from the frontmatter contract', () => {
  const { root } = makeContent({
    '': home({ id: 'a044322d56d1482da8b521736d56284c' }),
    posts: page({ slug: 'new-post', cover: '/c.jpg', sourceUrl: null })
  })

  const [first, second] = getLocalPages({ root })
  assert.deepEqual(first, {
    id: 'a044322d56d1482da8b521736d56284c',
    slug: 'dev-blog',
    title: 'Dev Blog',
    description: 'Description',
    type: 'home',
    tags: ['one'],
    order: 0
  })
  assert.equal(second.slug, 'new-post')
  assert.deepEqual(second.tags, ['one'])
  assert.equal(second.type, 'post')

  const entry = readContentIndex({ root }).pages[1]
  assert.match(entry.id, /^[0-9a-f]{32}$/, 'new pages derive a stable id')
  assert.equal(entry.coverPosition, 0.5, 'coverPosition defaults to .5')
  assert.equal(entry.cover, '/c.jpg')
  assert.equal(entry.icon, null)
  assert.equal(entry.sourceUrl, null)

  // Derived ids are a pure function of the slug, so routes survive a rebuild.
  const { root: again } = makeContent({
    '': home(),
    elsewhere: page({ slug: 'new-post' })
  })
  assert.equal(readContentIndex({ root: again }).pages[1].id, entry.id)
})

test('malformed metadata is rejected with the offending file path', () => {
  const cases = [
    [{ slug: 'Bad Slug' }, /not URL safe/],
    [{ slug: 'ok', type: 'essay' }, /must be home, post or note/],
    [{ slug: 'ok', tags: 'one' }, /"tags" must be an array/],
    [{ slug: 'ok', order: 'first' }, /"order" must be a finite number/],
    [{ slug: 'ok', id: 'nope' }, /"id" must be 32 hex/],
    [{ slug: 'ok', coverPosition: 7 }, /"coverPosition" must be a number/],
    [{ slug: undefined }, /"slug" is required/]
  ]
  for (const [fields, expected] of cases) {
    const { root } = makeContent({ '': home(), broken: page(fields) })
    assert.throws(
      () => getLocalPages({ root }),
      (error) => {
        assert.match(error.message, expected)
        assert.match(error.message, /broken[/\\]index\.mdx/)
        return true
      }
    )
  }

  const missing = makeContent({ '': home(), broken: 'No frontmatter here.\n' })
  assert.throws(
    () => getLocalPages({ root: missing.root }),
    /missing YAML frontmatter/
  )
})

test('exactly one home page, and no duplicate ids, slugs or aliases', () => {
  const noHome = makeContent({ posts: page({ slug: 'a' }) })
  assert.throws(() => getLocalPages({ root: noHome.root }), /found 0/)

  const twoHomes = makeContent({ '': home(), other: home({ slug: 'other' }) })
  assert.throws(() => getLocalPages({ root: twoHomes.root }), /found 2/)

  const sameSlug = makeContent({
    '': home(),
    a: page({ slug: 'twin' }),
    b: page({ slug: 'twin' })
  })
  assert.throws(
    () => getLocalPages({ root: sameSlug.root }),
    /Duplicate route "twin"/
  )

  const sameId = makeContent({
    '': home(),
    a: page({ slug: 'a', id: 'a044322d56d1482da8b521736d56284c' }),
    b: page({ slug: 'b', id: 'a044322d56d1482da8b521736d56284c' })
  })
  assert.throws(() => getLocalPages({ root: sameId.root }), /Duplicate route/)

  // A slug may not impersonate another page's `slug-id` alias.
  const id = 'a044322d56d1482da8b521736d56284c'
  const aliasClash = makeContent({
    '': home(),
    a: page({ slug: 'twin', id }),
    b: page({ slug: `twin-${id}` })
  })
  assert.throws(
    () => getLocalPages({ root: aliasClash.root }),
    /Duplicate route/
  )
})

test('pages sort by order then slug, independent of their directory', () => {
  const { root } = makeContent({
    '': home(),
    'z/deep/nested': page({ slug: 'beta', order: 5 }),
    a: page({ slug: 'alpha', order: 5 }),
    m: page({ slug: 'later', order: 50 })
  })
  assert.deepEqual(
    getLocalPages({ root }).map((entry) => entry.slug),
    ['dev-blog', 'alpha', 'beta', 'later']
  )
})

test('nested pages keep their route when their file moves', async () => {
  const fields = { slug: 'moving-post', id: 'b47979352a204bf3b8c70925ec5082f9' }
  const before = makeContent({
    '': home(),
    'posts/2024': page(fields, '\nSame body.\n')
  })
  const after = makeContent({
    '': home(),
    'archive/deep/er': page(fields, '\nSame body.\n')
  })

  const first = await getLocalPage('moving-post', { root: before.root })
  const second = await getLocalPage('moving-post', { root: after.root })
  assert.deepEqual(
    getLocalPaths({ root: before.root }),
    getLocalPaths({ root: after.root })
  )
  assert.deepEqual(first, second)
})

test('legacy Notion aliases resolve, and the home page owns "/"', async () => {
  const id = 'a044322d56d1482da8b521736d56284c'
  const postId = '23910a0af920815e9d20f04397d7b13c'
  const { root } = makeContent({
    '': home({ id }),
    posts: page({ slug: 'express', id: postId })
  })

  const paths = getLocalPaths({ root })
  assert.equal(new Set(paths).size, paths.length, 'routes are unique')
  assert.deepEqual(paths, [
    id,
    'a044322d-56d1-482d-a8b5-21736d56284c',
    `dev-blog-${id}`,
    'express',
    postId,
    '23910a0a-f920-815e-9d20-f04397d7b13c',
    `express-${postId}`
  ])
  assert.ok(!paths.includes('dev-blog'), 'the home page is served at /')

  for (const identifier of paths) {
    assert.ok(
      await getLocalPage(identifier, { root }),
      `${identifier} resolves`
    )
  }
  // The home slug still resolves for direct lookups.
  assert.equal((await getLocalPage('dev-blog', { root })).id, id)
  // Home is found by `type: home`, not by a hardcoded id.
  assert.equal((await getLocalPage(undefined, { root })).slug, 'dev-blog')

  for (const unknown of ['missing', '../package.json', '/etc/passwd', '..']) {
    assert.equal(await getLocalPage(unknown, { root }), null)
  }
})

test('MDX renders real markdown semantics: GFM, disclosures and anchors', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'rendered' },
      [
        '',
        '## Intro',
        '',
        'Text with ~~strikethrough~~ and a [link](/other).',
        '',
        '| Feature | State |',
        '| ------- | ----- |',
        '| Tables  | yes   |',
        '',
        '- [x] task list',
        '',
        '<details>',
        '  <summary>More</summary>',
        '',
        '  Hidden prose.',
        '',
        '</details>',
        '',
        '<h2 id="legacy-anchor">Preserved heading</h2>',
        '',
        'Footnote reference[^1].',
        '',
        '[^1]: Footnote body.',
        ''
      ].join('\n')
    )
  })

  const { html } = await getLocalPage('rendered', { root })
  assert.match(html, /<table>/, 'GFM tables')
  assert.match(html, /<del>strikethrough<\/del>/, 'GFM strikethrough')
  assert.match(html, /type="checkbox"/, 'GFM task lists')
  assert.match(html, /<details>[\s\S]*<summary>More<\/summary>/, 'disclosures')
  assert.match(html, /<h2 id="legacy-anchor">Preserved heading<\/h2>/)
  assert.match(html, /id="user-content-fn-1"|footnotes/, 'GFM footnotes')
  assert.match(html, /<a href="\/other">link<\/a>/)
  assert.doesNotMatch(html, /^---/m, 'frontmatter never reaches the output')

  // The article layout adds anchors to headings that do not declare an id,
  // and leaves migrated ids alone.
  const article = prepareLocalArticle(html)
  assert.ok(article.html.includes('id="legacy-anchor"'))
  assert.match(article.html, /<h2 id="local-heading-1">Intro<\/h2>/)
})

test('MDX compile errors name the file', async () => {
  const { root } = makeContent({
    '': home(),
    broken: page({ slug: 'broken' }, '\n<Unclosed>\n')
  })
  await assert.rejects(getLocalPage('broken', { root }), (error) => {
    assert.match(error.message, /broken[/\\]index\.mdx/)
    assert.match(error.message, /failed to (compile|render) MDX/)
    return true
  })
})

test('page content serializes as static props', async () => {
  const { root } = makeContent({
    '': home({ icon: '⚡', cover: '/cover.jpg', coverPosition: 0.25 })
  })
  const page = await getLocalPage(undefined, { root })
  assert.deepEqual(JSON.parse(JSON.stringify(page)), page)
  assert.deepEqual(Object.keys(page).sort(), [
    'cover',
    'coverPosition',
    'description',
    'html',
    'icon',
    'id',
    'order',
    'slug',
    'sourceUrl',
    'tags',
    'title',
    'type'
  ])
  assert.equal(page.coverPosition, 0.25)
  assert.equal(page.icon, '⚡')
})
