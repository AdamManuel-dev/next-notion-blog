import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bootstrap } from '../lib/bootstrap-client.ts'

test('the welcome banner does not clear or disable production diagnostics', () => {
  const environment = process.env.NODE_ENV
  const methods = ['log', 'error', 'info', 'warn', 'debug', 'clear']
  const original = Object.fromEntries(
    methods.map((name) => [name, console[name]])
  )
  const messages = []
  const intercepted = Object.fromEntries(
    methods.map((name) => [name, (...args) => messages.push({ name, args })])
  )
  try {
    process.env.NODE_ENV = 'production'
    Object.assign(console, intercepted)
    bootstrap()
    for (const name of methods)
      assert.equal(console[name], intercepted[name], `${name} remains usable`)
    assert.equal(messages.length, 1)
    assert.equal(messages[0].name, 'log')
    assert.match(messages[0].args[0], /My Contact Info/)
  } finally {
    Object.assign(console, original)
    if (environment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = environment
  }
})
