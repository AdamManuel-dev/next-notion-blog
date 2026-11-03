import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { load } from 'cheerio'

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

test('heading markers preserve literal image alt text and nonbreaking spaces', async () => {
  const { root } = makeContent({
    '': home(),
    note: page(
      { slug: 'literal-heading-markers' },
      [
        '',
        '![Read {#prose-alt}](/image.png)',
        '',
        '## ![Heading {#nested-alt}](/image.png) {#image-heading}',
        '',
        '## Heading\u00a0{#nbsp-heading}'
      ].join('\n')
    )
  })
  try {
    const rendered = await getLocalPage('literal-heading-markers', { root })
    const $ = load(rendered.html)
    assert.equal($('figure img').attr('alt'), 'Read {#prose-alt}')
    assert.equal($('#image-heading img').attr('alt'), 'Heading {#nested-alt}')
    assert.equal($('#nbsp-heading').text(), 'Heading\u00a0')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('multiline retained HTML paragraphs render without nested or empty paragraphs', async () => {
  const { root } = makeContent({
    '': home(),
    note: page(
      { slug: 'retained-paragraph' },
      [
        '',
        'First outside.',
        '',
        'Second outside.',
        '',
        '<details open>',
        '<summary>More</summary>',
        '<section id="description">',
        '<p>',
        'A **bold** value',
        'with `inline` code.',
        '</p>',
        '</section>',
        '</details>'
      ].join('\n')
    )
  })
  try {
    const rendered = await getLocalPage('retained-paragraph', { root })
    assert.doesNotMatch(rendered.html, /<p>\s*<p\b/)
    const $ = load(rendered.html)
    assert.equal($('p').length, 3, 'ordinary Markdown paragraphs remain intact')
    assert.equal($('p:empty').length, 0)
    assert.equal($('#description p').length, 1)
    assert.equal($('#description strong').text(), 'bold')
    assert.equal($('#description code').text(), 'inline')
    assert.equal(
      $('#description').text().replace(/\s+/g, ' ').trim(),
      'A bold value with inline code.'
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('retained HTML lists stay tight without changing explicit or Markdown paragraphs', async () => {
  const { root } = makeContent({
    '': home(),
    note: page(
      { slug: 'retained-list' },
      [
        '',
        '<ul id="retained-list">',
        '<li>',
        'A **bold** item.',
        '</li>',
        '<li>',
        '<p>Explicit paragraph</p>',
        '<ul><li>',
        'Nested `inline` item.',
        '</li></ul>',
        '</li>',
        '</ul>',
        '',
        '- First loose item.',
        '',
        '- Second loose item.'
      ].join('\n')
    )
  })
  try {
    const rendered = await getLocalPage('retained-list', { root })
    const $ = load(rendered.html)
    assert.equal($('#retained-list > li').first().find('p').length, 0)
    assert.equal($('#retained-list strong').text(), 'bold')
    assert.equal($('#retained-list ul li p').length, 0)
    assert.equal($('#retained-list code').text(), 'inline')
    assert.equal($('#retained-list > li > p').text(), 'Explicit paragraph')
    assert.equal($('body > ul').last().find('li > p').length, 2)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('formatted native headings and inline HTML keep phrasing children', async () => {
  for (const host of ['h2', 'a', 'em', 'strong', 'span', 'code']) {
    const { root } = makeContent({
      '': home(),
      note: page(
        { slug: 'phrasing-host' },
        `<${host} id="phrasing">\nOne **bold** value\non two lines.\n</${host}>`
      )
    })
    try {
      const rendered = await getLocalPage('phrasing-host', { root })
      const $ = load(rendered.html)
      assert.equal($('#phrasing p').length, 0, host)
      assert.equal($('#phrasing strong').text(), 'bold', host)
      assert.equal(
        $('#phrasing').text().replace(/\s+/g, ' ').trim(),
        'One bold value on two lines.',
        host
      )
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }
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
  assert.match(html, /<table\b/, 'GFM tables')
  assert.match(html, /<del>strikethrough<\/del>/, 'GFM strikethrough')
  assert.match(html, /type="checkbox"/, 'GFM task lists')
  assert.match(html, /<details>[\s\S]*<summary>More<\/summary>/, 'disclosures')
  assert.match(html, /<h2 id="legacy-anchor">Preserved heading<\/h2>/)
  assert.match(html, /id="user-content-fn-1"|footnotes/, 'GFM footnotes')
  assert.match(html, /<a href="\/other">link<\/a>/)
  assert.doesNotMatch(html, /^---/m, 'frontmatter never reaches the output')

  // The compiler supplies readable IDs; the article layout leaves them alone.
  const article = prepareLocalArticle(html)
  assert.ok(article.html.includes('id="legacy-anchor"'))
  assert.match(article.html, /<h2 id="intro">Intro<\/h2>/)
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
    'fragmentAliases',
    'html',
    'icon',
    'id',
    'liveBlocks',
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

test('sidecar aliases resolve to automatic heading IDs without empty anchors', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'folded', id: '1234567890abcdef1234567890abcdef' },
      [
        '',
        '## Intro with *emphasis*, a [link](/other) and `code`',
        '',
        'Body text.',
        '',
        '### Details',
        '',
        '#### Plain fallback',
        ''
      ].join('\n')
    )
  })
  fs.writeFileSync(
    path.join(root, 'content/fragment-aliases.json'),
    JSON.stringify({
      version: 1,
      pages: {
        '1234567890abcdef1234567890abcdef': {
          'intro-with-emphasis-a-link-and-code': [
            'block-anchor',
            'stale-heading-id',
            'intro-7f3c'
          ],
          details: ['details-9a1b']
        }
      }
    })
  )
  const { html, fragmentAliases } = await getLocalPage('folded', { root })
  const $ = load(html)

  assert.equal($('h2').attr('id'), 'intro-with-emphasis-a-link-and-code')
  assert.equal($('h3').attr('id'), 'details')
  assert.equal($('h4').attr('id'), 'plain-fallback')
  assert.deepEqual(fragmentAliases, {
    'block-anchor': 'intro-with-emphasis-a-link-and-code',
    'stale-heading-id': 'intro-with-emphasis-a-link-and-code',
    'intro-7f3c': 'intro-with-emphasis-a-link-and-code',
    'details-9a1b': 'details'
  })
  assert.equal($('h2 em').text(), 'emphasis')
  assert.equal($('h2 a[href="/other"]').text(), 'link')
  assert.equal($('h2 code').text(), 'code')

  // Historical aliases live only in the sidecar, never as empty DOM anchors.
  assert.equal($('a#intro-7f3c').length, 0, 'the folded anchor is removed')
  assert.equal($('a#details-9a1b').length, 0)
  assert.equal($('a#block-anchor').length, 0)
  assert.equal($('a#stale-heading-id').length, 0)

  const article = prepareLocalArticle(html)
  assert.deepEqual(
    article.entries.map((entry) => [entry.href, entry.text]),
    [
      [
        '#intro-with-emphasis-a-link-and-code',
        'Intro with emphasis, a link and code'
      ],
      ['#details', 'Details'],
      ['#plain-fallback', 'Plain fallback']
    ]
  )
  assert.match(article.html, /<h2 id="intro-with-emphasis-a-link-and-code"/)
  assert.match(article.html, /<h4 id="plain-fallback">Plain fallback<\/h4>/)
})

test('authored links and native id-only anchors retain their HTML semantics', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'untouched-anchors' },
      [
        '',
        '<a id="linked" href="/elsewhere"></a>',
        '',
        '## Href anchor',
        '',
        '<a id="labelled">Back to top</a>',
        '',
        '## Nonempty anchor',
        '',
        '<a id="tracked" className="jump"></a>',
        '',
        '## Extra attribute anchor',
        '',
        '<a id=""></a>',
        '',
        '## Empty id anchor',
        '',
        '<a id="before-native"></a>',
        '',
        '<h2 id="native-heading">Native heading</h2>',
        '',
        '<a id="fenced"></a>',
        '',
        '```html',
        '<a id="in-fence"></a>',
        '',
        '## Not a heading',
        '```',
        ''
      ].join('\n')
    )
  })
  const { html, fragmentAliases } = await getLocalPage('untouched-anchors', {
    root
  })
  const $ = load(html)

  for (const id of ['linked', 'labelled', 'tracked']) {
    assert.equal($(`a#${id}`).length, 1, `${id} anchor survives`)
  }
  assert.equal($('a[href="/elsewhere"]').attr('id'), 'linked')
  assert.equal($('a#labelled').text(), 'Back to top')
  assert.equal($('a#tracked').attr('class'), 'jump')
  assert.equal($('h2#native-heading').text(), 'Native heading')

  const ids = $('h2')
    .map((_, element) => $(element).attr('id'))
    .get()
  assert.deepEqual(ids, [
    'href-anchor',
    'nonempty-anchor',
    'extra-attribute-anchor',
    'empty-id-anchor',
    'native-heading'
  ])
  assert.deepEqual(fragmentAliases, {})
  assert.equal($('a#before-native').length, 1)
  assert.equal($('a#fenced').length, 1)
  assert.equal($('pre code').text().includes('<a id="in-fence"></a>'), true)
  assert.equal($('pre code').text().includes('## Not a heading'), true)
})

test('a standalone markdown image renders as a lazy figure', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'images' },
      [
        '',
        '![Alt text](/photo.png "Title text")',
        '',
        'Inline ![badge](/badge.svg) inside a sentence.',
        '',
        '[![linked](/linked.png)](/elsewhere)',
        ''
      ].join('\n')
    )
  })
  const { html } = await getLocalPage('images', { root })
  const $ = load(html)

  assert.equal($('figure').length, 1)
  assert.equal($('figure').attr('class'), undefined, 'figures carry no attrs')
  assert.equal($('figure > img').length, 1)
  assert.equal($('figure img').attr('src'), '/photo.png')
  assert.equal($('figure img').attr('alt'), 'Alt text')
  assert.equal($('figure img').attr('title'), 'Title text')
  assert.equal($('figure img').attr('loading'), 'lazy')
  assert.equal($('figure p').length, 0, 'the paragraph became the figure')

  // Images sharing a paragraph keep their inline semantics.
  assert.equal($('p img[src="/badge.svg"]').length, 1)
  assert.equal($('p a[href="/elsewhere"] img').length, 1)
  assert.equal($('p:has(img)').length, 2)
})

