import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  auditLinks,
  checkLink,
  collectDocuments,
  collectLinks
} from '../scripts/check-external-links.mjs'

const link = (url = 'https://example.org/article') => ({
  url,
  sources: ['content/posts/example/index.mdx']
})
const response = (status, location) =>
  new Response(null, { status, headers: location ? { location } : {} })
const noWait = async () => {}

test('collects compiled links with deduplicated source attribution, including exported UI', () => {
  const { links, skipped } = collectLinks([
    {
      source: 'content/home/index.mdx',
      html: '<a href="https://example.org/a#one">A</a><a href="https://example.org/a#two">B</a><pre>https://not-a-link.org</pre><img src="https://image.org/a.png"><a href="/local">Local</a>'
    },
    {
      source: 'out/index.html',
      html: '<footer><a href="https://example.org/a">A</a><a href="//example.net/profile">Profile</a></footer><a href="mailto:hello@example.org">Email</a><a href="https://twitter.com/intent/tweet?url=x">Share</a><a href="https://www.linkedin.com/sharing/share-offsite/?url=x">Share</a><a href="https://twitter.com/reader">Profile</a>'
    }
  ])

  assert.deepEqual(links[0], {
    url: 'https://example.org/a',
    sources: ['content/home/index.mdx', 'out/index.html']
  })
  assert.deepEqual(
    links.map((item) => item.url),
    [
      'https://example.org/a',
      'https://example.net/profile',
      'https://twitter.com/reader'
    ]
  )
  assert.equal(skipped.length, 3)
  assert.ok(skipped.every((item) => item.sources[0] === 'out/index.html'))
})

test('compiles current MDX and only includes shared export HTML on explicit opt-in', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'external-links-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.mkdir(path.join(root, 'content/home'), { recursive: true })
  await fs.mkdir(path.join(root, 'out'))
  await fs.writeFile(
    path.join(root, 'content/home/index.mdx'),
    '---\ntitle: Home\nslug: home\ndescription: Test home\ntype: home\ntags: []\norder: 0\n---\n\n[Current link](https://example.org/current)\n'
  )
  await fs.writeFile(
    path.join(root, 'out/index.html'),
    '<footer><a href="https://example.net/profile">Shared profile</a></footer>'
  )

  const sourcesOnly = await collectDocuments({ root })
  const withExport = await collectDocuments({ root, outDir: 'out' })
  const { links } = collectLinks(withExport)

  assert.equal(sourcesOnly.length, 1)
  assert.equal(withExport.length, 2)
  assert.deepEqual(
    links.map((item) => item.url),
    ['https://example.org/current', 'https://example.net/profile']
  )
  assert.deepEqual(links[1].sources, ['out/index.html'])
  await assert.rejects(collectDocuments({ root, outDir: 'missing' }), /ENOENT/)
})

test('malformed URLs and /null placeholders fail without making requests', async () => {
  const { links } = collectLinks([
    {
      source: 'example.mdx',
      html: '<a href="http://[broken">Bad</a><a href="https:/example.org">Bad</a><a href="/null">Missing</a><a href="https://example.org/null/path">Missing</a><a href="https://example.org/a%zz">Bad escape</a>'
    }
  ])

  const report = await auditLinks(links, {
    fetch: () => assert.fail('Malformed links must not make network requests')
  })

  assert.equal(report.summary.dead, 5)
  assert.equal(report.results.length, 5)
})

test('uses GET and follows relative redirects manually', async () => {
  const calls = []
  const result = await checkLink(link(), {
    fetch: async (url, options) => {
      calls.push({ url, options })
      return calls.length === 1 ? response(302, '/new-article') : response(200)
    }
  })

  assert.equal(result.outcome, 'ok')
  assert.equal(result.finalUrl, 'https://example.org/new-article')
  assert.deepEqual(
    calls.map((call) => call.options.method),
    ['GET', 'GET']
  )
  assert.ok(calls.every((call) => call.options.redirect === 'manual'))
  assert.deepEqual(result.sources, link().sources)
})

