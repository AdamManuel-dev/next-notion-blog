/**
 * Layout wiring for the MDX content pipeline.
 *
 * The reader layout is a `.tsx` module with CSS-module and child-component
 * imports, so it cannot be imported by `--experimental-strip-types` directly.
 * These tests transpile it once with the repo's TypeScript, swap every import
 * except React for a small stub, and server-render the result — which keeps
 * the assertions about real rendered markup instead of regex guesses.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const root = fileURLToPath(new URL('..', import.meta.url))
const componentPath = path.join(root, 'components', 'LocalPage.tsx')
const source = fs.readFileSync(componentPath, 'utf8')

/**
 * Stubs stand in for every dependency of the layout: child components render
 * the props the layout hands them so they can be asserted, and the data
 * helpers stay transparent so only the layout's own wiring is under test.
 */
const stubs = `
const styles = new Proxy({}, { get: (_target, key) => String(key) })
const Head = ({ children }) => React.createElement('head-stub', null, children)
const Link = ({ href, children }) => React.createElement('a', { href }, children)
const prepareLocalArticle = (html) => ({ html, entries: [] })
const selectRelatedPages = (_page, candidates) => candidates
const useDarkMode = () => ({ value: false, toggle: () => {} })
const ArticleOutline = () => null
const Footer = () => null
const FootnotePreview = () => null
const ImageReveal = ({ children }) => children
const LocalReaderHeader = ({ rootPageId }) =>
  React.createElement('header', { 'data-root-page-id': rootPageId ?? '' })
const ReaderDelight = () => null
const ReadingResume = () => null
const RelatedArticles = ({ pages }) =>
  React.createElement(
    'nav',
    { id: 'related' },
    pages.map((entry) =>
      React.createElement('a', { key: entry.id, href: entry.href }, entry.title)
    )
  )
`

const importPattern = /^import\s[\s\S]*?from\s*['"]([^'"]+)['"];?$/gm

function compileLayout() {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext
    },
    fileName: componentPath
  })

  const withoutDependencies = outputText.replace(
    importPattern,
    (statement, specifier) =>
      specifier === 'react' || specifier === 'react/jsx-runtime'
        ? statement
        : ''
  )

  // Written next to the repo's `node_modules` so `react` still resolves.
  const directory = path.join(root, 'node_modules', '.cache', 'mdx-layout')
  fs.mkdirSync(directory, { recursive: true })
  const file = path.join(directory, `local-page.${process.pid}.mjs`)
  fs.writeFileSync(file, `${stubs}\n${withoutDependencies}`)
  return file
}

const compiledFile = compileLayout()
// The compiled module owns its own React import; the tests share this one.
const { default: React } = await import('react')
const { LocalPage } = await import(`file://${compiledFile}`)
test.after(() => fs.rmSync(compiledFile, { force: true }))

const home = {
  id: 'home0000000000000000000000000000',
  slug: 'home',
  title: 'Dev Blog',
  description: 'Frontmatter home description.',
  type: 'home',
  tags: [],
  order: 0,
  html: '<p>Welcome.</p>',
  cover: null,
  icon: '⚡',
  coverPosition: 0.5,
  sourceUrl: null
}

const article = {
  id: 'post1000000000000000000000000000',
  slug: 'second-post',
  title: 'Second Post',
  description: 'Frontmatter article description.',
  type: 'post',
  tags: ['testing'],
  order: 2,
  html: '<p>Body copy.</p>',
  cover: null,
  icon: null,
  coverPosition: 0.5,
  sourceUrl: null
}

/** The static index ships metadata only, never rendered content. */
const summary = (page) =>
  Object.fromEntries(
    ['id', 'slug', 'title', 'description', 'type', 'tags', 'order'].map(
      (key) => [key, page[key]]
    )
  )

const note = {
  id: 'note1000000000000000000000000000',
  slug: 'a-note',
  title: 'A Note',
  description: 'A note.',
  type: 'note',
  tags: [],
  order: 1
}

const firstPost = {
  id: 'post0000000000000000000000000000',
  slug: 'first-post',
  title: 'First Post & Friends',
  description: 'First.',
  type: 'post',
  tags: [],
  order: 1
}

const pages = [summary(home), note, firstPost, summary(article)]

const render = (props) =>
  renderToStaticMarkup(React.createElement(LocalPage, props))

