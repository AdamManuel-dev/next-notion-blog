/** Clean Architecture: pure source/identity planning, with staged filesystem orchestration. */
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
import rehypeFragmentAliases, {
  validateFragmentAliases
} from '../../lib/rehype-fragment-aliases.mjs'
import { readContentIndex, renderMdx } from '../../lib/mdx-content.mjs'
import { remarkBlockDirectives } from '../../lib/remark-block-ids.mjs'

const parser = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})
const headerOf = (source) =>
  source.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] ?? ''
const start = (node) => node.position?.start.offset
const tagOf = (node) =>
  node.type === 'element'
    ? node.tagName
    : /^mdxJsx/.test(node.type)
    ? node.name
    : null
const idOf = (node) =>
  node.type === 'element'
    ? node.properties?.id
    : node.attributes?.find((a) => a.name === 'id')?.value
const keyOf = (tag, offset) => `${tag}:${offset}`
function walk(node, visit) {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

function select(source) {
  const header = headerOf(source)
  const body = source.slice(header.length)
  const tree = parser.parse(body)
  const boundaries = []
  const items = new Map()
  const removed = new Set()
  let chains = 0
  walk(tree, (parent) => {
    const children = parent.children ?? []
    let last = null
    for (let i = 1; i < children.length - 1; i++) {
      const comment = children[i]
      const previous = children[i - 1]
      const next = children[i + 1]
      if (
        comment.type !== 'mdxFlowExpression' ||
        !/^\s*\/\*\s*\*\/\s*$/.test(comment.value) ||
        previous.type !== 'list' ||
        next.type !== 'list' ||
        previous.ordered !== next.ordered
      )
        continue
      // Non-default numbering is authored meaning, not fragmentation.
      if (previous.ordered && (previous.start !== 1 || next.start !== 1))
        continue
      assert.equal(
        previous.children.length,
        1,
        'Unsupported non-singleton list separator'
      )
      assert.equal(
        next.children.length,
        1,
        'Unsupported non-singleton list separator'
      )
      assert.equal(
        previous.position.start.column,
        next.position.start.column,
        'Different list starts'
      )
      for (const list of [previous, next]) {
        const item = list.children[0]
        assert.equal(start(list), start(item), 'Different list/item starts')
        const paragraph = item.children.find(
          (child) => child.type === 'paragraph'
        )
        assert.equal(
          paragraph?.type,
          'paragraph',
          'Singleton item must have a first paragraph'
        )
        assert.notEqual(
          paragraph.children[0]?.type,
          'headingId',
          'Item already has a prefix ID'
        )
        items.set(start(list), { list, item, paragraph })
      }
      if (last !== previous) chains++
      last = next
      removed.add(start(comment))
      const indentation = body.slice(
        body.lastIndexOf('\n', start(next) - 1) + 1,
        start(next)
      )
      // Container quote prefixes are retained verbatim, as is ordinary indentation.
      assert.match(indentation, /^[\t >]*$/, 'Unsupported list indentation')
      boundaries.push({
        start: previous.position.end.offset,
        end: start(next),
        value: '\n' + indentation
      })
    }
  })
  return { header, body, tree, boundaries, items, removed, chains }
}

function applyEdits(body, edits) {
  edits.sort((a, b) => a.start - b.start || a.end - b.end)
  let cursor = 0
  let output = ''
  for (const edit of edits) {
    assert.ok(edit.start >= cursor, 'Overlapping source edits')
    output += body.slice(cursor, edit.start) + edit.value
    cursor = edit.end
  }
  output += body.slice(cursor)
  function originalOffset(offset) {
    let delta = 0
    for (const edit of edits) {
      const at = edit.start + delta
      if (offset < at) break
      if (offset < at + edit.value.length) return edit.start
      delta += edit.value.length - (edit.end - edit.start)
    }
    return offset - delta
  }
  return { output, originalOffset }
}

/** Pure transformation; old list IDs come from the production renderer, never guessed text. */
export function mergeFragmentedLists(source, listIds = new Map()) {
  const selection = select(source)
  const edits = [...selection.boundaries]
  for (const [offset, { paragraph }] of selection.items) {
    const id = listIds.get(offset)
    assert.match(
      id ?? '',
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `Missing/invalid old list ID at ${offset}`
    )
    edits.push({
      start: start(paragraph),
      end: start(paragraph),
      value: `{#${id}} `
    })
  }
  const { output, originalOffset } = applyEdits(selection.body, edits)
  return {
    source: selection.header + output,
    originalOffset,
    ...selection,
    edits
  }
}

function addressed(tree, mapOffset = (offset) => offset) {
  const records = []
  walk(tree, (node) => {
    const id = idOf(node)
    if (id === undefined || id === '') return
    assert.ok(
      tagOf(node) && Number.isInteger(start(node)),
      `Positionless addressed node: ${tagOf(node)}#${id}`
    )
    records.push({
      id,
      tag: tagOf(node),
      offset: mapOffset(start(node)),
      key: keyOf(tagOf(node), mapOffset(start(node)))
    })
  })
  assert.equal(
    new Set(records.map((r) => r.id)).size,
    records.length,
    'Duplicate IDs'
  )
  assert.equal(
    new Set(records.map((r) => r.key)).size,
    records.length,
    'Ambiguous source correspondence'
  )
  return records
}

async function capture(file, aliases, pageId, mapOffset) {
  let raw
  let explicit
  let records
  const fragments = (options) => (tree, vfile) => {
    raw = structuredClone(tree)
    explicit = addressed(tree, mapOffset)
    rehypeFragmentAliases(options)(tree, vfile)
    records = addressed(tree, mapOffset)
  }
  const page = await renderMdx(file, aliases, pageId, { fragments })
  const $ = load(page.html)
  const domIds = $('[id]')
    .map((_, node) => $(node).attr('id'))
    .get()
  assert.equal(new Set(domIds).size, domIds.length, 'Duplicate rendered IDs')
  assert.deepEqual(
    [...domIds].sort(),
    records.map((r) => r.id).sort(),
    'Untracked rendered IDs (widget internals are unsupported)'
  )
  return { ...page, raw, explicit, records }
}

function allocate(raw, reserved, placeholder, mapOffset) {
  const tree = structuredClone(raw)
  const file = { data: {} }
  rehypeFragmentAliases({ aliases: { [placeholder]: [...reserved].sort() } })(
    tree,
    file
  )
  return addressed(tree, mapOffset)
}

function planAliases(before, proposed, result) {
  const oldById = new Map(before.records.map((r) => [r.id, r]))
  const target = new Map(before.records.map((r) => [r.id, r.key]))
  const pins = new Map()
  for (const [offset, { list }] of result.items) {
    const oldList = before.records.find(
      (r) => r.key === keyOf(list.ordered ? 'ol' : 'ul', offset)
    )
    const oldItem = before.records.find((r) => r.key === keyOf('li', offset))
    assert.ok(oldList && oldItem, `Missing singleton targets at ${offset}`)
    for (const record of [oldList, oldItem]) target.set(record.id, oldItem.key)
    pins.set(oldList.id, oldItem.key)
  }
  for (const record of before.explicit) {
    assert.equal(
      target.get(record.id),
      record.key,
      `Cannot relocate explicit ID ${record.id}`
    )
  }
  for (const [alias, canonical] of Object.entries(before.fragmentAliases)) {
    assert.ok(
      oldById.has(canonical),
      `Missing historical destination ${canonical}`
    )
    target.set(alias, target.get(canonical))
  }
  const explicit = new Map(proposed.explicit.map((r) => [r.id, r.key]))
  for (const [id, key] of pins)
    assert.equal(explicit.get(id), key, `Prefix support missing for ${id}`)
  for (const record of before.explicit)
    assert.equal(
      explicit.get(record.id),
      record.key,
      `Lost explicit ID ${record.id}`
    )
  const placeholder = pins.keys().next().value
  const reserved = new Set(Object.keys(before.fragmentAliases))
  let records
  for (;;) {
    records = allocate(
      proposed.raw,
      reserved,
      placeholder,
      result.originalOffset
    )
    const byKey = new Map(records.map((r) => [r.key, r.id]))
    const size = reserved.size
    for (const [id, key] of target) {
      assert.ok(byKey.has(key), `Missing equivalent node for ${id}: ${key}`)
      if (byKey.get(key) !== id) {
        assert.ok(!explicit.has(id), `Cannot reserve explicit ID ${id}`)
        reserved.add(id)
      }
    }
    if (size === reserved.size) break
  }
  const byKey = new Map(records.map((r) => [r.key, r.id]))
  const aliases = Object.create(null)
  for (const [id, key] of target) {
    const canonical = byKey.get(key)
    if (canonical === id) continue
    ;(aliases[canonical] ??= []).push(id)
  }
  for (const names of Object.values(aliases)) names.sort()
  assert.deepEqual(
    Object.values(aliases).flat().sort(),
    [...reserved].sort(),
    'Reservation/alias mismatch'
  )
  return { aliases, records, target }
}

// Compare semantic leaves and ownership, not the intentionally repaired list grouping/tightness.
function semantics(tree, removed = new Set()) {
  const copy = structuredClone(tree)
  remarkHeadingIds.call({ data: () => ({}) })(copy)
  function normalize(node) {
    if (node.type === 'mdxFlowExpression' && removed.has(start(node))) return []
    const children = (node.children ?? []).flatMap(normalize)
    if (node.type === 'list') return children
    const fields = Object.fromEntries(
      Object.entries(node).filter(
        ([key]) => !['position', 'data', 'spread', 'children'].includes(key)
      )
    )
    // Marker stripping can leave adjacent/empty text nodes; only their concatenated value matters.
    const merged = []
    for (const child of children) {
      if (child.type === 'text' && !child.value) continue
      if (child.type === 'text' && merged.at(-1)?.type === 'text')
        merged.at(-1).value += child.value
      else merged.push(child)
    }
    return [{ ...fields, ...(node.children ? { children: merged } : {}) }]
  }
  function withoutPositions(value) {
    if (Array.isArray(value)) return value.map(withoutPositions)
    if (!value || typeof value !== 'object') return value
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'position' && key !== 'data')
        .map(([key, child]) => [key, withoutPositions(child)])
    )
  }
  return withoutPositions(normalize(copy))
}
function codeSources(body, tree) {
  const code = []
  walk(tree, (node) => {
    if (node.type === 'code' || node.type === 'inlineCode')
      code.push(body.slice(start(node), node.position.end.offset))
  })
  return code
}

