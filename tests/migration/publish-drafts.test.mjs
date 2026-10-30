import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { parse } from 'yaml'
import { load } from 'cheerio'
import { getLocalPage, getLocalPages } from '../../lib/local-content.ts'

// Original drafts are historical evidence, never an input to the build.
const archive = 'legacy/blog-drafts'

test('all thirty engineering drafts have one editable MDX publication', async () => {
  const files = fs
    .readdirSync(archive)
    .filter(
      (name) =>
        name.endsWith('.md') &&
        !['README.md', 'EDITORIAL-NOTES.md'].includes(name)
    )
  assert.equal(files.length, 30)
  const pages = getLocalPages()
  for (const filename of files) {
    const slug = path.basename(filename, '.md')
    const source = fs.readFileSync(path.join(archive, filename), 'utf8')
    const metadata = parse(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1])
    const summary = pages.find((entry) => entry.slug === slug)
    assert.equal(summary.type, 'post', slug)
    assert.equal(summary.title, metadata.title)
    assert.deepEqual(summary.tags, metadata.tags)
    const page = await getLocalPage(slug)
    assert.equal(load(page.html)('h1').length, 0, `${slug}: layout owns title`)
  }
  assert.equal(await getLocalPage('editorial-notes'), null)
})
