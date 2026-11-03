import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { createProcessor } from '@mdx-js/mdx'
import { load } from 'cheerio'
import remarkGfm from 'remark-gfm'

import { getLocalPage, readContentIndex } from '../lib/mdx-content.mjs'
import { remarkBlockDirectives } from '../lib/remark-block-ids.mjs'
import remarkHeadingIds from '../lib/remark-heading-ids.mjs'

const parser = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})

test('active content does not split ordinary sibling lists with empty comments', () => {
  const remaining = []
  for (const page of readContentIndex().pages) {
    const source = fs.readFileSync(page.file, 'utf8')
    const body = source.replace(
      /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/,
      ''
    )
    function visit(node) {
      const children = node.children ?? []
      for (let index = 1; index < children.length - 1; index++) {
        const current = children[index]
        const before = children[index - 1]
        const after = children[index + 1]
        if (
          current.type === 'mdxFlowExpression' &&
          /^\/\*\s*\*\/$/.test(current.value.trim()) &&
          before.type === 'list' &&
          after.type === 'list' &&
          before.ordered === after.ordered &&
          (!after.ordered || after.start === 1)
        )
          remaining.push(`${page.relativePath}:${current.position.start.line}`)
      }
      for (const child of children) visit(child)
    }
    visit(parser.parse(body))
  }
  assert.deepEqual(remaining, [])
})

for (const [slug, count] of [
  ['big-data', 51],
  ['distributed-machine-learning', 74]
]) {
  test(`${slug} is one ordinary resource list with ${count} direct items`, async () => {
    const page = await getLocalPage(slug)
    const $ = load(page.html)
    const lists = $('body > ul')
    assert.equal(lists.length, 1)
    assert.equal(lists.children('li').length, count)
    assert.equal(
      lists.children('li').children('p').length,
      0,
      'simple resources remain a tight list'
    )
    assert.equal($('li:empty').length, 0)
  })
}

test('Sage steps are one numbered sequence and historical links retain their individual destinations', async () => {
  const page = await getLocalPage('more-details-sage-agent')
  const $ = load(page.html)
  const canonical =
    'be-specific-provide-clear-context-and-specific-questions-to-get'
  const item = $(`[id="${canonical}"]`)
  assert.equal(item.prop('tagName'), 'LI')
  const list = item.parent('ol')
  assert.equal(list.length, 1)
  assert.equal(list.attr('start') ?? '1', '1')
  const steps = list.children('li')
  assert.equal(steps.length, 4)
  assert.deepEqual(
    steps.map((_, node) => $(node).find('strong').first().text()).get(),
    ['Be Specific:', 'Iterate:', 'Provide Feedback:', 'Leverage Examples:']
  )
  assert.equal(
    page.fragmentAliases['30510a0af92080ac96c2cb3372a3fe5c'],
    canonical
  )
  assert.equal(
    page.fragmentAliases[`${canonical}-2`],
    canonical,
    'the former item ID resolves to the same step'
  )
})

test('testing workflow retains six numbered steps, each owning its two explanatory bullets', async () => {
  const page = await getLocalPage(
    'refining-testing-strategies-and-pr-workflows-for-scalable-development'
  )
  const $ = load(page.html)
  const first = $(
    '[id="testing-at-different-levels-each-level-of-testing-serves-a"]'
  )
  assert.equal(first.prop('tagName'), 'LI')
  const steps = first.parent('ol').children('li')
  assert.equal(steps.length, 6)
  for (const step of steps) {
    const nested = $(step).children('ul')
    assert.equal(nested.length, 1)
    assert.equal(nested.children('li').length, 2)
  }
  assert.equal($('li:empty').length, 0)
})