test('markdown images keep authored figures and native img attributes', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'authored-images' },
      [
        '',
        '<figure id="captioned">',
        '',
        '![Captioned](/captioned.png)',
        '',
        '<figcaption>A caption</figcaption>',
        '</figure>',
        '',
        '<img id="hero" src="/hero.png" alt="Hero" loading="eager" />',
        '',
        '<p id="explicit">',
        '',
        '![Inside a paragraph](/inside.png)',
        '',
        '</p>',
        ''
      ].join('\n')
    )
  })
  const { html } = await getLocalPage('authored-images', { root })
  const $ = load(html)

  assert.equal($('#captioned').length, 1)
  assert.equal($('#captioned figure').length, 0, 'no figure inside a figure')
  assert.equal($('#captioned > img').attr('src'), '/captioned.png')
  assert.equal($('#captioned > img').attr('loading'), 'lazy')
  assert.equal($('#captioned p').length, 0)
  assert.equal($('#captioned figcaption').text(), 'A caption')

  assert.equal($('#hero').attr('loading'), 'eager', 'native images are kept')
  assert.equal($('figure #hero').length, 0)

  assert.equal($('#explicit').prop('tagName'), 'P')
  assert.equal($('#explicit figure').length, 0, 'no block figure inside a p')
  assert.equal($('#explicit img').attr('src'), '/inside.png')
})