export async function migrateFragmentedLists({
  root = process.cwd(),
  contentDir = 'content',
  write = false
} = {}) {
  const index = readContentIndex({ root, contentDir })
  const aliasFile = path.join(index.contentDir, 'fragment-aliases.json')
  const originalAliases = fs.existsSync(aliasFile)
    ? fs.readFileSync(aliasFile, 'utf8')
    : null
  const sidecar = validateFragmentAliases(
    originalAliases === null
      ? { version: 1, pages: {} }
      : JSON.parse(originalAliases)
  )
  const inputs = index.pages.map((entry) => ({
    entry,
    source: fs.readFileSync(entry.file, 'utf8')
  }))
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-lists-'))
  const stagedContent = path.join(temporary, 'content')
  const updates = []
  const report = { files: 0, chains: 0, separators: 0 }
  try {
    fs.cpSync(index.contentDir, stagedContent, { recursive: true })
    for (const { entry, source } of inputs) {
      const selection = select(source)
      if (!selection.boundaries.length) continue
      const aliases = sidecar.pages[entry.id] ?? {}
      const before = await capture(entry.file, aliases, entry.id)
      const listIds = new Map(
        before.records
          .filter((r) => r.tag === 'ul' || r.tag === 'ol')
          .map((r) => [r.offset, r.id])
      )
      const result = mergeFragmentedLists(source, listIds)
      const stagedFile = path.join(stagedContent, entry.relativePath)
      fs.writeFileSync(stagedFile, result.source)
      // Compile once without historical alias feedback, then allocate clones until stable.
      const proposed = await capture(
        stagedFile,
        {},
        entry.id,
        result.originalOffset
      )
      const plan = planAliases(before, proposed, result)
      sidecar.pages[entry.id] = plan.aliases
      const next = select(result.source)
      const listCount = (tree) => {
        let count = 0
        walk(tree, (node) => {
          if (node.type === 'list') count++
        })
        return count
      }
      assert.equal(
        listCount(next.tree),
        listCount(result.tree) - result.boundaries.length,
        'Separators did not merge ordinary lists'
      )
      assert.equal(next.header, result.header, 'Frontmatter changed')
      assert.deepEqual(
        codeSources(next.body, next.tree),
        codeSources(result.body, result.tree),
        'Code source changed'
      )
      assert.deepEqual(
        semantics(next.tree),
        semantics(result.tree, result.removed),
        'Content/ownership changed'
      )
      assert.equal(
        next.boundaries.length,
        0,
        'Source transformation is not idempotent'
      )
      updates.push({
        entry,
        source: result.source,
        before,
        result,
        plan,
        stagedFile
      })
      report.files++
      report.chains += result.chains
      report.separators += result.boundaries.length
    }
    if (!updates.length) return report
    const serialized = prettier.format(
      JSON.stringify(validateFragmentAliases(sidecar)),
      { parser: 'json' }
    )
    fs.writeFileSync(
      path.join(stagedContent, 'fragment-aliases.json'),
      serialized
    )
    // The complete sidecar and every page must validate before any production write.
    for (const { entry } of inputs) {
      const update = updates.find((u) => u.entry === entry)
      const file = path.join(stagedContent, entry.relativePath)
      const aliases = sidecar.pages[entry.id] ?? {}
      if (!update) {
        const page = await renderMdx(file, aliases, entry.id)
        const $ = load(page.html)
        const ids = $('[id]')
          .map((_, node) => $(node).attr('id'))
          .get()
        assert.equal(new Set(ids).size, ids.length, 'Duplicate rendered IDs')
        for (const target of Object.values(page.fragmentAliases)) {
          assert.ok(ids.includes(target), `Missing alias target ${target}`)
        }
        continue
      }
      const final = await capture(
        file,
        aliases,
        entry.id,
        update.result.originalOffset
      )
      assert.deepEqual(
        final.records,
        update.plan.records,
        'Final allocation differs from plan'
      )
      assert.deepEqual(
        final.liveBlocks,
        update.before.liveBlocks,
        'Live blocks changed'
      )
      const actual = new Map(final.records.map((r) => [r.id, r.key]))
      for (const [name, key] of update.plan.target) {
        assert.equal(
          actual.get(final.fragmentAliases[name] ?? name),
          key,
          `Changed intended destination: ${name}`
        )
      }
    }
    for (const { entry, source } of inputs)
      assert.equal(
        fs.readFileSync(entry.file, 'utf8'),
        source,
        `Input changed: ${entry.file}`
      )
    assert.equal(
      fs.existsSync(aliasFile) ? fs.readFileSync(aliasFile, 'utf8') : null,
      originalAliases,
      'Alias input changed'
    )
    if (write) {
      for (const update of updates)
        fs.writeFileSync(update.entry.file, update.source)
      fs.writeFileSync(aliasFile, serialized)
    }
    return report
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const write = process.argv.includes('--write')
  const result = await migrateFragmentedLists({ write })
  console.log(
    `${write ? 'Updated' : 'Would update'} ${result.files} files: ${
      result.chains
    } chains, ${result.separators} separators`
  )
}
