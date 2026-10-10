import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoizeAsync } from '../lib/memoize-async.ts'

test('concurrent requests share one fetch, including after an event-loop turn', async () => {
  let calls = 0
  let finish
  const fetch = memoizeAsync(async () => {
    calls++
    return new Promise((resolve) => {
      finish = resolve
    })
  }, 60000)
  const first = fetch()
  await new Promise((resolve) => setImmediate(resolve))
  const second = fetch()
  assert.equal(first, second)
  finish('page')
  assert.equal(await first, 'page')
  assert.equal(await fetch(), 'page')
  assert.equal(calls, 1)
})

test('failed requests can be retried', async () => {
  let calls = 0
  const fetch = memoizeAsync(async () => {
    if (++calls === 1) throw new Error('Notion unavailable')
    return 'page'
  }, 60000)
  await assert.rejects(fetch(), /Notion unavailable/)
  assert.equal(await fetch(), 'page')
  assert.equal(calls, 2)
})

test('expired results refresh and distinct arguments do not collide', async () => {
  let calls = 0
  const fetch = memoizeAsync(
    async (page, options) => ({ page, options, call: ++calls }),
    0
  )
  assert.equal((await fetch('a', 'one')).call, 1)
  assert.equal((await fetch('a', 'one')).call, 2)
  const cached = memoizeAsync(
    async (page, options) => `${page}:${options}`,
    60000
  )
  assert.equal(await cached('a', 'one'), 'a:one')
  assert.equal(await cached('a', 'two'), 'a:two')
})
