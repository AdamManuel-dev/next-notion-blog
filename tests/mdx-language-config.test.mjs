import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

import { createProcessor } from '@mdx-js/mdx'
import ts from 'typescript'

import { readContentIndex } from '../lib/mdx-content.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const filename = path.join(root, 'tsconfig.json')
const { config, error } = ts.readConfigFile(filename, ts.sys.readFile)
assert.equal(error, undefined)
const require = createRequire(filename)
// Resolve the same tsconfig plugins as the MDX language server, without running MDX.
const remarkPlugins = await Promise.all(
  config.mdx.plugins.map(async (entry) => {
    const [name, ...options] = Array.isArray(entry) ? entry : [entry]
    const { default: plugin } = await import(
      pathToFileURL(require.resolve(name))
    )
    return [plugin, ...options]
  })
)
const processor = createProcessor({ remarkPlugins })

test('active MDX files belong to the configured TypeScript/MDX project', () => {
  const project = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    root,
    undefined,
    filename,
    undefined,
    [
      {
        extension: '.mdx',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred
      }
    ]
  )
  assert.deepEqual(project.errors, [])
  const files = new Set(project.fileNames)
  for (const page of readContentIndex({ root }).pages)
    assert.ok(
      files.has(page.file),
      `${page.relativePath} must not use an inferred MDX project`
    )
})

test('editor plugins parse every active page, including raw YAML frontmatter', () => {
  for (const page of readContentIndex({ root }).pages) {
    const source = fs.readFileSync(page.file, 'utf8')
    const tree = processor.parse({ value: source, path: page.file })
    assert.equal(tree.children[0].type, 'yaml', page.relativePath)
  }
})

test('editor grammar handles GFM, nested callouts and pinned heading/paragraph IDs', () => {
  const source = [
    '---',
    'title: "Metadata with {braces}"',
    '---',
    '',
    '## Heading {#heading}',
    '',
    'Paragraph. {#paragraph}',
    '',
    '::::callout{#outer}',
    '> :::callout{#inner}',
    '> Quoted content. {#quoted}',
    '> :::',
    '::::',
    '',
    '| A | B |',
    '| --- | --- |',
    '| one | two |',
    '',
    '<Counter initialCount={3} />',
    '',
    '```mdx',
    '## Literal {#literal}',
    '```'
  ].join('\n')
  const tree = processor.parse(source)
  assert.equal(tree.children[0].value, 'title: "Metadata with {braces}"')
  assert.equal(tree.children[1].children.at(-1).type, 'headingId')
  assert.equal(tree.children[2].children.at(-1).id, 'paragraph')
  assert.equal(tree.children[3].type, 'containerDirective')
  assert.equal(tree.children[3].children[0].children[0].attributes.id, 'inner')
  assert.equal(tree.children[4].type, 'table')
  assert.equal(tree.children[5].name, 'Counter')
  assert.equal(tree.children[6].value, '## Literal {#literal}')
})

test('real malformed JSX, expressions and ID markers still produce parser errors', () => {
  for (const source of [
    '<Broken value= />',
    '{1 + }',
    '## Invalid {#}',
    '## Invalid {#spaces are not ids}'
  ])
    assert.throws(() => processor.parse(source), undefined, source)
})