for (const status of [404, 410]) {
  test(`HTTP ${status} is a confirmed failure, including after redirects`, async () => {
    let calls = 0
    const result = await checkLink(link(), {
      fetch: async () =>
        ++calls === 1 ? response(301, '/missing') : response(status)
    })

    assert.equal(result.outcome, 'dead')
    assert.equal(result.status, status)
    assert.equal(calls, 2)
  })
}

for (const status of [401, 403, 406, 418, 429, 500, 502, 503]) {
  test(`HTTP ${status} is a warning, never a confirmed dead link`, async () => {
    let calls = 0
    const result = await checkLink(link(), {
      fetch: async () => {
        calls++
        return response(status)
      },
      sleep: noWait
    })

    assert.equal(result.outcome, 'warning')
    assert.equal(result.status, status)
    assert.equal(calls, 3)
  })
}

test('transient failures recover on retry with bounded backoff', async () => {
  let calls = 0
  const delays = []
  const result = await checkLink(link(), {
    fetch: async () => {
      if (++calls === 1) throw new Error('Private proxy information')
      return calls === 2 ? response(503) : response(200)
    },
    sleep: async (ms) => delays.push(ms)
  })

  assert.equal(result.outcome, 'ok')
  assert.equal(result.attempts, 3)
  assert.deepEqual(delays, [250, 500])
  assert.ok(!JSON.stringify(result).includes('Private proxy'))
})

test('timeouts abort the request and remain warnings', async () => {
  let signal
  const result = await checkLink(link(), {
    fetch: async (_, options) => {
      signal = options.signal
      return new Promise(() => {})
    },
    timeoutMs: 5,
    retries: 0
  })

  assert.equal(result.outcome, 'warning')
  assert.equal(signal.aborted, true)
})

test('redirect loops and unusable locations are bounded warnings', async () => {
  for (const location of [
    '/article',
    'mailto:person@example.org',
    'http://['
  ]) {
    let calls = 0
    const result = await checkLink(link(), {
      fetch: async () => {
        calls++
        return response(302, location)
      },
      maxRedirects: 2,
      retries: 0
    })
    assert.equal(result.outcome, 'warning')
    assert.ok(calls <= 3)
  }
  const result = await checkLink(link(), {
    fetch: async () => response(302),
    retries: 0
  })
  assert.equal(result.outcome, 'warning')
})

test('article-to-homepage redirects warn; original homepages and moved articles pass', async () => {
  for (const [original, destination, outcome] of [
    ['https://example.org/article', '/', 'warning'],
    ['https://example.org/article', '/en/', 'warning'],
    ['https://example.org/', 'https://www.example.org/', 'ok'],
    ['https://example.org/article', '/new-article', 'ok'],
    ['https://example.org/article', '/null', 'dead']
  ]) {
    let calls = 0
    const result = await checkLink(link(original), {
      fetch: async () =>
        ++calls === 1 ? response(302, destination) : response(200),
      retries: 0
    })
    assert.equal(result.outcome, outcome)
  }
})

test('limits concurrent requests and returns stable order and summary', async () => {
  let active = 0
  let peak = 0
  const links = Array.from({ length: 9 }, (_, index) =>
    link(`https://example.org/${index}`)
  )
  const report = await auditLinks(links, {
    concurrency: 2,
    fetch: async () => {
      peak = Math.max(peak, ++active)
      await new Promise((resolve) => setImmediate(resolve))
      active--
      return response(200)
    }
  })

  assert.equal(peak, 2)
  assert.deepEqual(
    report.results.map((item) => item.url),
    links.map((item) => item.url)
  )
  assert.deepEqual(report.summary, { ok: 9, warning: 0, dead: 0 })
  assert.deepEqual((await auditLinks([])).summary, {
    ok: 0,
    warning: 0,
    dead: 0
  })
  await assert.rejects(auditLinks(links, { concurrency: 0 }), /Concurrency/)
})

test('importing the CLI performs no network calls or output', () => {
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'globalThis.fetch = () => { throw new Error("Unexpected network") }; await import("./scripts/check-external-links.mjs")'
    ],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
  )

  assert.equal(child.status, 0, child.stderr)
  assert.equal(child.stdout, '')
  assert.equal(child.stderr, '')
})
