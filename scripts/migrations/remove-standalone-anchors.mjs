/** Remove only AST-selected compatibility directives; stage and verify before writing. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createProcessor } from '@mdx-js/mdx'
import { load } from 'cheerio'
import remarkGfm from 'remark-gfm'
import prettier from 'prettier'
import remarkHeadingIds from '../../lib/remark-heading-ids.mjs'
import { remarkBlockDirectives } from './remark-legacy-block-ids.mjs'
import { getLocalPage, readContentIndex } from '../../lib/mdx-content.mjs'
import { getLegacyPage } from './legacy-content.mjs'
import { validateFragmentAliases } from '../../lib/rehype-fragment-aliases.mjs'

const processor = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})

/** Offsets refer to the original source; code samples and container prefixes stay byte-exact. */
export function removeStandaloneAnchors(source) {
  const header =
    source.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] ?? ''
  const body = source.slice(header.length)
  const tree = processor.parse(body)
  const edits = []
  const code = []
  function visit(node, parent) {
    if (node.type === 'code' || node.type === 'inlineCode')
      code.push(
        body.slice(node.position.start.offset, node.position.end.offset)
      )
    if (node.type === 'leafDirective' && node.name === 'anchor') {
      const siblings = parent.children
      const index = siblings.indexOf(node)
      const real = (child) => child.type !== 'leafDirective'
      const previous = siblings.slice(0, index).reverse().find(real)
      const next = siblings.slice(index + 1).find(real)
      const retainBoundary =
        (previous?.type === 'list' && next?.type === 'list') ||
        (previous?.type === 'blockquote' && next?.type === 'blockquote') ||
        (parent.type === 'listItem' && index === 0)
      // Invisible MDX comments keep adjacent Markdown containers separate.
      edits.push([
        node.position.start.offset,
        node.position.end.offset,
        retainBoundary ? '{/* */}' : ''
      ])
      return
    }
    for (const child of node.children ?? []) visit(child, node)
  }
  visit(tree)
  let output = body
  for (const [start, end, replacement] of edits.reverse())
    output = output.slice(0, start) + replacement + output.slice(end)
  return { source: header + output, count: edits.length, code }
}

function snapshot(page) {
  const $ = load(page.html)
  const ids = new Set(
    $('[id]')
      .map((_, node) => $(node).attr('id'))
      .get()
  )
  assert.equal(ids.size, $('[id]').length, 'Rendered IDs must be unique')
  assert.equal(
    $('a[id]:empty:not([href])').length,
    0,
    'No compatibility anchors'
  )
  for (const target of Object.values(page.fragmentAliases))
    assert.ok(ids.has(target), target)
  return { $, ids }
}

export async function migrateStandaloneAnchors({
  root = process.cwd(),
  contentDir = 'content',
  write = false
} = {}) {
  const index = readContentIndex({ root, contentDir })
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'remove-anchors-'))
  const stagedContent = path.join(temporary, 'content')
  fs.cpSync(index.contentDir, stagedContent, { recursive: true })
  const updates = []
  const pages = {}
  let count = 0
  try {
    const beforePages = new Map()
    for (const entry of index.pages) {
      const before = await getLegacyPage(entry.slug, { root, contentDir })
      beforePages.set(entry.id, before)
      const source = fs.readFileSync(entry.file, 'utf8')
      const result = removeStandaloneAnchors(source)
      const mapping = {}
      for (const [alias, canonical] of Object.entries(before.fragmentAliases)) {
        if (!Object.hasOwn(mapping, canonical))
          Object.defineProperty(mapping, canonical, {
            value: [],
            enumerable: true
          })
        mapping[canonical].push(alias)
      }
      for (const aliases of Object.values(mapping)) aliases.sort()
      pages[entry.id] = mapping
      count += result.count
      fs.writeFileSync(
        path.join(stagedContent, entry.relativePath),
        result.source
      )
      updates.push({ entry, source, ...result })
    }
    const sidecar = validateFragmentAliases({ version: 1, pages })
    const serialized = prettier.format(JSON.stringify(sidecar), {
      parser: 'json'
    })
    fs.writeFileSync(
      path.join(stagedContent, 'fragment-aliases.json'),
      serialized
    )
    for (const { entry, source, code } of updates) {
      const before = beforePages.get(entry.id)
      const after = await getLocalPage(entry.slug, { root: temporary })
      const old = snapshot(before)
      const next = snapshot(after)
      for (const id of [...old.ids, ...Object.keys(before.fragmentAliases)]) {
        const expected = Object.hasOwn(before.fragmentAliases, id)
          ? before.fragmentAliases[id]
          : id
        const actual = Object.hasOwn(after.fragmentAliases, id)
          ? after.fragmentAliases[id]
          : id
        assert.equal(
          actual,
          expected,
          `${entry.slug}: changed destination for ${id}`
        )
        assert.ok(next.ids.has(actual), `${entry.slug}: lost fragment ${id}`)
      }
      assert.deepEqual(
        removeStandaloneAnchors(source).code,
        code,
        `${entry.slug}: code source changed`
      )
      assert.deepEqual(
        next
          .$('pre code')
          .map((_, node) => next.$(node).text())
          .get(),
        old
          .$('pre code')
          .map((_, node) => old.$(node).text())
          .get(),
        `${entry.slug}: rendered code changed`
      )
      assert.deepEqual(
        after.fragmentAliases,
        before.fragmentAliases,
        `${entry.slug}: aliases changed`
      )
      assert.equal(
        removeStandaloneAnchors(source).count,
        0,
        'Migration must be idempotent'
      )
    }
    // No source files change until every staged page and redirect has compiled.
    if (write) {
      for (const { entry, source } of updates) {
        if (fs.readFileSync(entry.file, 'utf8') !== source)
          fs.writeFileSync(entry.file, source)
      }
      fs.writeFileSync(
        path.join(index.contentDir, 'fragment-aliases.json'),
        serialized
      )
    }
    return {
      files: updates.filter((item) => item.count).length,
      anchors: count
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const write = process.argv.includes('--write')
  const result = await migrateStandaloneAnchors({ write })
  console.log(
    `${write ? 'Updated' : 'Would update'} ${result.files} files: ${
      result.anchors
    } standalone anchors`
  )
}
