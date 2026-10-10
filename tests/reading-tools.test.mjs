import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseReadingPreferences,
  parseReadingPosition
} from '../lib/reading-storage.ts'
import { selectRelatedPages } from '../lib/related-pages.ts'

test('reading preferences tolerate missing, malformed and unsupported stored values', () => {
  for (const value of [null, 'broken', 'null', '{"size":900,"spacing":-1}'])
    assert.deepEqual(parseReadingPreferences(value), {
      size: 16,
      spacing: 1.65
    })
  assert.deepEqual(parseReadingPreferences('{"size":20,"spacing":1.85}'), {
    size: 20,
    spacing: 1.85
  })
})
test('resume data rejects expired, future, invalid and unsafe anchors', () => {
  const now = 40 * 86400000
  const position = {
    y: 1200,
    anchor: 'notion-block-' + 'a'.repeat(32),
    offset: -30,
    updated: now - 1000
  }
  assert.deepEqual(
    parseReadingPosition(JSON.stringify(position), now),
    position
  )
  for (const patch of [
    { y: -10 },
    { anchor: 'body > script' },
    { updated: 0 },
    { updated: now + 1 },
    { offset: null }
  ])
    assert.equal(
      parseReadingPosition(JSON.stringify({ ...position, ...patch }), now),
      null
    )
  assert.equal(parseReadingPosition('broken', now), null)
})
test('related articles rank shared topics, deduplicate and exclude self or unsafe URLs', () => {
  const pages = selectRelatedPages(
    { id: 'aa-bb', title: 'MongoDB shard keys' },
    [
      { id: 'aabb', title: 'This article', href: '/self' },
      { id: 'other', title: 'CSS layouts', href: '/css' },
      { id: 'mongo', title: 'MongoDB optimization', href: '/mongo' },
      { id: 'mongo', title: 'MongoDB optimization', href: '/mongo' },
      { id: 'bad', title: 'MongoDB', href: '//outside.example' },
      { id: 'shard', title: 'MongoDB shard performance', href: '/shard' }
    ]
  )
  assert.deepEqual(
    pages.map((p) => p.id),
    ['shard', 'mongo', 'other']
  )
})