test('the homepage lists engineering articles inside the article, before the body', () => {
  const markup = render({ page: home, isHome: true, pages })
  const articleElement = markup.slice(
    markup.indexOf('<article'),
    markup.indexOf('</article>')
  )

  // Same structure as the markup this section replaced, and it comes first,
  // directly inside the article element, immediately before the body.
  assert.ok(
    articleElement.includes(
      '<section id="engineering-articles"><h2>Engineering articles</h2><ul>' +
        '<li><a href="/first-post">First Post &amp; Friends</a></li>' +
        '<li><a href="/second-post">Second Post</a></li>' +
        '</ul></section><p>Welcome.</p>'
    ),
    articleElement
  )

  // Metadata driven: posts only, ordered by `order` with slug as tie-break.
  const section = articleElement.slice(
    articleElement.indexOf('<section id="engineering-articles"')
  )
  assert.ok(!section.includes('/a-note'))
  assert.ok(!section.includes('"/home"'))
})

test('articles never render the homepage section', () => {
  const markup = render({ page: article, isHome: false, pages })
  assert.ok(!markup.includes('engineering-articles'))
  assert.ok(markup.includes('<p>Body copy.</p>'))
})

test('frontmatter descriptions drive the document meta description', () => {
  assert.match(
    render({ page: home, isHome: true, pages }),
    /<meta name="description" content="Frontmatter home description\."/
  )
  assert.match(
    render({ page: article, isHome: false, pages }),
    /<meta name="description" content="Frontmatter article description\."/
  )
})

test('pages without a description keep the existing text fallback', () => {
  const markup = render({
    page: { ...article, description: undefined, html: '<p>Derived text.</p>' },
    isHome: false,
    pages
  })
  assert.match(markup, /<meta name="description" content="Derived text\."/)

  const homeMarkup = render({
    page: { ...home, description: undefined },
    isHome: true,
    pages
  })
  assert.match(
    homeMarkup,
    /<meta name="description" content="Notes and articles by Adam Manuel\."/
  )
})

test('the root page is found through its type, not a hardcoded slug', () => {
  const markup = render({ page: article, isHome: false, pages })
  assert.match(markup, /data-root-page-id="home0000000000000000000000000000"/)

  // Legacy fixtures without metadata still resolve through the old slug.
  const legacy = [
    {
      id: 'legacyroot00000000000000000000aa',
      slug: 'adam-manuel-s-dev-blog',
      title: 'Dev Blog'
    },
    { id: 'legacypost0000000000000000000abb', slug: 'other', title: 'Other' }
  ]
  const legacyMarkup = render({
    page: { ...article, description: undefined, type: undefined },
    isHome: false,
    pages: legacy
  })
  assert.match(
    legacyMarkup,
    /data-root-page-id="legacyroot00000000000000000000aa"/
  )
})

test('related reading excludes the home page in both metadata and legacy indexes', () => {
  const markup = render({ page: article, isHome: false, pages })
  const related = markup.slice(markup.indexOf('<nav id="related"'))
  assert.ok(!related.includes('href="/home"'))
  assert.ok(related.includes('href="/a-note"'))
  assert.ok(related.includes('href="/first-post"'))

  const legacy = [
    {
      id: 'legacyroot00000000000000000000aa',
      slug: 'adam-manuel-s-dev-blog',
      title: 'Dev Blog'
    },
    { id: 'legacypost0000000000000000000abb', slug: 'other', title: 'Other' }
  ]
  const legacyMarkup = render({
    page: { ...article, type: undefined },
    isHome: false,
    pages: legacy
  })
  const legacyRelated = legacyMarkup.slice(
    legacyMarkup.indexOf('<nav id="related"')
  )
  assert.ok(!legacyRelated.includes('adam-manuel-s-dev-blog'))
  assert.ok(legacyRelated.includes('href="/other"'))
})

test('the full index stays metadata driven and a null sourceUrl drops the original link', () => {
  const markup = render({ page: home, isHome: true, pages })
  for (const entry of pages) {
    assert.ok(
      markup.includes(`>${entry.title.replace('&', '&amp;')}<`),
      entry.slug
    )
  }
  assert.ok(!markup.includes('Original'))

  const withSource = render({
    page: { ...article, sourceUrl: 'https://www.notion.so/example' },
    isHome: false,
    pages
  })
  assert.ok(withSource.includes('https://www.notion.so/example'))
})

test('the layout documents its content as build-time MDX, not sanitized HTML', () => {
  assert.match(source, /MDX compiled to static HTML at build time/)
  assert.ok(!/pre-sanitized/.test(source))
  // Metadata is optional so existing fixtures keep type-checking.
  assert.match(source, /type\?: 'home' \| 'post' \| 'note'/)
  assert.match(source, /sourceUrl\?: string \| null/)
})
