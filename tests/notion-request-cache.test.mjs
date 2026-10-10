import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NotionRequestCache,
  isTemporaryNotionError
} from '../lib/notion-request-cache.ts'

const rateLimit = () =>
  Object.assign(new Error('rate limited'), {
    response: { status: 429, headers: new Headers({ 'retry-after': '90' }) }
  })

test('serves stale content after 429 and honors a shared Retry-After cooldown', async () => {
  let now = 0
  let calls = 0
  const cache = new NotionRequestCache(
    () => now,
    async () => {},
    0,
    10,
    200000
  )
  await cache.get('article', async () => 'saved article')
  now = 11
  assert.equal(
    await cache.get('article', () =>
      cache.request(async () => {
        calls++
        throw rateLimit()
      })
    ),
    'saved article'
  )
  await assert.rejects(
    cache.get('uncached', () =>
      cache.request(async () => {
        calls++
        return 'should not fetch'
      })
    ),
    /rate limiting/
  )
  assert.equal(calls, 1)
  now += 90001
  assert.equal(
    await cache.get('uncached', () => cache.request(async () => 'recovered')),
    'recovered'
  )
})

test('shares in-flight page loads', async () => {
  const cache = new NotionRequestCache()
  let finish
  let calls = 0
  const load = async () => {
    calls++
    return new Promise((resolve) => {
      finish = resolve
    })
  }
  const first = cache.get('page', load)
  await new Promise((resolve) => setImmediate(resolve))
  const second = cache.get('page', load)
  assert.equal(first, second)
  finish('page')
  assert.equal(await second, 'page')
  assert.equal(calls, 1)
})

test('serializes and spaces upstream requests', async () => {
  let now = 0
  const starts = []
  const cache = new NotionRequestCache(
    () => now,
    async (ms) => {
      now += ms
    },
    750
  )
  await Promise.all(
    [1, 2, 3].map(() =>
      cache.request(async () => {
        starts.push(now)
      })
    )
  )
  assert.deepEqual(starts, [0, 750, 1500])
})

test('does not serve stale content for revoked access or beyond its lifetime', async () => {
  let now = 0
  const cache = new NotionRequestCache(
    () => now,
    async () => {},
    0,
    10,
    20
  )
  await cache.get('revoked', async () => 'private content')
  await cache.get('expired', async () => 'old content')
  now = 11
  await assert.rejects(
    cache.get('revoked', async () => {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }),
    /Forbidden/
  )
  await assert.rejects(
    cache.get('revoked', async () => {
      throw rateLimit()
    }),
    /rate limited/
  )
  now = 21
  await assert.rejects(
    cache.get('expired', async () => {
      throw rateLimit()
    }),
    /rate limited/
  )
  assert.equal(
    isTemporaryNotionError(new TypeError('programming error')),
    false
  )
})
