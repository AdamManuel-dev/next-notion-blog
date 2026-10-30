import assert from 'node:assert/strict'
import test from 'node:test'
import { getArticleTableOfContents } from '../lib/article-table-of-contents.ts'

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const heading = (n, type = 'header', title = `Section ${n}`) => ({
  id: id(n),
  type,
  properties: { title: [[title]] }
})
function fixture(blocks) {
  return {
    page: { id: id(0), type: 'page', content: blocks.map((b) => b.id) },
    recordMap: {
      block: Object.fromEntries(blocks.map((b) => [b.id, { value: b }]))
    }
  }
}

test('TOC omits missing pages, missing data and articles with fewer than three headings', () => {
  assert.deepEqual(getArticleTableOfContents(null, null), [])
  assert.deepEqual(getArticleTableOfContents({ content: [id(1)] }, null), [])
  const { page, recordMap } = fixture([heading(1), heading(2)])
  assert.deepEqual(getArticleTableOfContents(page, recordMap), [])
  assert.equal(
    getArticleTableOfContents(page, recordMap, { minHeadings: 2 }).length,
    2
  )
})

test('empty headings do not count toward the minimum useful outline', () => {
  const { page, recordMap } = fixture([
    heading(1),
    heading(2),
    heading(3, 'header', '   ')
  ])
  assert.deepEqual(getArticleTableOfContents(page, recordMap), [])
})

test('TOC preserves article order and builds anchors matching rendered Notion heading IDs', () => {
  const { page, recordMap } = fixture([heading(3), heading(1), heading(2)])
  const entries = getArticleTableOfContents(page, recordMap)
  assert.deepEqual(
    entries.map((entry) => entry.text),
    ['Section 3', 'Section 1', 'Section 2']
  )
  assert.deepEqual(
    entries.map((entry) => entry.href),
    [3, 1, 2].map((n) => `#${id(n).replace(/-/g, '')}`)
  )
})

test('TOC normalizes skipped heading levels without mutating Notion records', () => {
  const { page, recordMap } = fixture([
    heading(1, 'sub_header'),
    heading(2, 'sub_sub_header'),
    heading(3),
    heading(4, 'sub_sub_header')
  ])
  const before = JSON.stringify(recordMap)
  assert.deepEqual(
    getArticleTableOfContents(page, recordMap).map(
      (entry) => entry.indentLevel
    ),
    [0, 1, 0, 1]
  )
  assert.equal(JSON.stringify(recordMap), before)
})

test('TOC includes column headings but excludes nested pages and unrelated records', () => {
  const h1 = heading(1)
  const h2 = heading(2, 'sub_header')
  const h3 = heading(3, 'sub_sub_header')
  const columns = { id: id(4), type: 'column_list', content: [id(5)] }
  const column = { id: id(5), type: 'column', content: [h2.id, h3.id] }
  const child = { id: id(6), type: 'page', content: [id(7)] }
  const { page, recordMap } = fixture([h1, columns, child])
  for (const block of [column, h2, h3, heading(7), heading(8)])
    recordMap.block[block.id] = { value: block }
  page.content.push(id(999)) // A deleted or unavailable record is harmless.
  assert.deepEqual(
    getArticleTableOfContents(page, recordMap).map((entry) => entry.id),
    [h1.id, h2.id, h3.id]
  )
})

test('TOC supports nested Notion record wrappers and formatted heading text', () => {
  const { page, recordMap } = fixture([heading(1), heading(2), heading(3)])
  recordMap.block[id(1)] = {
    value: {
      value: {
        ...heading(1),
        properties: {
          title: [
            ['Hello ', [['b']]],
            ['世界', [['i']]]
          ]
        }
      }
    }
  }
  assert.deepEqual(
    getArticleTableOfContents(page, recordMap).map((entry) => entry.text),
    ['Hello 世界', 'Section 2', 'Section 3']
  )
})
