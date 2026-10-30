import assert from 'node:assert/strict'
import test from 'node:test'
import { searchLocalPages } from '../lib/local-search.ts'
import { getLocalPages } from '../lib/local-content.ts'

const page = (id, title, slug = id) => ({ id, title, slug })
const pages = [
  page('home', 'Adam Manuel’s Dev Blog', 'adam-manuel-s-dev-blog'),
  page('mongo', 'MongoDB indexes'),
  page('schema', 'Schema design for MongoDB'),
  page('css', 'CSS layouts'),
  page('cafe', 'Café notes'),
  page('japanese', '日本語の記事')
]

test('every exported article is discoverable by its full title without a search service', () => {
  const index = getLocalPages()
  for (const entry of index)
    assert.ok(
      searchLocalPages(entry.title, index).some(
        (result) => result.id === entry.id
      ),
      `${entry.slug} is searchable`
    )
})

test('local search ignores blank queries and returns no unrelated matches', () => {
  assert.deepEqual(searchLocalPages(' \t\n ', pages), [])
  assert.deepEqual(searchLocalPages('unpublished topic', pages), [])
})

test('local search is case and whitespace insensitive and requires every query term', () => {
  assert.deepEqual(searchLocalPages('  MONGODB   indexes ', pages), [
    { id: 'mongo', title: 'MongoDB indexes', href: '/mongo' }
  ])
  assert.deepEqual(searchLocalPages('indexes mongodb', pages), [
    { id: 'mongo', title: 'MongoDB indexes', href: '/mongo' }
  ])
  assert.equal(searchLocalPages('mongodb css', pages).length, 0)
})

test('local search supports accented and non-Latin titles', () => {
  assert.equal(searchLocalPages('cafe', pages)[0].id, 'cafe')
  assert.equal(searchLocalPages('日本語', pages)[0].id, 'japanese')
})

test('local search ranks exact and prefix titles ahead of substring matches', () => {
  const matches = searchLocalPages('MongoDB', [
    page('schema', 'Schema design for MongoDB'),
    page('indexes', 'MongoDB indexes'),
    page('exact', 'MongoDB')
  ])
  assert.deepEqual(
    matches.map((item) => item.id),
    ['exact', 'indexes', 'schema']
  )
})

test('local search deduplicates page aliases and rejects unsafe or empty entries', () => {
  const matches = searchLocalPages('notes', [
    page('aa-bb', 'Notes', 'notes'),
    page('aabb', 'Notes duplicate', 'duplicate'),
    page('bad', 'Notes', '//outside.example'),
    page('traversal', 'Notes', '../private'),
    page('blank', ' ', 'blank')
  ])
  assert.deepEqual(matches, [{ id: 'aa-bb', title: 'Notes', href: '/notes' }])
})

test('local search maps the home entry to the canonical root route', () => {
  assert.equal(searchLocalPages('Adam', pages)[0].href, '/')
  assert.equal(
    searchLocalPages(
      'Custom',
      [page('aa-bb', 'Custom home', 'custom')],
      'aabb'
    )[0].href,
    '/'
  )
})

test('local search limits results without changing the supplied index', () => {
  const input = Array.from({ length: 30 }, (_, i) =>
    page(`page-${i}`, `Notes ${i}`)
  )
  const snapshot = JSON.stringify(input)
  assert.equal(searchLocalPages('Notes', input).length, 20)
  assert.equal(JSON.stringify(input), snapshot)
})
