import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

test('application, script and test sources share strict TypeScript checking', () => {
  const filename = fileURLToPath(new URL('../tsconfig.json', import.meta.url))
  const { config, error } = ts.readConfigFile(filename, ts.sys.readFile)
  assert.equal(error, undefined)
  const project = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd())
  assert.deepEqual(project.errors, [])
  assert.equal(project.options.strict, true)
  assert.equal(project.options.allowJs, false)

  const files = new Set(project.fileNames.map((file) => path.resolve(file)))
  function checkSource(source: string) {
    assert.doesNotMatch(source, /\.(?:js|mjs|cjs)$/)
    if (/\.tsx?$/.test(source))
      assert.ok(files.has(path.resolve(source)), `${source} is checked`)
  }
  function checkDirectory(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (['dist', 'node_modules'].includes(entry.name)) continue
      const source = path.join(directory, entry.name)
      if (entry.isDirectory()) checkDirectory(source)
      else if (entry.isFile()) checkSource(source)
    }
  }
  for (const directory of [
    'components',
    'pages',
    'lib',
    'scripts',
    'tests',
    'tools/mdx-editor'
  ])
    checkDirectory(directory)
  for (const source of ['next.config.ts', 'site.config.ts']) checkSource(source)
})
