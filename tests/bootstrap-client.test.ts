import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bootstrap } from '../lib/bootstrap-client.ts'

test('the welcome banner does not clear or disable production diagnostics', () => {
  const env: Record<string, string | undefined> = process.env
  const environment = env.NODE_ENV
  const methods = ['log', 'error', 'info', 'warn', 'debug', 'clear'] as const
  const original = Object.fromEntries(
    methods.map((name) => [name, console[name]])
  )
  const messages: { name: string; args: unknown[] }[] = []
  const intercepted = Object.fromEntries(
    methods.map((name) => [
      name,
      (...args: unknown[]) => messages.push({ name, args })
    ])
  )
  try {
    env.NODE_ENV = 'production'
    Object.assign(console, intercepted)
    bootstrap()
    for (const name of methods)
      assert.equal(console[name], intercepted[name], `${name} remains usable`)
    assert.equal(messages.length, 1)
    assert.equal(messages[0].name, 'log')
    assert.match(String(messages[0].args[0]), /My Contact Info/)
  } finally {
    Object.assign(console, original)
    if (environment === undefined) delete env.NODE_ENV
    else env.NODE_ENV = environment
  }
})
