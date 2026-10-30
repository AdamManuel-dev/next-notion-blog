import assert from 'node:assert/strict'
import test from 'node:test'
import { getActiveOutlineId } from '../lib/article-outline-position.ts'

const positions = (...tops) =>
  tops.map((top, index) => ({ id: `section-${index + 1}`, top }))

test('an article without headings has no current section', () => {
  assert.equal(getActiveOutlineId([]), null)
  assert.equal(getActiveOutlineId([], 96, true), null)
})

test('the first section is current before the article begins', () => {
  assert.equal(getActiveOutlineId(positions(400, 800, 1200)), 'section-1')
})

test('the latest heading crossing the reading line becomes current', () => {
  assert.equal(getActiveOutlineId(positions(-400, 96, 600)), 'section-2')
  assert.equal(getActiveOutlineId(positions(-400, 97, 600)), 'section-1')
  assert.equal(getActiveOutlineId(positions(-800, -400, 95)), 'section-3')
})

test('scrolling upward restores the earlier section', () => {
  assert.equal(getActiveOutlineId(positions(-800, -400, 40)), 'section-3')
  assert.equal(getActiveOutlineId(positions(-400, 40, 480)), 'section-2')
  assert.equal(getActiveOutlineId(positions(40, 480, 920)), 'section-1')
})

test('the final section is current at the page end even if its heading is below the reading line', () => {
  assert.equal(getActiveOutlineId(positions(-500, 40, 300)), 'section-2')
  assert.equal(
    getActiveOutlineId(positions(-500, 40, 300), 96, true),
    'section-3'
  )
})

test('a single section stays current at every reading position', () => {
  assert.equal(getActiveOutlineId(positions(500)), 'section-1')
  assert.equal(getActiveOutlineId(positions(-500)), 'section-1')
  assert.equal(getActiveOutlineId(positions(500), 96, true), 'section-1')
})

test('a custom reading line accommodates a different header height', () => {
  assert.equal(getActiveOutlineId(positions(-200, 100, 700), 120), 'section-2')
  assert.equal(getActiveOutlineId(positions(-200, 100, 700), 80), 'section-1')
})

test('tracking does not change heading positions or their document order', () => {
  const headings = positions(-500, 40, 300).map(Object.freeze)
  Object.freeze(headings)
  assert.equal(getActiveOutlineId(headings), 'section-2')
  assert.deepEqual(
    headings.map((heading) => heading.top),
    [-500, 40, 300]
  )
})
