import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  getContentPreview,
  probeContentPreview,
  waitForContentPreview
} from '../lib/content-preview.mjs'
import { formatContentFiles } from '../scripts/format-content.mjs'

const repository = fileURLToPath(new URL('..', import.meta.url))
const frontmatter = (slug, type = 'note') =>
  `---\ntitle: Example\nslug: ${slug}\ndescription: Example\ntype: ${type}\ntags: []\norder: 0\n---\n\n`

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdx-authoring-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const put = (file, body, slug = 'public-page', type = 'note') => {
    const target = path.join(root, 'content', file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, frontmatter(slug, type) + body)
    return target
  }
  const home = put('home/index.mdx', '# Home', 'home', 'home')
  return { root, put, home }
}

async function server(t, respond) {
  const instance = http.createServer(respond)
  await new Promise((resolve) => instance.listen(0, '127.0.0.1', resolve))
  t.after(
    () =>
      new Promise((resolve) => {
        instance.closeAllConnections()
        instance.close(resolve)
      })
  )
  return `http://127.0.0.1:${instance.address().port}`
}

test('format check is read-only; writes are explicit, scoped and idempotent', async (t) => {
  const { root, put } = fixture(t)
  const file = put('nested/index.mdx', '-   First\n-   Second\n')
  const original = fs.readFileSync(file, 'utf8')
  const result = await formatContentFiles([file], { root })
  assert.deepEqual(result.changed, ['content/nested/index.mdx'])
  assert.equal(fs.readFileSync(file, 'utf8'), original)
  await assert.rejects(
    () => formatContentFiles([], { root, write: true }),
    /explicitly use --all/
  )
  await formatContentFiles([file], { root, write: true })
  assert.notEqual(fs.readFileSync(file, 'utf8'), original)
  assert.deepEqual((await formatContentFiles([file], { root })).changed, [])
  const archive = path.join(root, 'legacy.mdx')
  fs.writeFileSync(archive, original)
  await assert.rejects(
    () => formatContentFiles([archive], { root, write: true }),
    /outside active MDX/
  )
  assert.equal(fs.readFileSync(archive, 'utf8'), original)
})

test('a bad file prevents earlier valid proposals from being written', async (t) => {
  const { root, put } = fixture(t)
  const good = put('good/index.mdx', '-   First\n-   Second\n', 'good')
  const bad = put('bad/index.mdx', 'Broken {', 'bad')
  const original = fs.readFileSync(good, 'utf8')
  await assert.rejects(() =>
    formatContentFiles([good, bad], { root, write: true })
  )
  assert.equal(fs.readFileSync(good, 'utf8'), original)
})

test('formatter CLI check exits nonzero on differences without writing', (t) => {
  const { root, put } = fixture(t)
  const file = put('nested/index.mdx', '-   First\n-   Second\n')
  const original = fs.readFileSync(file, 'utf8')
  const result = spawnSync(
    process.execPath,
    [path.join(repository, 'scripts/format-content.mjs'), '--check', file],
    { cwd: root, encoding: 'utf8' }
  )
  assert.equal(result.status, 1, result.stderr)
  assert.match(result.stdout, /Would format content[/\\]nested[/\\]index.mdx/)
  assert.equal(fs.readFileSync(file, 'utf8'), original)
})

test('preview routes come from schema metadata, not content folder names', (t) => {
  const { root, put, home } = fixture(t)
  const file = put('unrelated/folder/index.mdx', 'Hello.', 'public-page')
  const page = getContentPreview(file, { root, port: 3100 })
  assert.equal(page.url, 'http://127.0.0.1:3100/public-page')
  assert.equal(getContentPreview(home, { root }).url, 'http://127.0.0.1:3000/')
  for (const port of [0, -1, 65536, 3.5, 'bad', '1; echo bad'])
    assert.throws(() => getContentPreview(file, { root, port }), /port/)
  const outside = path.join(root, 'outside.mdx')
  fs.writeFileSync(outside, 'Outside')
  assert.throws(
    () => getContentPreview(outside, { root }),
    /active content tree/
  )
})

test('preview URL-only CLI does not start a server or open a browser', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/preview-content.mjs',
      'content/notes/react/live-components/index.mdx',
      '--port',
      '3100',
      '--print'
    ],
    { cwd: repository, encoding: 'utf8', timeout: 10000 }
  )
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    result.stdout.trim(),
    'http://127.0.0.1:3100/react-live-components'
  )
})

test('preview probes distinguish this site from another app and malformed pages', async (t) => {
  const homeId = 'test-home'
  let body = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    { buildId: 'development', props: { pageProps: { page: { id: homeId } } } }
  )}</script>`
  const url = await server(t, (_request, response) => response.end(body))
  const target = { url, homeId, port: Number(new URL(url).port) }
  assert.equal(await probeContentPreview(target), 'ready')
  await waitForContentPreview(target)
  body = body.replace('development', 'static-build')
  assert.equal(
    await probeContentPreview(target),
    'occupied',
    'static exports cannot provide live updates'
  )
  body = '<h1>Another application</h1>'
  assert.equal(await probeContentPreview(target), 'occupied')
  await assert.rejects(
    () => waitForContentPreview(target),
    /not serving this site's development homepage/
  )
  body = '<script id="__NEXT_DATA__">{broken}</script>'
  assert.equal(await probeContentPreview(target), 'occupied')
})
