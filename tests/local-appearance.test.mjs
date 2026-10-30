import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { getLocalPage, getLocalPages } from '../lib/local-content.ts'

const appearance = JSON.parse(
  fs.readFileSync('content/appearance.json', 'utf8')
)

test('original homepage and article artwork is restored from local appearance metadata', () => {
  const home = getLocalPage()
  assert.equal(home.icon, '⚡')
  assert.equal(home.coverPosition, 0.5)
  assert.equal(
    home.cover,
    '/content-assets/original-cover-a044322d56d1482da8b521736d56284c.jpg'
  )
  const article = getLocalPage('my-favorite-express-architecture')
  assert.equal(article.icon, '💽')
  assert.equal(
    article.cover,
    '/content-assets/original-cover-23910a0af920815e9d20f04397d7b13c.jpg'
  )
})

test('all seven original hero images resolve through the static page loader', () => {
  for (const slug of [
    'adam-manuel-s-dev-blog',
    'my-favorite-express-architecture',
    'guide-to-building-autonomous-ai-agents',
    'refining-testing-strategies-and-pr-workflows-for-scalable-development',
    'speed-up-your-job-hunt-with-this-linkedin-scraper-and-your-system-notifications',
    'mongodb-official-documentation',
    'my-favorite-express-architecture-setup-guide'
  ]) {
    assert.match(getLocalPage(slug).cover, /^\/content-assets\/original-cover-/)
  }
})

test('recovered covers are real local JPEGs, not remote runtime image dependencies', () => {
  const ids = new Set(getLocalPages().map((page) => page.id))
  for (const [id, item] of Object.entries(appearance.pages)) {
    assert.ok(ids.has(id), `${id} belongs to a migrated page`)
    if (!item.cover) continue
    assert.match(item.cover, /^\/content-assets\/[a-z0-9-]+\.jpg$/)
    const bytes = fs.readFileSync(path.join('public', item.cover))
    assert.deepEqual([...bytes.subarray(0, 3)], [0xff, 0xd8, 0xff])
    assert.ok(bytes.length > 1000)
    assert.ok(item.coverPosition >= 0 && item.coverPosition <= 1)
  }
})

test('appearance restoration leaves archived article HTML and existing covers intact', () => {
  for (const summary of getLocalPages()) {
    const page = getLocalPage(summary.slug)
    assert.equal(
      page.html,
      fs.readFileSync(`content/pages/${summary.slug}.html`, 'utf8')
    )
    const original = JSON.parse(
      fs.readFileSync(`content/pages/${summary.slug}.json`, 'utf8')
    )
    if (original.cover) assert.equal(page.cover, original.cover)
  }
})
