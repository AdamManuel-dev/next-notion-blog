import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { generateContentRevision } from '../scripts/generate-content-revision.mjs'

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-revision-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const directory = path.join(root, 'articles')
  fs.mkdirSync(directory)
  const put = (name, content) => {
    const file = path.join(directory, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content)
    return file
  }
  const output = path.join(root, '.generated/content-revision.ts')
  return {
    root,
    directory,
    output,
    put,
    generate: () => generateContentRevision({ root, contentDir: 'articles' })
  }
}

test('revision generation is deterministic and never parses or executes MDX', (t) => {
  const { put, output, generate } = fixture(t)
  put('home/index.mdx', '# Home')
  put('example/index.mdx', '<Unknown prop={run()} />')
  const first = generate()
  assert.equal(first.written, true)
  assert.match(first.revision, /^[a-f0-9]{64}$/)
  const content = fs.readFileSync(output, 'utf8')
  const modified = fs.statSync(output).mtimeMs
  assert.match(content, new RegExp(`contentRevision = '${first.revision}'`))
  assert.doesNotMatch(content, /import\(|Unknown|run\(/)
  assert.deepEqual(generate(), { ...first, written: false })
  assert.equal(fs.readFileSync(output, 'utf8'), content)
  assert.equal(fs.statSync(output).mtimeMs, modified)
})

test('prose, aliases, page additions, moves and deletions each update the revision', (t) => {
  const { directory, put, generate } = fixture(t)
  const file = put('example/index.mdx', '# Original')
  let previous = generate().revision
  function changed() {
    const result = generate()
    assert.equal(result.written, true)
    assert.notEqual(result.revision, previous)
    previous = result.revision
  }
  put('example/index.mdx', '# Updated')
  changed()
  const aliases = put('fragment-aliases.json', '{"version":1,"pages":{}}')
  changed()
  put('fragment-aliases.json', '{"version":1,"pages":{}}\n')
  changed()
  const other = put('other/index.mdx', '# Other')
  changed()
  fs.renameSync(file, path.join(directory, 'index.mdx'))
  changed()
  fs.unlinkSync(other)
  changed()
  fs.unlinkSync(aliases)
  changed()
})

test('unrelated and hidden files do not trigger a revision rewrite', (t) => {
  const { put, generate } = fixture(t)
  put('home/index.mdx', '# Home')
  const before = generate()
  put('README.md', 'Updated documentation')
  put('.draft/index.mdx', '# Ignored')
  put('node_modules/example/index.mdx', '# Ignored')
  put('nested/fragment-aliases.json', '{}')
  assert.deepEqual(generate(), { ...before, written: false })
})

test('missing content fails without publishing a token; output can be customized', (t) => {
  const { root, directory, output, put } = fixture(t)
  assert.equal(fs.existsSync(output), false)
  assert.throws(
    () => generateContentRevision({ root, contentDir: 'missing' }),
    { code: 'ENOENT' }
  )
  assert.equal(fs.existsSync(output), false)
  put('index.mdx', '# Home')
  generateContentRevision({
    root,
    contentDir: directory,
    outputFile: 'custom/revision.ts'
  })
  assert.equal(fs.existsSync(path.join(root, 'custom/revision.ts')), true)
  assert.equal(fs.existsSync(output), false)
})