test('a trailing {#id} marker becomes the heading id for every level', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'heading-ids' },
      [
        '',
        '# Top {#top_level-1}',
        '',
        '## Intro with *emphasis*, a [link](/other) and `code` {#intro-7f3c}',
        '',
        'Body text.',
        '',
        '### Details   {#details-9a1b}',
        '',
        '#### Fourth {#a044322d56d1482da8b521736d56284c}',
        '',
        '##### Fifth {#fifth}',
        '',
        '###### Sixth {#sixth}',
        '',
        'Setext heading {#setext-id}',
        '===',
        '',
        '## Plain fallback',
        ''
      ].join('\n')
    )
  })
  const { html } = await getLocalPage('heading-ids', { root })
  const $ = load(html)

  assert.equal($('h1').first().attr('id'), 'top_level-1')
  assert.equal($('h2').first().attr('id'), 'intro-7f3c')
  assert.equal($('h3').attr('id'), 'details-9a1b')
  assert.equal($('h4').attr('id'), 'a044322d56d1482da8b521736d56284c')
  assert.equal($('h5').attr('id'), 'fifth')
  assert.equal($('h6').attr('id'), 'sixth')
  assert.equal($('h1').last().attr('id'), 'setext-id', 'setext headings too')
  assert.equal(
    $('h2').last().attr('id'),
    'plain-fallback',
    'automatic heading ID'
  )

  // Inline formatting survives, and the marker leaves no trace in the text.
  assert.equal($('h2').first().find('em').text(), 'emphasis')
  assert.equal($('h2').first().find('a[href="/other"]').text(), 'link')
  assert.equal($('h2').first().find('code').text(), 'code')
  assert.equal(
    $('h2').first().text(),
    'Intro with emphasis, a link and code',
    'no marker text and no trailing space'
  )
  assert.equal($('h3').text(), 'Details', 'padding before the marker is gone')
  assert.doesNotMatch(html, /\{#/, 'no marker survives in heading output')

  const article = prepareLocalArticle(html)
  assert.deepEqual(
    article.entries.map((entry) => [entry.href, entry.text]),
    [
      ['#top_level-1', 'Top'],
      ['#intro-7f3c', 'Intro with emphasis, a link and code'],
      ['#details-9a1b', 'Details'],
      ['#a044322d56d1482da8b521736d56284c', 'Fourth'],
      ['#fifth', 'Fifth'],
      ['#sixth', 'Sixth'],
      ['#setext-id', 'Setext heading'],
      ['#plain-fallback', 'Plain fallback']
    ]
  )
  assert.match(article.html, /<h2 id="intro-7f3c"/)
  assert.match(article.html, /<h2 id="plain-fallback">Plain fallback<\/h2>/)
})

test('{#id} markers work inside blockquotes and alongside sidecar aliases', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'heading-id-contexts', id: '1234567890abcdef1234567890abcdef' },
      [
        '',
        '> ## Quoted heading {#quoted-1a2b}',
        '>',
        '> Quoted body.',
        '',
        '## Folded anchor',
        '',
        '## Marked heading {#marked-3c4d}',
        '',
        '<details>',
        '',
        '## Nested in JSX {#nested-5e6f}',
        '',
        '</details>',
        ''
      ].join('\n')
    )
  })
  fs.writeFileSync(
    path.join(root, 'content/fragment-aliases.json'),
    JSON.stringify({
      version: 1,
      pages: {
        '1234567890abcdef1234567890abcdef': {
          'folded-anchor': ['legacy-anchor']
        }
      }
    })
  )
  const { html, fragmentAliases } = await getLocalPage('heading-id-contexts', {
    root
  })
  const $ = load(html)

  assert.equal($('blockquote h2').attr('id'), 'quoted-1a2b')
  assert.equal($('blockquote h2').text(), 'Quoted heading')
  assert.equal($('h2#folded-anchor').text(), 'Folded anchor')
  assert.equal(fragmentAliases['legacy-anchor'], 'folded-anchor')
  assert.equal($('h2#marked-3c4d').text(), 'Marked heading')
  assert.equal($('details h2').attr('id'), 'nested-5e6f')
  assert.equal($('details h2').text(), 'Nested in JSX')
})

test('{#id} is only heading syntax: code, escapes and prose keep it literal', async () => {
  const { root } = makeContent({
    '': home(),
    post: page(
      { slug: 'heading-id-literals' },
      [
        '',
        '```md',
        '## Fenced heading {#fenced-id}',
        '```',
        '',
        '~~~md',
        '## Tilde fenced heading {#tilde-id}',
        '~~~',
        '',
        '> ```md',
        '> ## Quoted fence {#quoted-fence-id}',
        '> ```',
        '',
        'Inline `{#inline-id}` stays code.',
        '',
        '## Heading with `{#code-id}` inside',
        '',
        '## Escaped \\{#escaped-id} marker',
        '',
        '## Marker {#mid-id} in the middle',
        '',
        'A paragraph mentioning {#prose-id} literally.',
        '',
        '## Expression {1 + 1} heading',
        ''
      ].join('\n')
    )
  })
  const { html } = await getLocalPage('heading-id-literals', { root })
  const $ = load(html)

  const fences = $('pre code')
    .map((_, element) => $(element).text())
    .get()
  assert.equal(fences.length, 3)
  assert.ok(fences[0].includes('## Fenced heading {#fenced-id}'))
  assert.ok(fences[1].includes('## Tilde fenced heading {#tilde-id}'))
  assert.ok(fences[2].includes('## Quoted fence {#quoted-fence-id}'))
  assert.equal($('p code').first().text(), '{#inline-id}')

  const marked = $('h2')
    .map((_, element) => [[$(element).text(), $(element).attr('id')]])
    .get()
  assert.deepEqual(marked, [
    ['Heading with {#code-id} inside', 'heading-with-code-id-inside'],
    ['Escaped {#escaped-id} marker', 'escaped-escaped-id-marker'],
    ['Marker {#mid-id} in the middle', 'marker-mid-id-in-the-middle'],
    ['Expression 2 heading', 'expression-heading']
  ])
  assert.equal($('h2 code').text(), '{#code-id}')
  assert.ok(
    $('p')
      .map((_, element) => $(element).text())
      .get()
      .includes('A paragraph mentioning {#prose-id} literally.')
  )
})
